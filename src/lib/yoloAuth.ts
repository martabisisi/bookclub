import { supabase } from "@/lib/supabase";

/**
 * Base URL per `/functions/v1/...`:
 * - in locale (dev o preview su localhost) il proxy Vite evita CORS;
 * - in produzione si usa l’URL Supabase diretto (la Edge Function risponde con CORS).
 */
function supabaseOriginForRequests(): string {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  if (typeof window === "undefined") {
    return url.replace(/\/$/, "");
  }
  const { hostname } = window.location;
  const local =
    import.meta.env.DEV ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";
  if (local) {
    return `${window.location.origin}/__supabase`;
  }
  return url.replace(/\/$/, "");
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
      "Connessione a Supabase fallita. Controlla VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY su Vercel, che la funzione yolo-login sia deployata e che non ci siano spazi dopo = nel .env."
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
