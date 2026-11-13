ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_wallpaper text NOT NULL DEFAULT 'normal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_profile_wallpaper_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_profile_wallpaper_check
      CHECK (profile_wallpaper IN ('normal', 'blossom', 'clouds', 'starlight', 'hearts'));
  END IF;
END $$;

GRANT UPDATE (profile_wallpaper) ON public.profiles TO authenticated;
