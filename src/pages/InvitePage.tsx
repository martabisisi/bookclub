import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatSupabaseAuthError } from "@/lib/authErrors";
import { PENDING_INVITE_TOKEN_KEY, supabase } from "@/lib/supabase";

type ValidatePayload = {
  valid?: boolean;
  email?: string | null;
};

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setValid(false);
      return;
    }

    void (async () => {
      const { data, error: rpcError } = await supabase.rpc("validate_invite", {
        p_token: token,
      });
      if (rpcError) {
        setError(formatSupabaseAuthError(rpcError.message));
        setValid(false);
        setLoading(false);
        return;
      }
      const payload = data as ValidatePayload;
      if (payload?.valid) {
        setValid(true);
        if (payload.email) {
          setLockedEmail(payload.email);
          setEmail(payload.email);
        }
        sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, token);
      } else {
        setValid(false);
      }
      setLoading(false);
    })();
  }, [token]);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (lockedEmail && trimmed !== lockedEmail.toLowerCase()) {
      setError("Per questo invito devi usare l'email indicata dall'admin.");
      return;
    }
    const redirect =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    const { error: signError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirect },
    });
    if (signError) {
      setError(formatSupabaseAuthError(signError.message));
      return;
    }
    setSent(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-ink-muted">
        Verifica invito…
      </div>
    );
  }

  if (!token || !valid) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Invito non valido
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Il link è scaduto, già usato o non esiste. Chiedi all&apos;admin un
          nuovo invito.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block font-semibold text-sage-dark underline"
        >
          Vai al login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-semibold text-ink">
        Sei invitata al club
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Inserisci la tua email per ricevere il magic link. Dopo il primo accesso
        il profilo viene creato automaticamente.
      </p>

      <form onSubmit={(e) => void handleSendLink(e)} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            disabled={Boolean(lockedEmail)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-card-border bg-card px-3 py-2 text-ink shadow-inner outline-none ring-sage focus:ring-2 disabled:bg-parchment-dark"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-sage px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-dark"
        >
          Invia magic link
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {sent ? (
        <p className="mt-4 text-sm text-ink-muted">
          Controlla la posta e clicca il link. Poi potrai usare il club.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => navigate("/login")}
        className="mt-8 text-sm font-medium text-sage-dark underline"
      >
        Ho già un account — login
      </button>
    </div>
  );
}
