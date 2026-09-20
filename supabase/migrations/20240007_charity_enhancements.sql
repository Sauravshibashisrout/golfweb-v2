-- =============================================================================
-- Migration: Charity Enhancements (Archival, Events & Discovery)
-- Additive and idempotent.
-- =============================================================================

-- 1. Add is_archived to charities to allow soft-archival without breaking financial history
ALTER TABLE public.charities
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- 2. Index on is_archived, is_published for efficient directory queries
CREATE INDEX IF NOT EXISTS idx_charities_published_archived
  ON public.charities (is_published, is_archived);

-- 3. Update public read policy on charities so only unarchived, published charities are visible publicly
--    (Admins can still see all charities including archived ones via admin read policy)
DROP POLICY IF EXISTS "charities: public read" ON public.charities;
CREATE POLICY "charities: public read"
  ON public.charities FOR SELECT
  USING (
    (is_published = true AND is_archived = false)
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 4. Ensure admin write policy on charities covers all operations
DROP POLICY IF EXISTS "charities: admin write" ON public.charities;
CREATE POLICY "charities: admin write"
  ON public.charities FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 5. Ensure admin write policy on charity_events covers all operations
DROP POLICY IF EXISTS "charity_events: admin write" ON public.charity_events;
CREATE POLICY "charity_events: admin write"
  ON public.charity_events FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 6. Public read policy on charity_events for published, unarchived charities
DROP POLICY IF EXISTS "charity_events: public read" ON public.charity_events;
CREATE POLICY "charity_events: public read"
  ON public.charity_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.charities c
      WHERE c.id = charity_events.charity_id
        AND c.is_published = true
        AND c.is_archived = false
    )
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
