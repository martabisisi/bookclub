import { StarDisplay } from "@/components/StarDisplay";
import type { Book, Profile, ReadingProgress } from "@/types/database";

type MemberReadingStatusProps = {
  book: Book;
  profiles: Profile[];
  progressByUserId: Map<string, ReadingProgress>;
  /** Stelle date da ogni utente a questo libro (se presente). */
  ratingsByUserId?: Map<string, number>;
};

function labelFor(book: Book, p: ReadingProgress | undefined) {
  if (!p || p.current_page <= 0) return "Non iniziato" as const;
  if (p.current_page >= book.total_pages) return "Finito" as const;
  const pct = Math.min(
    100,
    Math.round((p.current_page / book.total_pages) * 100)
  );
  return { kind: "reading" as const, pct };
}

export function MemberReadingStatus({
  book,
  profiles,
  progressByUserId,
  ratingsByUserId,
}: MemberReadingStatusProps) {
  const showVotes = Boolean(ratingsByUserId);

  return (
    <ul className="mt-3 space-y-2 border-t border-card-border pt-3">
      {profiles.map((prof) => {
        const prog = progressByUserId.get(prof.user_id);
        const status = labelFor(book, prog);
        const stars = ratingsByUserId?.get(prof.user_id);
        return (
          <li
            key={prof.user_id}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm"
          >
            <span className="min-w-0 font-medium text-ink">{prof.nome}</span>
            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 sm:ml-auto">
              {showVotes ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="sr-only">Voto</span>
                  {stars != null ? (
                    <StarDisplay
                      value={Number(stars)}
                      size="sm"
                      className="text-cocoa"
                    />
                  ) : (
                    <span className="text-xs text-ink-muted/90">—</span>
                  )}
                </span>
              ) : null}
              <span className="shrink-0 text-right text-ink-muted">
                {status === "Non iniziato" || status === "Finito" ? (
                  status
                ) : (
                  <>In lettura: {status.pct}%</>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
