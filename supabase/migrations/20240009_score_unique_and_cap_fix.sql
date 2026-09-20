-- =============================================================================
-- Migration: 20240009_score_unique_and_cap_fix.sql
-- 1. Unique constraint: Only one score per user per date.
-- 2. Score cap trigger: Automatically retain strictly the latest 5 scores.
-- Additive & safe — no table drops or data loss.
-- =============================================================================

-- 1. Unique index on (user_id, played_on)
CREATE UNIQUE INDEX IF NOT EXISTS idx_golf_scores_user_played_on
  ON public.golf_scores (user_id, played_on);

-- 2. Enhanced score cap trigger
-- Keeps strictly the latest 5 scores by (played_on DESC, created_at DESC)
-- Historical draw snapshots stored in draw_entries are immutable arrays
-- and remain completely untouched.
CREATE OR REPLACE FUNCTION public.enforce_score_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.golf_scores
  WHERE user_id = NEW.user_id;

  IF v_count > 5 THEN
    DELETE FROM public.golf_scores
    WHERE user_id = NEW.user_id
      AND id NOT IN (
        SELECT id FROM public.golf_scores
        WHERE user_id = NEW.user_id
        ORDER BY played_on DESC, created_at DESC
        LIMIT 5
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_score_cap ON public.golf_scores;
CREATE TRIGGER trg_enforce_score_cap
  AFTER INSERT ON public.golf_scores
  FOR EACH ROW EXECUTE FUNCTION public.enforce_score_cap();
