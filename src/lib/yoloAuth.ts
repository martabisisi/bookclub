import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Login istantaneo via Edge Function `yolo-login` sul progetto Supabase
 * configurato in `createClient` (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
 */
export async function yoloLogin(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();

  const { data, error } = await supabase.functions.invoke("yolo-login", {
    body: { email: normalized },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const ctx = await error.context.json().catch(() => ({}));
      const msg =
        typeof (ctx as { error?: string }).error === "string"
          ? (ctx as { error: string }).error
          : error.message;
      throw new Error(msg);
    }
    if (error instanceof FunctionsFetchError) {
      throw new Error(
        "Impossibile raggiungere la funzione yolo-login. Su Supabase Dashboard → Edge Functions deve esserci yolo-login (deploy: npm run deploy:yolo-login dopo supabase login). In locale serve anche connessione a Internet."
      );
    }
    if (error instanceof FunctionsRelayError) {
      throw new Error(
        `Supabase non riesce a eseguire la funzione: ${error.message}`
      );
    }
    throw new Error(error.message);
  }

  const payload = data as {
    access_token?: string;
    refresh_token?: string;
  } | null;
  if (!payload?.access_token || !payload?.refresh_token) {
    throw new Error("Risposta login incompleta");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (sessionError) throw sessionError;
}
