import { Navigate, Outlet, useLocation } from "react-router-dom";

type ProtectedRouteProps = {
  loading: boolean;
  userId: string | null;
};

export function ProtectedRoute({ loading, userId }: ProtectedRouteProps) {
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-ink-muted">
        Caricamento…
      </div>
    );
  }

  if (!userId) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
