-- Expand supported profile theme palettes to all nine UI choices.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_theme_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_theme_check
  CHECK (theme IN ('rose','lavender','mint','sky','peach','berry','midnight','sage','buttercup'));
