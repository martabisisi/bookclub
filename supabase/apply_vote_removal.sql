-- Esegui questo intero script in Supabase → SQL Editor → Run (una volta).
-- Serve perché "togli like" usa una funzione che bypassa RLS in modo sicuro (solo i propri voti).

CREATE OR REPLACE FUNCTION public.remove_one_suggestion_vote(p_suggestion_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT sv.id INTO v_id
  FROM public.suggestion_votes sv
  WHERE sv.suggestion_id = p_suggestion_id
    AND sv.user_id = auth.uid()
  ORDER BY sv.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM public.suggestion_votes WHERE id = v_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_one_suggestion_vote(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_one_suggestion_vote(uuid) TO authenticated;

-- Opzionale: consente anche delete diretto dal client (se preferisci solo policy senza funzione)
DROP POLICY IF EXISTS "votes_delete_own" ON public.suggestion_votes;
CREATE POLICY "votes_delete_own"
  ON public.suggestion_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Aiuta PostgREST a vedere subito la nuova funzione (Supabase)
NOTIFY pgrst, 'reload schema';
