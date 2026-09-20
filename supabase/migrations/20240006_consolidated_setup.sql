-- =============================================================================
-- Migration: Consolidated Setup for GolfGives
-- Idempotent, safe additive migration applying all schema, triggers, RLS, and buckets.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema Extensions & Provider Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.membership_plans
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id   text,
  ADD COLUMN IF NOT EXISTS razorpay_plan_id  text;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider_checkout_session_id text;

ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS legal_approval_ref text,
  ADD COLUMN IF NOT EXISTS algo_formula_hash text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'draws_cash_prize_requires_approval'
      AND conrelid = 'public.draws'::regclass
  ) THEN
    ALTER TABLE public.draws
      ADD CONSTRAINT draws_cash_prize_requires_approval
      CHECK (
        cash_prize_enabled = false
        OR legal_approval_ref IS NOT NULL
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Seed Membership Plans & App Settings
-- ---------------------------------------------------------------------------
INSERT INTO public.membership_plans (id, name, amount_paise, currency, interval_months, is_active)
VALUES
  ('monthly', 'Monthly Membership',  59900,  'inr', 1,  true),
  ('annual',  'Annual Membership',  599900,  'inr', 12, true)
ON CONFLICT (id) DO UPDATE SET
  name            = EXCLUDED.name,
  amount_paise    = EXCLUDED.amount_paise,
  currency        = EXCLUDED.currency,
  interval_months = EXCLUDED.interval_months,
  is_active       = EXCLUDED.is_active;

INSERT INTO public.app_settings (key, value) VALUES
  ('cashPrizeDrawEnabled', 'false'::jsonb),
  ('defaultCharityPct',    '10'::jsonb),
  ('allowedCharityPcts',   '[10,15,20,25,30,40]'::jsonb),
  ('rewardPoolPct',        '25'::jsonb),
  ('platformPct',          '65'::jsonb),
  ('jurisdictionCode',     '"IN"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Storage Buckets & Policies
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('charity-media', 'charity-media', true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('winner-proofs', 'winner-proofs', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- charity-media policies
DROP POLICY IF EXISTS "Public read charity-media" ON storage.objects;
CREATE POLICY "Public read charity-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'charity-media');

DROP POLICY IF EXISTS "Admin insert charity-media" ON storage.objects;
CREATE POLICY "Admin insert charity-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'charity-media'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin delete charity-media" ON storage.objects;
CREATE POLICY "Admin delete charity-media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'charity-media'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ---------------------------------------------------------------------------
-- 4. Helper Functions (security definer)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. User Creation & Triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'subscriber'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6. Published Draws Immutability Trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_draw_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'published' THEN
    RAISE EXCEPTION 'Published draws are immutable and cannot be updated.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_draws_immutability ON public.draws;
CREATE TRIGGER trg_draws_immutability
  BEFORE UPDATE ON public.draws
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_draw_immutability();

-- ---------------------------------------------------------------------------
-- 7. Golf Scores: 1-45 Range Constraint & 5-Score Cap Trigger
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'golf_scores_stableford_range'
      AND conrelid = 'public.golf_scores'::regclass
  ) THEN
    ALTER TABLE public.golf_scores
      ADD CONSTRAINT golf_scores_stableford_range
      CHECK (stableford_score BETWEEN 1 AND 45);
  END IF;
END $$;

-- Drop old trigger if present
DROP TRIGGER IF EXISTS retain_only_latest_five_scores ON public.golf_scores;

CREATE OR REPLACE FUNCTION public.enforce_score_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count   int;
  v_oldest  uuid;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.golf_scores
  WHERE user_id = NEW.user_id;

  IF v_count <= 5 THEN
    RETURN NEW;
  END IF;

  SELECT gs.id INTO v_oldest
  FROM public.golf_scores gs
  WHERE gs.user_id = NEW.user_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.draw_entries de
      WHERE de.user_id = NEW.user_id
        AND gs.played_on::text = ANY(de.score_date_snapshot)
    )
  ORDER BY gs.played_on ASC, gs.created_at ASC
  LIMIT 1;

  IF v_oldest IS NOT NULL THEN
    DELETE FROM public.golf_scores WHERE id = v_oldest;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_score_cap ON public.golf_scores;
CREATE TRIGGER trg_enforce_score_cap
  AFTER INSERT ON public.golf_scores
  FOR EACH ROW EXECUTE FUNCTION public.enforce_score_cap();

-- ---------------------------------------------------------------------------
-- 8. Row Level Security & Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_scores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charity_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charity_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_donations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_winners         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_simulations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.draw_secrets        ENABLE ROW LEVEL SECURITY;

-- Drop existing public/private policies safely before recreating
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname IN ('public', 'private')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- profiles
CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles: own update safe fields"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() AND NOT public.is_admin())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles: admin update"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- membership_plans
CREATE POLICY "membership_plans: public read"
  ON public.membership_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "membership_plans: admin read all"
  ON public.membership_plans FOR SELECT
  USING (public.is_admin());

-- subscriptions
CREATE POLICY "subscriptions: own read"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- golf_scores
CREATE POLICY "golf_scores: own read"
  ON public.golf_scores FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "golf_scores: own insert"
  ON public.golf_scores FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_active_subscription()
  );

CREATE POLICY "golf_scores: own update"
  ON public.golf_scores FOR UPDATE
  USING (user_id = auth.uid() AND public.has_active_subscription())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "golf_scores: own delete"
  ON public.golf_scores FOR DELETE
  USING (user_id = auth.uid() AND public.has_active_subscription());

-- charities
CREATE POLICY "charities: public read published"
  ON public.charities FOR SELECT
  USING (is_published = true OR public.is_admin());

-- charity_events
CREATE POLICY "charity_events: public read"
  ON public.charity_events FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.charities
      WHERE id = charity_events.charity_id AND is_published = true
    )
  );

-- charity_preferences
CREATE POLICY "charity_preferences: own read"
  ON public.charity_preferences FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- payment_transactions
CREATE POLICY "payment_transactions: own read"
  ON public.payment_transactions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- payment_allocations
CREATE POLICY "payment_allocations: own read"
  ON public.payment_allocations FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- direct_donations
CREATE POLICY "direct_donations: own read"
  ON public.direct_donations FOR SELECT
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR public.is_admin()
  );

-- draws
CREATE POLICY "draws: public read published"
  ON public.draws FOR SELECT
  USING (
    status = 'published'
    OR (auth.uid() IS NOT NULL AND status IN ('locked', 'published'))
    OR public.is_admin()
  );

-- draw_entries
CREATE POLICY "draw_entries: own read"
  ON public.draw_entries FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- draw_winners
CREATE POLICY "draw_winners: own read"
  ON public.draw_winners FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.draws d
        WHERE d.id = draw_winners.draw_id AND d.status = 'published'
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = draw_winners.user_id AND p.winner_name_visible = true
      )
    )
  );

-- draw_simulations
CREATE POLICY "draw_simulations: admin read"
  ON public.draw_simulations FOR SELECT
  USING (public.is_admin());

-- winner_verifications
CREATE POLICY "winner_verifications: own read"
  ON public.winner_verifications FOR SELECT
  USING (submitted_by = auth.uid() OR public.is_admin());

CREATE POLICY "winner_verifications: winner insert"
  ON public.winner_verifications FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.draw_winners dw
      WHERE dw.id = winner_verifications.winner_id
        AND dw.user_id = auth.uid()
        AND dw.status = 'pending_proof'
    )
  );

-- payouts
CREATE POLICY "payouts: own read"
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.draw_winners dw
      WHERE dw.id = payouts.winner_id AND dw.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- webhook_events
CREATE POLICY "webhook_events: admin read"
  ON public.webhook_events FOR SELECT
  USING (public.is_admin());

-- app_settings
CREATE POLICY "app_settings: public read"
  ON public.app_settings FOR SELECT
  USING (true);

-- audit_logs
CREATE POLICY "audit_logs: admin read"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- private.draw_secrets
CREATE POLICY "draw_secrets: admin only"
  ON private.draw_secrets FOR ALL
  USING (public.is_admin());
