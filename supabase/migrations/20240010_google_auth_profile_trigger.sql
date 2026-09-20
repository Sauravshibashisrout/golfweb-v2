-- =============================================================================
-- Migration: Google OAuth Profile Trigger Enhancement
-- Extracts full_name and avatar_url from Google OAuth user metadata
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_path, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    ),
    'subscriber'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(
      profiles.display_name,
      EXCLUDED.display_name
    ),
    avatar_path = COALESCE(
      profiles.avatar_path,
      EXCLUDED.avatar_path
    ),
    updated_at = now();

  RETURN NEW;
END;
$$;
