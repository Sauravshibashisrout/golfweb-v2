-- =============================================================================
-- Migration: Draw engine hardening
-- Additive only — no drops, no data loss.
-- =============================================================================

-- 1. legal_approval_ref: must be set before cash_prize_enabled can be true.
--    Enforced in Edge Functions; column provides the audit trail.
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS legal_approval_ref text;

-- 2. algo_formula_hash: SHA-256 of the published algorithmic formula.
--    Set before entries lock so participants can verify the formula post-draw.
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS algo_formula_hash text;

-- 3. Constraint: cash_prize_enabled requires a legal_approval_ref.
--    Prevents accidental cash-prize activation without a recorded approval.
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

-- 4. drawn_numbers stays NULL until draw-publish writes it.
--    Simulation stores the seed + hash in private.draw_secrets only.
--    No schema change needed — the Edge Functions enforce this contract.

-- 5. Refresh the draws RLS policy to be explicit:
--    subscribers see locked draws but drawn_numbers will always be NULL
--    at that point (enforced by Edge Function contract above).
--    No policy change needed — the data contract is sufficient.
