import { NavLink, Outlet } from "react-router-dom";
import type { Profile } from "@/types/database";

type LayoutProps = {
  profile: Profile | null;
  isAdmin: boolean;
  onSignOut: () => void;
};

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors duration-150",
    isActive
      ? "bg-sage/15 text-sage-dark shadow-sm"
      : "text-ink-muted hover:bg-sage/10 hover:text-sage-dark",
  ].join(" ");
}

export function Layout({ profile, isAdmin, onSignOut }: LayoutProps) {
  return (
    <div className="min-h-screen bg-parchment font-sans text-ink">
      <header className="sticky top-0 z-50 border-b border-sage/80 bg-card shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <NavLink
              to="/"
              end
              className="font-display text-xl font-semibold tracking-tight text-sage-dark decoration-transparent transition hover:text-sage"
            >
              KeepOn Book club
            </NavLink>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <nav
                className="flex flex-wrap items-center gap-x-1 gap-y-1.5 sm:gap-x-0.5"
                aria-label="Navigazione principale"
              >
                <NavLink to="/" end className={navLinkClass}>
                  Home
                </NavLink>
                {profile?.slug ? (
                  <NavLink
                    to={`/profilo/${profile.slug}`}
                    className={navLinkClass}
                  >
                    Profilo
                  </NavLink>
                ) : null}
                <NavLink to="/sondaggio" className={navLinkClass}>
                  Sondaggio
                </NavLink>
                {isAdmin ? (
                  <>
                    <NavLink to="/libri/nuovo" className={navLinkClass}>
                      Nuovo libro
                    </NavLink>
                    <NavLink to="/admin/inviti" className={navLinkClass}>
                      Inviti
                    </NavLink>
                  </>
                ) : null}
              </nav>

              <button
                type="button"
                onClick={onSignOut}
                className="shrink-0 rounded-md border border-sage/40 bg-card/80 px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:border-sage hover:bg-sage/10 hover:text-sage-dark"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-parchment-dark/60 py-5 text-center text-xs text-ink-muted">
        <p className="mx-auto max-w-4xl px-4 font-display text-ink/70">
          KeepOn Book club
        </p>
      </footer>
    </div>
  );
}
