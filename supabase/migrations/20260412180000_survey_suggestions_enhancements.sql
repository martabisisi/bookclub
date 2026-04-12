-- Copertine proposte, voti multipli per utente/proposta, modifica/cancellazione proposte proprie

ALTER TABLE public.book_suggestions
  ADD COLUMN IF NOT EXISTS cover_url text;

-- Consenti più righe di voto per (suggestion_id, user_id)
ALTER TABLE public.suggestion_votes
  DROP CONSTRAINT IF EXISTS suggestion_votes_suggestion_id_user_id_key;

CREATE POLICY "suggestions_update_own"
  ON public.book_suggestions FOR UPDATE
  TO authenticated
  USING (suggested_by = auth.uid())
  WITH CHECK (suggested_by = auth.uid());

CREATE POLICY "suggestions_delete_own"
  ON public.book_suggestions FOR DELETE
  TO authenticated
  USING (suggested_by = auth.uid());

-- Copertine proposte: cartella covers/suggestions/{auth.uid()}/...
CREATE POLICY "Covers suggestion upload own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = 'suggestions'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Covers suggestion update own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = 'suggestions'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Covers suggestion delete own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = 'suggestions'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
