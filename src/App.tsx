import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { supabase } from "./lib/supabase";
import type { Profile } from "./types/database";
import { AdminRoute } from "./components/AdminRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { BookPage } from "./pages/BookPage";
import { LoginPage } from "./pages/LoginPage";
import { InvitePage } from "./pages/InvitePage";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";
import { SurveyPage } from "./pages/SurveyPage";
import { AddBookPage } from "./pages/AddBookPage";
import { EditBookPage } from "./pages/EditBookPage";
import { AdminInvitesPage } from "./pages/AdminInvitesPage";

function App() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Errore profilo:", error);
        setProfile(null);
      } else {
        setProfile(data);
      }

      setProfileLoading(false);
    };

    void fetchProfile();
  }, [user]);

  const gateLoading = authLoading || (Boolean(user) && profileLoading);

  if (gateLoading) return <div>Loading...</div>;

  const isAdmin = Boolean(profile?.is_admin);
  const userId = user?.id ?? null;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />

      <Route
        element={
          <ProtectedRoute loading={gateLoading} userId={userId} />
        }
      >
        <Route
          element={
            <Layout
              profile={profile}
              isAdmin={isAdmin}
              onSignOut={() => void supabase.auth.signOut()}
            />
          }
        >
          <Route path="/" element={<HomePage isAdmin={isAdmin} />} />
          <Route
            path="/profilo/:slug"
            element={<ProfilePage myUserId={userId} />}
          />
          <Route
            path="/sondaggio"
            element={<SurveyPage userId={userId} />}
          />
          <Route
            element={
              <AdminRoute profile={profile} loading={false} />
            }
          >
            <Route path="/libri/nuovo" element={<AddBookPage />} />
            <Route path="/libri/:id/modifica" element={<EditBookPage />} />
            <Route path="/admin/inviti" element={<AdminInvitesPage />} />
          </Route>
          <Route path="/libri/:id" element={<BookPage isAdmin={isAdmin} />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
