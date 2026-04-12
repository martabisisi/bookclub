import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { yoloLogin } from "@/lib/yoloAuth";

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    try {
      await yoloLogin(email);
      setStatus("idle");
      navigate(from, { replace: true });
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Accesso non riuscito");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="font-display text-3xl font-semibold text-ink">
        Bentornata
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Modalità semplice: inserisci l&apos;email autorizzata per il club e
        entri subito, senza mail di verifica.
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
          {status === "sending" ? "Accesso…" : "Entra"}
        </button>
      </form>

      {message ? (
        <p
          className={`mt-4 text-sm ${status === "error" ? "text-red-700" : "text-ink-muted"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
