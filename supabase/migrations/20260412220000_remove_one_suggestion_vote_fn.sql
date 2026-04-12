-- Rimuove un solo voto (ultimo per data). SECURITY DEFINER → funziona anche senza policy DELETE su suggestion_votes.
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

NOTIFY pgrst, 'reload schema';
