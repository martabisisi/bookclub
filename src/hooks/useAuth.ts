import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { PENDING_INVITE_TOKEN_KEY, supabase } from "@/lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const token = sessionStorage.getItem(PENDING_INVITE_TOKEN_KEY);
    if (!token) return;

    void (async () => {
      const { error } = await supabase.rpc("consume_invite", {
        p_token: token,
      });
      if (!error) {
        sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
      }
    })();
  }, [session?.user]);

  return { session, user, loading };
}
