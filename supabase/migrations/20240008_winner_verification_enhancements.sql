-- Migration: Winner verification enhancements
-- 1. Add internal_audit_reason to winner_verifications
ALTER TABLE public.winner_verifications
  ADD COLUMN IF NOT EXISTS internal_audit_reason text;

-- 2. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_winner_verifications_winner_id
  ON public.winner_verifications (winner_id);

CREATE INDEX IF NOT EXISTS idx_payouts_winner_id
  ON public.payouts (winner_id);

CREATE INDEX IF NOT EXISTS idx_draw_winners_user_status
  ON public.draw_winners (user_id, status);
