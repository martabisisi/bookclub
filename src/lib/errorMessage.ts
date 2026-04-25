/** Messaggio leggibile da Error o da oggetti errore Supabase/PostgREST. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return "Errore sconosciuto";
}
