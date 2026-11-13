ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_skin text NOT NULL DEFAULT 'cat';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_profile_skin_check
  CHECK (profile_skin IN ('cat', 'bird', 'vampire', 'fairy', 'galaxy'));

GRANT UPDATE (profile_skin) ON public.profiles TO authenticated;
