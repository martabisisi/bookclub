-- Book Club: schema, RLS, storage, invite helpers
-- Run in Supabase SQL Editor or via CLI: supabase db push

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  avatar_url text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  cover_url text,
  total_pages integer NOT NULL CHECK (total_pages > 0),
  is_current_book boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users (id)
);

CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, user_id)
);

CREATE TABLE public.reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  current_page integer NOT NULL DEFAULT 0 CHECK (current_page >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, user_id)
);

CREATE TABLE public.book_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  reason text NOT NULL DEFAULT '',
  suggested_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.suggestion_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.book_suggestions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, user_id)
);

-- Invite links (admin-generated); magic link still goes through Supabase Auth
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  email text,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invites_email_optional CHECK (email IS NULL OR length(trim(email)) > 0)
);

-- Only one current book at a time
CREATE UNIQUE INDEX books_one_current ON public.books (is_current_book) WHERE is_current_book = true;

CREATE INDEX idx_books_created_at ON public.books (created_at DESC);
CREATE INDEX idx_ratings_book ON public.ratings (book_id);
CREATE INDEX idx_progress_book_user ON public.reading_progress (book_id, user_id);
CREATE INDEX idx_suggestions_created ON public.book_suggestions (created_at DESC);

-- Una proposta per utente (per “round” basta svuotare la tabella o rimuovere questo indice)
CREATE UNIQUE INDEX book_suggestions_one_per_user ON public.book_suggestions (suggested_by);

-- ---------------------------------------------------------------------------
-- FUNCTIONS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.user_id = uid),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  n int := 0;
  local_part text;
BEGIN
  local_part := split_part(NEW.email, '@', 1);
  base_slug := lower(regexp_replace(local_part, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'lettore';
  END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = final_slug) LOOP
    n := n + 1;
    final_slug := base_slug || '-' || n::text;
  END LOOP;

  INSERT INTO public.profiles (user_id, nome, slug, avatar_url, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(local_part), ''), 'Lettore'),
    final_slug,
    NULL,
    false
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.validate_invite(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.invites%ROWTYPE;
BEGIN
  SELECT * INTO r
  FROM public.invites
  WHERE token = p_token AND used_at IS NULL AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'email', r.email,
    'invite_id', r.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_invite(p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.invites
  SET used_at = now()
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_invite(p_email text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  INSERT INTO public.invites (email, created_by)
  VALUES (NULLIF(trim(p_email), ''), auth.uid())
  RETURNING token INTO new_token;

  RETURN new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invite(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_invite(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- books
CREATE POLICY "books_select_authenticated"
  ON public.books FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "books_insert_admin"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "books_update_admin"
  ON public.books FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "books_delete_admin"
  ON public.books FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ratings
CREATE POLICY "ratings_select_all"
  ON public.ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ratings_insert_own"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ratings_update_own"
  ON public.ratings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- reading_progress
CREATE POLICY "progress_select_all"
  ON public.reading_progress FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "progress_insert_own"
  ON public.reading_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "progress_update_own"
  ON public.reading_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- book_suggestions
CREATE POLICY "suggestions_select_all"
  ON public.book_suggestions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "suggestions_insert_authenticated"
  ON public.book_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (suggested_by = auth.uid());

-- suggestion_votes
CREATE POLICY "votes_select_all"
  ON public.suggestion_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "votes_insert_own"
  ON public.suggestion_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- invites: admin manages; no direct anon select (use RPC)
CREATE POLICY "invites_select_admin"
  ON public.invites FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "invites_insert_admin"
  ON public.invites FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- STORAGE: bucket covers
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Covers public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'covers');

CREATE POLICY "Covers admin upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND public.is_admin(auth.uid())
  );

CREATE POLICY "Covers admin update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'covers' AND public.is_admin(auth.uid()));

CREATE POLICY "Covers admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'covers' AND public.is_admin(auth.uid()));
