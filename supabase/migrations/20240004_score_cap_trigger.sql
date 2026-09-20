-- =============================================================================
-- Migration: Golf score constraints and 5-score cap trigger
-- Additive only — no drops, no data loss.
-- draw_entries.score_snapshot arrays are never touched by this trigger.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Stableford score range constraint (1–45)
--    IF NOT EXISTS guard makes this safe to re-run.
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

-- ---------------------------------------------------------------------------
-- 2. Five-score cap trigger
--    Fires AFTER INSERT on golf_scores.
--    Deletes the oldest score for the user when they exceed 5 total.
--    Safety: never deletes a score whose id appears in any draw_entry
--    score_snapshot — those are locked historical records.
--    If all 5 existing scores are locked in draw entries, the insert is
--    allowed to exceed 5 rather than silently destroying draw history.
-- ---------------------------------------------------------------------------
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
  -- Count scores for this user after the insert
  SELECT COUNT(*) INTO v_count
  FROM public.golf_scores
  WHERE user_id = NEW.user_id;

  IF v_count <= 5 THEN
    RETURN NEW;
  END IF;

  -- Find the oldest score that is NOT locked in any draw entry snapshot.
  -- draw_entries.score_snapshot stores stableford values (integers), not IDs,
  -- so we guard by played_on date: a score is "locked" if its played_on date
  -- appears in any draw_entries.score_date_snapshot for this user.
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
  -- If no unlocked oldest found, we leave all scores intact (draw history wins).

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_score_cap ON public.golf_scores;
CREATE TRIGGER trg_enforce_score_cap
  AFTER INSERT ON public.golf_scores
  FOR EACH ROW EXECUTE FUNCTION public.enforce_score_cap();
