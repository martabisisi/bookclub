-- Il lettore può eliminare il proprio voto (profilo)
CREATE POLICY "ratings_delete_own"
  ON public.ratings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
