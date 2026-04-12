-- Ogni utente può aggiornare il proprio voto e commento
DROP POLICY IF EXISTS "ratings_update_own" ON public.ratings;

CREATE POLICY "ratings_update_own"
  ON public.ratings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
