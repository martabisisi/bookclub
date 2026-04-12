import { supabase } from "@/lib/supabase";

/**
 * URL base per chiamare le Edge Functions senza CORS:
 * - dev / preview Vite: proxy `vite.config` → `/__supabase`
 * - produzione (es. Vercel): rewrite `vercel.json` → `/supabase-proxy`
 * - altrimenti: URL diretto (solo se il browser può parlare con Supabase)
 */
function supabaseOriginForRequests(): string {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  if (typeof window === "undefined") {
    return url.replace(/\/$/, "");
  }
  const origin = window.location.origin;
  if (import.meta.env.DEV) {
    return `${origin}/__supabase`;
  }
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${origin}/__supabase`;
  }
  return `${origin}/supabase-proxy`;
}

/**
 * Login istantaneo via Edge Function `yolo-login`.
 * Richiede `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` in `.env` / `.env.local`
 * (senza spazi dopo `=`).
 */
export async function yoloLogin(email: string): Promise<void> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!import.meta.env.VITE_SUPABASE_URL?.trim() || !anonKey) {
    throw new Error(
      "Manca la configurazione Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)."
    );
  }

  const endpoint = `${supabaseOriginForRequests()}/functions/v1/yolo-login`;
  const normalized = email.trim().toLowerCase();

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ email: normalized }),
    });
  } catch {
    throw new Error(
      "Connessione al server fallita. Verifica che la Edge Function yolo-login sia deployata su Supabase, che su Vercel sia stato fatto redeploy dopo aver aggiunto vercel.json, e le variabili VITE_SUPABASE_* (senza spazi dopo =)."
    );
  }

  const raw = await res.text();
  let json: {
    error?: string;
    message?: string;
    msg?: string;
    access_token?: string;
    refresh_token?: string;
  } = {};
  try {
    json = raw ? (JSON.parse(raw) as typeof json) : {};
  } catch {
    /* risposta non JSON (es. HTML da proxy) */
  }

  if (!res.ok) {
    const fromBody =
      [json.error, json.message, json.msg].find(
        (s): s is string => typeof s === "string" && s.length > 0,
      ) ?? (raw.trim() && raw.length < 400 ? raw.trim() : null);
    throw new Error(
      fromBody ?? `Errore dal server (${res.status}). Controlla i log della funzione yolo-login su Supabase.`,
    );
  }

  const { access_token, refresh_token } = json;
  if (!access_token || !refresh_token) {
    throw new Error("Risposta login incompleta");
  }

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
}
