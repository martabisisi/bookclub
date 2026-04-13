import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmailPasswordAuthForm } from "@/components/EmailPasswordAuthForm";
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
        setValid(false);
        setLoading(false);
        return;
      }
      const payload = data as ValidatePayload;
      if (payload?.valid) {
        setValid(true);
        if (payload.email) {
          setLockedEmail(payload.email);
        }
        sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, token);
      } else {
        setValid(false);
      }
      setLoading(false);
    })();
  }, [token]);

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
          Il link è scaduto, già usato o non esiste. Puoi comunque registrarti
          dalla pagina di login.
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
        Crea un account con email e password (o accedi se ne hai già uno).
        Dopo l’accesso l’invito viene applicato automaticamente.
      </p>

      <div className="mt-8">
        <EmailPasswordAuthForm
          lockedEmail={lockedEmail}
          defaultMode="signup"
          onAuthenticated={() => navigate("/", { replace: true })}
          submitLabelSignin="Entra nel club"
          submitLabelSignup="Registrati e entra nel club"
        />
      </div>

      <button
        type="button"
        onClick={() => navigate("/login")}
        className="mt-8 text-sm font-medium text-sage-dark underline"
      >
        Vai al login normale
      </button>
    </div>
  );
}
