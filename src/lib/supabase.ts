import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

if (!url || !anonKey) {
  console.warn(
    "Mancano VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example in .env e compila i valori."
  );
}

/** True se il client può chiamare Supabase (utile per messaggi in UI). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    url.startsWith("https://") && anonKey.length > 20
  );
}

export const supabase = createClient<Database>(url, anonKey);

export const PENDING_INVITE_TOKEN_KEY = "bookclub_pending_invite_token";
