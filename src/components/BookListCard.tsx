import { Link } from "react-router-dom";
import { BookCover } from "@/components/BookCover";
import { MemberReadingStatus } from "@/components/MemberReadingStatus";
import { StarDisplay } from "@/components/StarDisplay";
import { formatMeetingDate } from "@/lib/formatMeetingDate";
import type { Book, Profile, ReadingProgress } from "@/types/database";

type BookListCardProps = {
  book: Book;
  isCurrent: boolean;
  profiles: Profile[];
  progressByUserId: Map<string, ReadingProgress>;
  /** Media voti (sezione lista); assente se nessun voto. */
  voteSummary?: { average: number; count: number };
  showAdminToggle?: boolean;
  busy?: boolean;
  onToggleCurrent?: (book: Book) => void;
};

export function BookListCard({
  book,
  isCurrent,
  profiles,
  progressByUserId,
  voteSummary,
  showAdminToggle,
  busy,
  onToggleCurrent,
}: BookListCardProps) {
  const meetingLabel = formatMeetingDate(book.meeting_date);

  return (
    <article className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm transition hover:shadow-md">
      <div className="flex gap-4 p-4 sm:gap-5 sm:p-5">
        <Link
          to={`/libri/${book.id}`}
          className="w-24 shrink-0 sm:w-28"
          aria-label={`Apri ${book.title}`}
        >
          <BookCover title={book.title} coverUrl={book.cover_url} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <Link to={`/libri/${book.id}`} className="group block min-w-0">
                <h2 className="font-display text-lg font-semibold text-ink group-hover:text-sage-dark sm:text-xl">
                  {book.title}
                </h2>
                <p className="text-sm text-ink-muted">{book.author}</p>
              </Link>
              {!isCurrent && meetingLabel ? (
                <p className="mt-2 text-sm text-sage-dark">
                  <span className="font-medium text-ink-muted">Incontro: </span>
                  {meetingLabel}
                </p>
              ) : null}
              {!isCurrent && voteSummary ? (
                voteSummary.count > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                      Voto medio
                    </span>
                    <span className="font-display text-lg font-semibold text-cocoa">
                      {voteSummary.average.toFixed(1)}
                    </span>
                    <StarDisplay value={voteSummary.average} size="sm" />
                    <span className="text-xs text-ink-muted">
                      ({voteSummary.count}{" "}
                      {voteSummary.count === 1 ? "voto" : "voti"})
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-ink-muted">
                    Nessun voto ancora per questo libro.
                  </p>
                )
              ) : null}
            </div>
            {isCurrent ? (
              <span className="shrink-0 rounded-full bg-sage px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                Stiamo leggendo
              </span>
            ) : null}
          </div>

          {isCurrent ? (
            <MemberReadingStatus
              book={book}
              profiles={profiles}
              progressByUserId={progressByUserId}
            />
          ) : null}

          {showAdminToggle ? (
            <div className="mt-4 flex items-center gap-2 border-t border-card-border pt-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  className="size-4 accent-sage"
                  checked={book.is_current_book}
                  disabled={busy}
                  onChange={() => onToggleCurrent?.(book)}
                />
                Libro corrente del club
              </label>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
