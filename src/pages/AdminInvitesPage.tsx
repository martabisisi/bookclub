import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function AdminInvitesPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setError(null);
    setToken(null);
    setCopied(false);
    const trimmed = email.trim();
    const { data, error: rpcErr } = await supabase.rpc("create_invite", {
      p_email: trimmed.length ? trimmed : null,
    });
    setBusy(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    if (typeof data === "string") {
      setToken(data);
    } else {
      setError("Risposta inattesa dal server.");
    }
  }

  const link =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/invite/${token}`
      : "";

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          to="/"
          className="text-sm font-medium text-sage-dark underline"
        >
          ← Home
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink">
          Inviti al club
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Genera un link personale. Opzionale: blocca l&apos;invito a una email
          specifica (l&apos;amica dovrà usare quella per il magic link).
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
        <div>
          <label htmlFor="inv-email" className="block text-sm font-medium text-ink">
            Email obbligatoria sull&apos;invito (opzionale)
          </label>
          <input
            id="inv-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Lascia vuoto per accettare qualsiasi email"
            className="mt-1 w-full rounded-lg border border-card-border bg-parchment px-3 py-2 text-ink outline-none ring-sage focus:ring-2"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void generate()}
          className="w-full rounded-xl bg-sage px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sage-dark disabled:opacity-60"
        >
          {busy ? "Generazione…" : "Genera nuovo link"}
        </button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {token ? (
          <div className="rounded-xl bg-parchment-dark/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Link da inviare
            </p>
            <p className="mt-2 break-all font-mono text-sm text-ink">{link}</p>
            <button
              type="button"
              onClick={() => void copy()}
              className="mt-3 rounded-lg bg-cocoa px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              {copied ? "Copiato!" : "Copia negli appunti"}
            </button>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-ink-muted">
        Per un club privato, in Supabase puoi limitare chi si registra e usare
        inviti + magic link come unico modo di entrare.
      </p>
    </div>
  );
}
