-- Consenti a ogni utente di rimuovere i propri voti (per togliere un "mi piace")
DROP POLICY IF EXISTS "votes_delete_own" ON public.suggestion_votes;

CREATE POLICY "votes_delete_own"
  ON public.suggestion_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
