-- Data incontro per discussione del libro (home, scheda, form admin)
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS meeting_date date;
