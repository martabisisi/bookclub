/** Formatta una data incontro (es. da DB `YYYY-MM-DD`) in italiano. */
export function formatMeetingDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const s = iso.trim();
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s)
      ? new Date(`${s}T12:00:00`)
      : new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return null;
  }
}
