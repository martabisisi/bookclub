/** Converte date/timestamptz dal DB in `YYYY-MM-DD` per `<input type="date">`. */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const s = iso.trim();
  const head = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (head) return head[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}
