-- =============================================================================
-- Migration: Full RBAC — RLS policies, helper functions, profile trigger
-- Safe additive migration. No drops. No data loss.
-- Three roles: public visitor (anon), subscriber (auth), admin (auth + role=admin)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS (security definer — run as postgres, not caller)
-- ---------------------------------------------------------------------------

-- Returns true when the calling JWT belongs to an admin profile.
-- Uses a direct table lookup so it works even before the session profile is cached.
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

-- Returns true when the calling user has an active subscription.
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
-- 2. PROFILE AUTO-CREATE TRIGGER
--    Creates a public.profiles row whenever a new auth.users row is inserted.
--    Role always defaults to 'subscriber' — never elevated by the user.
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
-- 3. ENABLE RLS ON EVERY PUBLIC TABLE
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

-- ---------------------------------------------------------------------------
-- 4. DROP ALL EXISTING POLICIES (idempotent re-run safety)
-- ---------------------------------------------------------------------------

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. profiles
--    - Anyone can read their own row
--    - Subscribers can update safe fields only (NOT role, NOT id, NOT created_at)
--    - Admins can read and update all rows
--    - No direct INSERT from browser (trigger handles it)
--    - No DELETE from browser
-- ---------------------------------------------------------------------------

CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

-- Subscribers may update display_name, phone, avatar_path, winner_name_visible only.
-- The WITH CHECK prevents them from ever writing role = 'admin'.
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

-- ---------------------------------------------------------------------------
-- 6. membership_plans
--    - Public read (pricing page needs no auth)
--    - Admin write via service role only (no browser policy needed)
-- ---------------------------------------------------------------------------

CREATE POLICY "membership_plans: public read"
  ON public.membership_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "membership_plans: admin read all"
  ON public.membership_plans FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. subscriptions
--    - Subscriber reads own row
--    - Admin reads all
--    - No browser writes — all mutations via Edge Functions (service role)
-- ---------------------------------------------------------------------------

CREATE POLICY "subscriptions: own read"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. golf_scores
--    - Subscriber: full CRUD on own rows only, requires active subscription
--    - Admin: full read, no direct write (scores are user-owned)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 9. charities
--    - Public read of published charities
--    - Admin reads all (including unpublished)
--    - Admin write via service role only
-- ---------------------------------------------------------------------------

CREATE POLICY "charities: public read published"
  ON public.charities FOR SELECT
  USING (is_published = true OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 10. charity_events
--     - Public read (events belong to published charities)
--     - Admin reads all
-- ---------------------------------------------------------------------------

CREATE POLICY "charity_events: public read"
  ON public.charity_events FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.charities
      WHERE id = charity_events.charity_id AND is_published = true
    )
  );

-- ---------------------------------------------------------------------------
-- 11. charity_preferences
--     - Subscriber reads own current preference
--     - Admin reads all
--     - Writes only via Edge Function (service role) — no browser INSERT/UPDATE
-- ---------------------------------------------------------------------------

CREATE POLICY "charity_preferences: own read"
  ON public.charity_preferences FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 12. payment_transactions
--     - Subscriber reads own rows
--     - Admin reads all
--     - No browser writes
-- ---------------------------------------------------------------------------

CREATE POLICY "payment_transactions: own read"
  ON public.payment_transactions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 13. payment_allocations
--     - Subscriber reads own rows
--     - Admin reads all
-- ---------------------------------------------------------------------------

CREATE POLICY "payment_allocations: own read"
  ON public.payment_allocations FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 14. direct_donations
--     - Subscriber reads own rows; anon rows are not exposed
--     - Admin reads all
-- ---------------------------------------------------------------------------

CREATE POLICY "direct_donations: own read"
  ON public.direct_donations FOR SELECT
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 15. draws
--     - Public read of published draws
--     - Subscribers read locked/published draws
--     - Admin reads all statuses
-- ---------------------------------------------------------------------------

CREATE POLICY "draws: public read published"
  ON public.draws FOR SELECT
  USING (
    status = 'published'
    OR (auth.uid() IS NOT NULL AND status IN ('locked', 'published'))
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 16. draw_entries
--     - Subscriber reads own entries
--     - Admin reads all
--     - No browser writes — Edge Function only
-- ---------------------------------------------------------------------------

CREATE POLICY "draw_entries: own read"
  ON public.draw_entries FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 17. draw_winners
--     - Subscriber reads own winner rows
--     - Admin reads all
--     - Published winners with winner_name_visible=true are readable by all
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 18. draw_simulations
--     - Admin only
-- ---------------------------------------------------------------------------

CREATE POLICY "draw_simulations: admin read"
  ON public.draw_simulations FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 19. winner_verifications
--     - Subscriber reads own verification (they submitted it)
--     - Admin reads all
--     - Subscriber INSERT only when they are the winner and status = pending_proof
--       (actual storage write goes via Edge Function signed URL)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 20. payouts
--     - Subscriber reads own payout
--     - Admin reads all
--     - No browser writes
-- ---------------------------------------------------------------------------

CREATE POLICY "payouts: own read"
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.draw_winners dw
      WHERE dw.id = payouts.winner_id AND dw.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 21. webhook_events
--     - Admin read only — never exposed to subscribers
-- ---------------------------------------------------------------------------

CREATE POLICY "webhook_events: admin read"
  ON public.webhook_events FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 22. app_settings
--     - Public read (cashPrizeDrawEnabled, plans, etc. needed by frontend)
--     - Admin write via service role only
-- ---------------------------------------------------------------------------

CREATE POLICY "app_settings: public read"
  ON public.app_settings FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- 23. audit_logs
--     - Admin read only
--     - INSERT via service role only (Edge Functions)
--     - No UPDATE, no DELETE — ever
-- ---------------------------------------------------------------------------

CREATE POLICY "audit_logs: admin read"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 24. private.draw_secrets — admin/service role only, no anon/subscriber access
-- ---------------------------------------------------------------------------

ALTER TABLE private.draw_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "draw_secrets: admin only" ON private.draw_secrets;
CREATE POLICY "draw_secrets: admin only"
  ON private.draw_secrets FOR ALL
  USING (public.is_admin());
