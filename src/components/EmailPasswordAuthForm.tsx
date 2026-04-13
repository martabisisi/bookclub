import { useEffect, useState } from "react";
import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const inputClass =
  "mt-1 w-full rounded-lg border border-card-border bg-card px-3 py-2 text-ink shadow-inner outline-none ring-sage focus:ring-2";
const btnClass =
  "w-full rounded-xl bg-sage px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-dark disabled:opacity-60";

function mapAuthError(err: AuthError): string {
  const msg = err.message.toLowerCase();
  if (msg.includes("invalid login credentials")) {
    return "Email o password non corretti.";
  }
  if (msg.includes("already registered") || msg.includes("user already")) {
    return "Esiste già un account con questa email. Passa ad «Accedi».";
  }
  if (msg.includes("email not confirmed")) {
    return "Conferma prima l'email dal link che ti abbiamo mandato.";
  }
  if (msg.includes("password")) {
    return "La password non rispetta i requisiti (minimo 6 caratteri).";
  }
  return err.message;
}

type Props = {
  /** Se impostata, il campo email non è modificabile (es. invito vincolato). */
  lockedEmail?: string | null;
  /** "signin" = schermata accesso, "signup" = crea account */
  defaultMode?: "signin" | "signup";
  onAuthenticated: () => void;
  submitLabelSignin?: string;
  submitLabelSignup?: string;
};

export function EmailPasswordAuthForm({
  lockedEmail,
  defaultMode = "signin",
  onAuthenticated,
  submitLabelSignin = "Accedi",
  submitLabelSignup = "Crea account e entra",
}: Props) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (lockedEmail) setEmail(lockedEmail);
  }, [lockedEmail]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setInfo(null);
    const em = (lockedEmail ?? email).trim().toLowerCase();
    const pw = password;

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: em,
          password: pw,
        });
        if (error) throw error;
        onAuthenticated();
        return;
      }

      const origin =
        typeof window !== "undefined" ? window.location.origin : undefined;
      const { data, error } = await supabase.auth.signUp({
        email: em,
        password: pw,
        options: origin ? { emailRedirectTo: `${origin}/` } : undefined,
      });
      if (error) throw error;

      if (data.session) {
        onAuthenticated();
        return;
      }
      setInfo(
        "Ti abbiamo inviato un’email di conferma. Apri il link, poi torna qui e accedi."
      );
    } catch (err) {
      setMessage(mapAuthError(err as AuthError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="flex gap-2 rounded-xl border border-card-border bg-parchment-dark/30 p-1 text-sm">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setMessage(null);
            setInfo(null);
          }}
          className={`flex-1 rounded-lg py-2 font-medium transition ${
            mode === "signin"
              ? "bg-card text-ink shadow-sm"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Accedi
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setMessage(null);
            setInfo(null);
          }}
          className={`flex-1 rounded-lg py-2 font-medium transition ${
            mode === "signup"
              ? "bg-card text-ink shadow-sm"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Crea account
        </button>
      </div>

      <div>
        <label htmlFor="auth-email" className="block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={Boolean(lockedEmail)}
          value={lockedEmail ?? email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputClass} disabled:bg-parchment-dark`}
          placeholder="tu@esempio.com"
        />
      </div>
      <div>
        <label htmlFor="auth-password" className="block text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="auth-password"
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="Almeno 6 caratteri"
        />
      </div>
      <button type="submit" disabled={busy} className={btnClass}>
        {busy
          ? "…"
          : mode === "signin"
            ? submitLabelSignin
            : submitLabelSignup}
      </button>
      {message ? <p className="text-sm text-red-700">{message}</p> : null}
      {info ? <p className="text-sm text-ink-muted">{info}</p> : null}
    </form>
  );
}
