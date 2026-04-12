type BookCoverProps = {
  title: string;
  coverUrl: string | null;
  className?: string;
};

export function BookCover({ title, coverUrl, className = "" }: BookCoverProps) {
  if (coverUrl) {
    return (
      <img
        src={coverUrl}
        alt={`Copertina di ${title}`}
        className={`aspect-[2/3] w-full rounded-lg object-cover shadow-md ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-parchment-dark p-3 text-center font-display text-sm font-semibold leading-snug text-ink-muted shadow-inner ${className}`}
    >
      {title}
    </div>
  );
}
