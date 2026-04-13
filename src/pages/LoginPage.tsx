import { useLocation, useNavigate } from "react-router-dom";
import { EmailPasswordAuthForm } from "@/components/EmailPasswordAuthForm";

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="font-display text-3xl font-semibold text-ink">
        Bentornata
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Accedi con email e password, oppure crea un nuovo account per il club:
        non serve invito.
      </p>

      <div className="mt-8">
        <EmailPasswordAuthForm
          defaultMode="signin"
          onAuthenticated={() => navigate(from, { replace: true })}
        />
      </div>
    </div>
  );
}
