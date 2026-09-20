-- Safe additive migration — no drops, no resets, no data loss
-- Adds Stripe-specific columns needed for Checkout and Customer Portal

ALTER TABLE public.membership_plans
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id   text;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider_checkout_session_id text;

-- Seed membership plans (₹599/mo = 59900 paise, ₹5999/yr = 599900 paise)
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

-- Seed app_settings defaults (DO NOTHING = never overwrite admin changes)
INSERT INTO public.app_settings (key, value) VALUES
  ('cashPrizeDrawEnabled', 'false'::jsonb),
  ('defaultCharityPct',    '10'::jsonb),
  ('allowedCharityPcts',   '[10,15,20,25,30,40]'::jsonb),
  ('rewardPoolPct',        '25'::jsonb),
  ('platformPct',          '65'::jsonb),
  ('jurisdictionCode',     '"IN"'::jsonb)
ON CONFLICT (key) DO NOTHING;
