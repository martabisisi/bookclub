import { useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function LoginPage() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    const redirect =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirect,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage(
      "Controlla la posta: ti abbiamo inviato il link per entrare. Se non arriva, verifica anche lo spam."
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="font-display text-3xl font-semibold text-ink">
        Bentornata
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Accesso solo su invito. Inserisci l&apos;email che ha usato l&apos;admin
        per il club: riceverai un magic link.
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        Hai ricevuto il link dal magic link? Controlla anche lo spam.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-card-border bg-card px-3 py-2 text-ink shadow-inner outline-none ring-sage focus:ring-2"
            placeholder="tu@esempio.com"
          />
        </div>
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-xl bg-sage px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-dark disabled:opacity-60"
        >
          {status === "sending" ? "Invio in corso…" : "Invia magic link"}
        </button>
      </form>

      {message ? (
        <p
          className={`mt-4 text-sm ${status === "error" ? "text-red-700" : "text-ink-muted"}`}
        >
          {message}
        </p>
      ) : null}

      {status === "sent" ? (
        <p className="mt-6 text-center text-sm text-ink-muted">
          Dopo aver cliccato il link tornerai a:{" "}
          <span className="font-medium text-ink">{from}</span>
        </p>
      ) : null}
    </div>
  );
}
