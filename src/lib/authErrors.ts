/** Messaggio user-friendly per errori Auth / rete di Supabase nel browser. */
export function formatSupabaseAuthError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("load failed") ||
    m.includes("network request failed")
  ) {
    return "Il browser non riesce a raggiungere Supabase. Controlla VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (nessuno spazio dopo =), riavvia npm run dev dopo aver modificato .env, e su Vercel le stesse variabili in Environment Variables con un nuovo deploy.";
  }
  return message;
}
