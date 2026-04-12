import { Navigate, Outlet } from "react-router-dom";
import type { Profile } from "@/types/database";

type AdminRouteProps = {
  profile: Profile | null;
  loading: boolean;
};

export function AdminRoute({ profile, loading }: AdminRouteProps) {
  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-ink-muted">
        Caricamento…
      </div>
    );
  }

  if (!profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
