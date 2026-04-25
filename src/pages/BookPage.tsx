import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookCover } from "@/components/BookCover";
import { StarDisplay } from "@/components/StarDisplay";
import { supabase } from "@/lib/supabase";
import { formatMeetingDate } from "@/lib/formatMeetingDate";
import type { Book, Profile, Rating } from "@/types/database";

type Row = Rating & { profile?: Pick<Profile, "nome" | "slug"> | null };

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type BookPageProps = {
  isAdmin?: boolean;
};

export function BookPage({ isAdmin = false }: BookPageProps) {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [ratings, setRatings] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    void (async () => {
      setError(null);
      const { data: b, error: bErr } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (bErr || !b) {
        setError(bErr?.message ?? "Libro non trovato");
        setBook(null);
        setLoading(false);
        return;
      }
      setBook(b);

      const [{ data: r, error: rErr }, { data: p, error: pErr }] =
        await Promise.all([
          supabase.from("ratings").select("*").eq("book_id", id),
          supabase.from("profiles").select("*"),
        ]);

      if (rErr) setError(rErr.message);
      if (pErr) setError(pErr.message);

      const profList = p ?? [];
      setProfiles(profList);
      const byUser = new Map(profList.map((x) => [x.user_id, x]));

      const merged: Row[] = (r ?? []).map((row) => ({
        ...row,
        profile: byUser.get(row.user_id) ?? null,
      }));
      merged.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRatings(merged);
      setLoading(false);
    })();
  }, [id]);

  const average = useMemo(() => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, x) => acc + Number(x.stars), 0);
    return sum / ratings.length;
  }, [ratings]);

  const meetingLabel = book ? formatMeetingDate(book.meeting_date) : null;

  if (loading) {
    return <p className="text-ink-muted">Caricamento…</p>;
  }

  if (!book) {
    return (
      <div className="space-y-4">
        <p className="text-ink-muted">{error ?? "Libro non trovato."}</p>
        <Link to="/" className="font-semibold text-sage-dark underline">
          Torna alla home
        </Link>
      </div>
    );
  }

  return (
    <article className="space-y-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          to="/"
          className="text-sm font-medium text-sage-dark underline"
        >
          ← Home
        </Link>
        {isAdmin ? (
          <Link
            to={`/libri/${book.id}/modifica`}
            className="text-sm font-semibold text-cocoa underline"
          >
            Modifica libro
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="mx-auto w-48 shrink-0 sm:mx-0 sm:w-56">
          <BookCover title={book.title} coverUrl={book.cover_url} />
        </div>
        <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              {book.title}
            </h1>
            <p className="mt-1 text-lg text-ink-muted">{book.author}</p>
            {meetingLabel ? (
              <p className="mt-2 text-sm text-ink">
                <span className="text-ink-muted">Incontro del club: </span>
                {meetingLabel}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <p className="text-sm font-medium uppercase tracking-wide text-ink-muted">
              Media del club
            </p>
            <p className="font-display text-4xl font-bold text-cocoa sm:text-5xl">
              {ratings.length ? average.toFixed(1) : "—"}
            </p>
            <StarDisplay value={average} size="lg" />
            <p className="text-xs text-ink-muted">
              {ratings.length} vot
              {ratings.length === 1 ? "o" : "i"} su {profiles.length}{" "}
              membri
            </p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold text-ink">
          Voti e commenti
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Da qui è solo lettura: per dare o modificare il voto apri il tuo
          profilo.
        </p>
        <ul className="mt-4 space-y-3">
          {ratings.length === 0 ? (
            <li className="rounded-xl border border-dashed border-card-border bg-card/60 px-4 py-6 text-center text-sm text-ink-muted">
              Nessun voto ancora.
            </li>
          ) : (
            ratings.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-card-border bg-card px-4 py-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {r.profile?.slug ? (
                    <Link
                      to={`/profilo/${r.profile.slug}`}
                      className="font-semibold text-ink hover:text-sage-dark"
                    >
                      {r.profile.nome}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink">
                      {r.profile?.nome ?? "Lettrice"}
                    </span>
                  )}
                  <StarDisplay value={Number(r.stars)} size="sm" />
                </div>
                {r.comment ? (
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {r.comment}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-ink-muted/80">
                  {formatDate(r.created_at)}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </article>
  );
}
