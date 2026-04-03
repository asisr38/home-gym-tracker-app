import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      console.warn("[IronStride:auth] supabase is null — skipping session load");
      setLoading(false);
      return;
    }

    console.log("[IronStride:auth] loading initial session...");
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("[IronStride:auth] getSession error", error.message, error);
      } else {
        console.log("[IronStride:auth] session loaded", { hasUser: Boolean(session?.user), userId: session?.user?.id ?? null });
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[IronStride:auth] state change", { event, userId: session?.user?.id ?? null });
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signOutUser: () => supabase ? supabase.auth.signOut().then(() => undefined) : Promise.resolve(),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export async function getAuthToken() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
