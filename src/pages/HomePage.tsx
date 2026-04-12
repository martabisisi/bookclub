import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookListCard } from "@/components/BookListCard";
import { BookCover } from "@/components/BookCover";
import { MemberReadingStatus } from "@/components/MemberReadingStatus";
import { StarDisplay } from "@/components/StarDisplay";
import { formatMeetingDate } from "@/lib/formatMeetingDate";
import { supabase } from "@/lib/supabase";
import type { Book, Profile, ReadingProgress } from "@/types/database";

type HomePageProps = {
  isAdmin: boolean;
};

/** Timestamp in ms per ordinare per data incontro; null se assente. */
function meetingDateMs(book: Book): number | null {
  const iso = book.meeting_date;
  if (!iso?.trim()) return null;
  const s = iso.trim();
  const ms = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? new Date(`${s}T12:00:00`).getTime()
    : new Date(s).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function HomePage({ isAdmin }: HomePageProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [progressByUserId, setProgressByUserId] = useState<
    Map<string, ReadingProgress>
  >(new Map());
  const [currentBookRatingsByUserId, setCurrentBookRatingsByUserId] = useState<
    Map<string, number>
  >(new Map());
  /** Media voti per libro (sezione «Tutti i libri»). */
  const [voteStatsByBookId, setVoteStatsByBookId] = useState<
    Map<string, { average: number; count: number }>
  >(new Map());
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [
      { data: bookRows, error: bookErr },
      { data: profileRows, error: profErr },
      { data: allRatingRows, error: allRatingsErr },
    ] = await Promise.all([
      supabase
        .from("books")
        .select("*")
        .order("is_current_book", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("nome", { ascending: true }),
      supabase.from("ratings").select("book_id, user_id, stars"),
    ]);

    if (bookErr) {
      setError(bookErr.message);
      setBooks([]);
      setLoading(false);
      return;
    }
    if (profErr) {
      setError(profErr.message);
      setProfiles([]);
      setLoading(false);
      return;
    }
    if (allRatingsErr) {
      setError(allRatingsErr.message);
      setVoteStatsByBookId(new Map());
    } else {
      const starsByBook = new Map<string, number[]>();
      for (const row of allRatingRows ?? []) {
        const s = Number(row.stars);
        if (!Number.isFinite(s)) continue;
        const arr = starsByBook.get(row.book_id) ?? [];
        arr.push(s);
        starsByBook.set(row.book_id, arr);
      }
      const stats = new Map<string, { average: number; count: number }>();
      for (const [bookId, vals] of starsByBook) {
        stats.set(bookId, {
          average: vals.reduce((a, b) => a + b, 0) / vals.length,
          count: vals.length,
        });
      }
      setVoteStatsByBookId(stats);
    }

    setBooks(bookRows ?? []);
    setProfiles(profileRows ?? []);

    const ratingsList = allRatingRows ?? [];
    const current = (bookRows ?? []).find((b) => b.is_current_book);
    if (current) {
      const { data: prog, error: pErr } = await supabase
        .from("reading_progress")
        .select("*")
        .eq("book_id", current.id);
      if (pErr) {
        setError(pErr.message);
      } else {
        const m = new Map<string, ReadingProgress>();
        (prog ?? []).forEach((row) => m.set(row.user_id, row));
        setProgressByUserId(m);
      }
      const rm = new Map<string, number>();
      for (const row of ratingsList) {
        if (row.book_id !== current.id) continue;
        const s = Number(row.stars);
        if (Number.isFinite(s)) rm.set(row.user_id, s);
      }
      setCurrentBookRatingsByUserId(rm);
    } else {
      setProgressByUserId(new Map());
      setCurrentBookRatingsByUserId(new Map());
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const currentBook = useMemo(
    () => books.find((b) => b.is_current_book) ?? null,
    [books]
  );

  const otherBooks = useMemo(() => {
    const list = books.filter((b) => !b.is_current_book);
    return [...list].sort((a, b) => {
      const ma = meetingDateMs(a);
      const mb = meetingDateMs(b);
      if (ma != null && mb != null) return mb - ma;
      if (ma != null && mb == null) return -1;
      if (ma == null && mb != null) return 1;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [books]);

  const currentBookVoteAverage = useMemo(() => {
    const vals = [...currentBookRatingsByUserId.values()].filter(Number.isFinite);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [currentBookRatingsByUserId]);

  const allMembersHaveVotedForCurrent = useMemo(() => {
    if (profiles.length === 0) return false;
    return profiles.every((p) => currentBookRatingsByUserId.has(p.user_id));
  }, [profiles, currentBookRatingsByUserId]);

  const currentMeetingLabel = useMemo(
    () => formatMeetingDate(currentBook?.meeting_date),
    [currentBook?.meeting_date]
  );

  if (loading) {
    return (
      <div className="text-center text-ink-muted">Caricamento libri…</div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-8 overflow-x-hidden">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          I nostri libri
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Copertine, voti e progressi di lettura del club.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">
          Il libro che stiamo leggendo ora
        </h2>
        {currentBook ? (
          <div className="sticky top-28 z-10 rounded-2xl border-2 border-sage/40 bg-card p-4 shadow-md sm:p-5">
            <div className="flex gap-4 sm:gap-5">
              <Link
                to={`/libri/${currentBook.id}`}
                className="w-28 shrink-0 sm:w-32"
              >
                <BookCover
                  title={currentBook.title}
                  coverUrl={currentBook.cover_url}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-2">
                  <div>
                    <Link
                      to={`/libri/${currentBook.id}`}
                      className="font-display text-xl font-semibold text-ink hover:text-sage-dark"
                    >
                      {currentBook.title}
                    </Link>
                    <p className="text-sm text-ink-muted">
                      {currentBook.author}
                    </p>
                    {currentMeetingLabel ? (
                      <p className="mt-1.5 text-sm text-sage-dark">
                        <span className="text-ink-muted">Incontro: </span>
                        {currentMeetingLabel}
                      </p>
                    ) : null}
                    {profiles.length > 0 ? (
                      allMembersHaveVotedForCurrent &&
                      currentBookVoteAverage != null ? (
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                            Voto medio
                          </span>
                          <span className="font-display text-lg font-semibold text-cocoa">
                            {currentBookVoteAverage.toFixed(1)}
                          </span>
                          <StarDisplay
                            value={currentBookVoteAverage}
                            size="sm"
                          />
                          <span className="text-xs text-ink-muted">
                            ({currentBookRatingsByUserId.size}{" "}
                            {currentBookRatingsByUserId.size === 1
                              ? "voto"
                              : "voti"}
                            )
                          </span>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-ink-muted">
                          Il voto medio e i voti individuali saranno visibili
                          quando tutti i membri avranno votato
                          {currentBookRatingsByUserId.size > 0
                            ? ` (${currentBookRatingsByUserId.size}/${profiles.length}).`
                            : "."}
                        </p>
                      )
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-sage px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                    Stiamo leggendo
                  </span>
                </div>
                <MemberReadingStatus
                  book={currentBook}
                  profiles={profiles}
                  progressByUserId={progressByUserId}
                  ratingsByUserId={
                    allMembersHaveVotedForCurrent
                      ? currentBookRatingsByUserId
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-card-border bg-card/60 px-4 py-6 text-center text-sm text-ink-muted">
            Nessun libro corrente.{" "}
            {isAdmin
              ? "Segna uno dalla lista sotto con il toggle."
              : "Chiedi all'admin di impostarlo."}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-ink">
          Tutti i libri
        </h2>
        {books.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Ancora nessun libro. L&apos;admin può aggiungerne uno da{" "}
            <span className="font-medium text-ink">Nuovo libro</span>.
          </p>
        ) : (
          <ul className="space-y-4">
            {otherBooks.map((book) => (
              <li key={book.id}>
                <BookListCard
                  book={book}
                  isCurrent={false}
                  profiles={profiles}
                  progressByUserId={new Map()}
                  voteSummary={
                    voteStatsByBookId.get(book.id) ?? {
                      average: 0,
                      count: 0,
                    }
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
