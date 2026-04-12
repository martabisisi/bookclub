-- Voti con mezze stelle (1, 1.5, …, 5)
ALTER TABLE public.ratings
  DROP CONSTRAINT IF EXISTS ratings_stars_check;

ALTER TABLE public.ratings
  ALTER COLUMN stars TYPE numeric(3, 1)
  USING round(stars::numeric, 0);

ALTER TABLE public.ratings
  ADD CONSTRAINT ratings_stars_half_steps CHECK (
    stars >= 1
    AND stars <= 5
    AND (stars * 2) = round(stars * 2)
  );
