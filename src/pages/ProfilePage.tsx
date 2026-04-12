import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookCover } from "@/components/BookCover";
import { StarDisplay } from "@/components/StarDisplay";
import { burstBookFinishedConfetti } from "@/lib/bookFinishedConfetti";
import { supabase } from "@/lib/supabase";
import type { Book, Profile, Rating, ReadingProgress } from "@/types/database";

type BookWithRating = Book & { rating: Rating };

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

type ProfilePageProps = {
  myUserId: string | null;
};

export function ProfilePage({ myUserId }: ProfilePageProps) {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [readBooks, setReadBooks] = useState<BookWithRating[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [myRatings, setMyRatings] = useState<Map<string, Rating>>(new Map());
  const [currentProgress, setCurrentProgress] = useState<ReadingProgress | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwn = Boolean(
    myUserId && profile && profile.user_id === myUserId
  );

  const currentBook = useMemo(
    () => allBooks.find((b) => b.is_current_book) ?? null,
    [allBooks]
  );

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    void (async () => {
      setError(null);
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (pErr || !prof) {
        setError(pErr?.message ?? "Profilo non trovato");
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(prof);

      const [{ data: books }, { data: ratings }, { data: allBookRows }] =
        await Promise.all([
          supabase.from("books").select("*"),
          supabase.from("ratings").select("*").eq("user_id", prof.user_id),
          supabase.from("books").select("*").order("created_at", { ascending: false }),
        ]);

      const bookMap = new Map((books ?? []).map((b) => [b.id, b]));
      const rated: BookWithRating[] = (ratings ?? [])
        .map((r) => {
          const b = bookMap.get(r.book_id);
          return b ? { ...b, rating: r } : null;
        })
        .filter((x): x is BookWithRating => x !== null);
      rated.sort(
        (a, b) =>
          new Date(b.rating.created_at).getTime() -
          new Date(a.rating.created_at).getTime()
      );
      setReadBooks(rated);
      setAllBooks(allBookRows ?? []);

      if (myUserId === prof.user_id) {
        const map = new Map<string, Rating>();
        (ratings ?? []).forEach((r) => map.set(r.book_id, r));
        setMyRatings(map);

        const cur = (allBookRows ?? []).find((b) => b.is_current_book);
        if (cur) {
          const { data: prog } = await supabase
            .from("reading_progress")
            .select("*")
            .eq("book_id", cur.id)
            .eq("user_id", prof.user_id)
            .maybeSingle();
          setCurrentProgress(prog ?? null);
        } else {
          setCurrentProgress(null);
        }
      } else {
        setMyRatings(new Map());
        setCurrentProgress(null);
      }

      setLoading(false);
    })();
  }, [slug, myUserId]);

  if (loading) {
    return <p className="text-ink-muted">Caricamento profilo…</p>;
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <p className="text-ink-muted">{error ?? "Profilo non trovato."}</p>
        <Link to="/" className="font-semibold text-sage-dark underline">
          Torna alla home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-card-border bg-parchment-dark text-2xl font-display font-semibold text-ink sm:size-24 sm:text-3xl">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            profile.nome.slice(0, 1).toUpperCase()
          )}
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            {profile.nome}
          </h1>
          <p className="text-sm text-ink-muted">@{profile.slug}</p>
          {isOwn ? (
            <p className="mt-2 text-sm text-ink-muted">
              Puoi modificare stelle e commento su ogni libro quando vuoi, e
              aggiornare il progresso sul libro in corso.
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">
              Profilo di {profile.nome} — solo visualizzazione.
            </p>
          )}
        </div>
      </header>

      {isOwn && currentBook ? (
        <CurrentReadingPanel
          book={currentBook}
          initial={currentProgress}
          userId={profile.user_id}
          onSaved={(row) => setCurrentProgress(row)}
        />
      ) : null}

      {!isOwn ? (
        <section>
          <h2 className="font-display text-xl font-semibold text-ink">
            Libri letti
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Ordinati dal voto più recente.
          </p>
          <ul className="mt-4 space-y-3">
            {readBooks.length === 0 ? (
              <li className="rounded-xl border border-dashed border-card-border bg-card/60 px-4 py-6 text-center text-sm text-ink-muted">
                Nessun libro con voto ancora.
              </li>
            ) : (
              readBooks.map((b) => (
                <li
                  key={b.id}
                  className="flex gap-3 rounded-xl border border-card-border bg-card p-3 shadow-sm"
                >
                  <Link to={`/libri/${b.id}`} className="w-14 shrink-0">
                    <BookCover title={b.title} coverUrl={b.cover_url} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/libri/${b.id}`}
                      className="font-display font-semibold text-ink hover:text-sage-dark"
                    >
                      {b.title}
                    </Link>
                    <p className="text-xs text-ink-muted">{b.author}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StarDisplay value={Number(b.rating.stars)} size="sm" />
                      <span className="text-xs text-ink-muted">
                        {formatDate(b.rating.created_at)}
                      </span>
                    </div>
                    {b.rating.comment ? (
                      <p className="mt-1 text-sm text-ink-muted">
                        {b.rating.comment}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {isOwn ? (
        <>
          <AllBooksVoteSection
            books={allBooks}
            myRatings={myRatings}
            userId={profile.user_id}
            onVoteSaved={(bookId, rating) => {
              setMyRatings((prev) => new Map(prev).set(bookId, rating));
              setReadBooks((prev) => {
                const book = allBooks.find((b) => b.id === bookId);
                if (!book) return prev;
                const idx = prev.findIndex((x) => x.id === bookId);
                const entry: BookWithRating = { ...book, rating };
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = entry;
                  next.sort(
                    (a, b) =>
                      new Date(b.rating.created_at).getTime() -
                      new Date(a.rating.created_at).getTime()
                  );
                  return next;
                }
                return [entry, ...prev].sort(
                  (a, b) =>
                    new Date(b.rating.created_at).getTime() -
                    new Date(a.rating.created_at).getTime()
                );
              });
            }}
          />
          <ProfileBasicsEditor
            profile={profile}
            onUpdated={(patch) =>
              setProfile((prev) => (prev ? { ...prev, ...patch } : prev))
            }
          />
        </>
      ) : null}
    </div>
  );
}

type CurrentProps = {
  book: Book;
  initial: ReadingProgress | null;
  userId: string;
  onSaved: (row: ReadingProgress) => void;
};

function CurrentReadingPanel({
  book,
  initial,
  userId,
  onSaved,
}: CurrentProps) {
  const [page, setPage] = useState(
    initial?.current_page?.toString() ?? "0"
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setPage(initial?.current_page?.toString() ?? "0");
  }, [initial?.current_page, book.id]);

  async function persistPage(n: number) {
    setSaving(true);
    setMsg(null);
    const { data, error } = await supabase
      .from("reading_progress")
      .upsert(
        {
          book_id: book.id,
          user_id: userId,
          current_page: n,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "book_id,user_id" }
      )
      .select()
      .single();
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return false;
    }
    if (data) {
      onSaved(data);
      setPage(String(n));
    }
    setMsg(
      n >= book.total_pages
        ? "Libro segnato come finito."
        : "Salvato."
    );
    return true;
  }

  const PG_INT_MAX = 2147483647;

  async function save() {
    const n = Number(page);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      setMsg("Inserisci un numero intero di pagine (≥ 0).");
      return;
    }
    if (n > PG_INT_MAX) {
      setMsg("Numero troppo grande.");
      return;
    }
    await persistPage(n);
  }

  async function markFinished() {
    const ok = await persistPage(book.total_pages);
    if (ok) {
      burstBookFinishedConfetti();
    }
  }

  return (
    <section className="rounded-2xl border border-sage/30 bg-card p-4 shadow-sm sm:p-5">
      <h2 className="font-display text-lg font-semibold text-ink">
        Libro in corso: {book.title}
      </h2>
      <p className="text-sm text-ink-muted">Aggiorna i tuoi progressi</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="page" className="block text-xs font-medium text-ink">
            Pagina corrente
          </label>
          <input
            id="page"
            type="number"
            min={0}
            step={1}
            value={page}
            onChange={(e) => setPage(e.target.value)}
            className="mt-1 min-w-32 rounded-lg border border-card-border bg-parchment px-3 py-2 text-ink outline-none ring-sage focus:ring-2 sm:w-36"
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white hover:bg-sage-dark disabled:opacity-60"
        >
          {saving ? "Salvo…" : "Salva progresso"}
        </button>
        <button
          type="button"
          disabled={
            saving || Number(page) >= book.total_pages
          }
          onClick={() => void markFinished()}
          className="rounded-xl border-2 border-cocoa bg-parchment px-4 py-2 text-sm font-semibold text-cocoa transition hover:bg-parchment-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ho finito il libro
        </button>
      </div>
      {msg ? <p className="mt-2 text-sm text-ink-muted">{msg}</p> : null}
    </section>
  );
}

type AllBooksVoteProps = {
  books: Book[];
  myRatings: Map<string, Rating>;
  userId: string;
  onVoteSaved: (bookId: string, rating: Rating) => void;
};

function AllBooksVoteSection({
  books,
  myRatings,
  userId,
  onVoteSaved,
}: AllBooksVoteProps) {
  const sorted = useMemo(
    () =>
      [...books].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [books]
  );

  if (sorted.length === 0) {
    return (
      <section>
        <h2 className="font-display text-xl font-semibold text-ink">
          Voti e commenti
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Non ci sono ancora libri nel club.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-ink">
        Voti e commenti
      </h2>
      <p className="text-sm text-ink-muted">
        Per ogni libro puoi impostare o cambiare stelle e commento in
        qualsiasi momento.
      </p>
      <ul className="space-y-6">
        {sorted.map((b) => (
          <li key={b.id}>
            <RateBookForm
              book={b}
              userId={userId}
              existingRating={myRatings.get(b.id) ?? null}
              onSaved={onVoteSaved}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

type RateFormProps = {
  book: Book;
  userId: string;
  existingRating: Rating | null;
  onSaved: (bookId: string, rating: Rating) => void;
};

const STAR_STEPS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

function starStepLabel(n: number) {
  if (Number.isInteger(n)) return `${n}★`;
  return `${Math.floor(n)}½★`;
}

function RateBookForm({ book, userId, existingRating, onSaved }: RateFormProps) {
  const [stars, setStars] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    setOkMsg(null);
    if (existingRating) {
      setStars(Number(existingRating.stars));
      setComment(existingRating.comment ?? "");
    } else {
      setStars(5);
      setComment("");
    }
  }, [book.id, existingRating?.id]);

  async function submit() {
    setSaving(true);
    setErr(null);
    setOkMsg(null);
    const { data, error } = await supabase
      .from("ratings")
      .upsert(
        {
          book_id: book.id,
          user_id: userId,
          stars,
          comment: comment.trim(),
        },
        { onConflict: "book_id,user_id" }
      )
      .select()
      .single();
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    if (data) {
      onSaved(book.id, data);
      setOkMsg("Salvato.");
    }
  }

  const isEdit = Boolean(existingRating);

  return (
    <div className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <Link to={`/libri/${book.id}`} className="w-16 shrink-0">
          <BookCover title={book.title} coverUrl={book.cover_url} />
        </Link>
        <div className="min-w-0">
          <Link
            to={`/libri/${book.id}`}
            className="font-display font-semibold text-ink hover:text-sage-dark"
          >
            {book.title}
          </Link>
          <p className="text-xs text-ink-muted">{book.author}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {isEdit
              ? "Hai già votato questo libro — puoi aggiornare quando vuoi."
              : "Non hai ancora votato questo libro."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
        {STAR_STEPS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold sm:px-3 sm:text-sm ${
              stars === n
                ? "bg-sage text-white"
                : "bg-parchment-dark text-ink-muted"
            }`}
          >
            {starStepLabel(n)}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-xs font-medium text-ink">
        Commento breve
      </label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-lg border border-card-border bg-parchment px-3 py-2 text-sm text-ink outline-none ring-sage focus:ring-2"
        placeholder="Cosa ti è piaciuto (o no)?"
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => void submit()}
        className="mt-3 rounded-xl bg-cocoa px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {saving
          ? "Salvataggio…"
          : isEdit
            ? "Salva modifiche"
            : "Pubblica voto"}
      </button>
      {okMsg ? (
        <p className="mt-2 text-sm text-sage-dark">{okMsg}</p>
      ) : null}
      {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}
    </div>
  );
}

function ProfileBasicsEditor({
  profile,
  onUpdated,
}: {
  profile: Profile;
  onUpdated: (patch: Partial<Profile>) => void;
}) {
  const [nome, setNome] = useState(profile.nome);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setNome(profile.nome);
    setAvatarUrl(profile.avatar_url ?? "");
    setMsg(null);
  }, [profile.id, profile.nome, profile.avatar_url]);

  async function save() {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        nome: nome.trim() || profile.nome,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("user_id", profile.user_id);
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    onUpdated({
      nome: nome.trim() || profile.nome,
      avatar_url: avatarUrl.trim() || null,
    });
    setMsg("Profilo aggiornato.");
  }

  return (
    <section className="rounded-2xl border border-card-border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="font-display text-lg font-semibold text-ink">
        Il tuo nome e avatar
      </h2>
      <p className="text-sm text-ink-muted">
        Lo slug URL resta <span className="font-mono text-ink">@{profile.slug}</span>{" "}
        (modificabile solo da SQL se serve).
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink">Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-lg border border-card-border bg-parchment px-3 py-2 text-sm text-ink outline-none ring-sage focus:ring-2"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink">
            URL avatar (opzionale)
          </label>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-card-border bg-parchment px-3 py-2 text-sm text-ink outline-none ring-sage focus:ring-2"
          />
        </div>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="mt-4 rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white hover:bg-sage-dark disabled:opacity-60"
      >
        {saving ? "Salvo…" : "Salva profilo"}
      </button>
      {msg ? <p className="mt-2 text-sm text-ink-muted">{msg}</p> : null}
    </section>
  );
}
