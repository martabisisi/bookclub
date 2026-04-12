import { supabase } from "@/lib/supabase";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Login istantaneo via Edge Function `yolo-login`.
 * Richiede `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` in `.env` / `.env.local`.
 */
export async function yoloLogin(email: string): Promise<void> {
  if (!url?.trim() || !anonKey?.trim()) {
    throw new Error(
      "Manca la configurazione Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)."
    );
  }

  const endpoint = `${url.replace(/\/$/, "")}/functions/v1/yolo-login`;
  const normalized = email.trim().toLowerCase();

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ email: normalized }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    access_token?: string;
    refresh_token?: string;
  };

  if (!res.ok) {
    const msg =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : "Accesso non riuscito";
    throw new Error(msg);
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
