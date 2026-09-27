"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<{ userId: string; admin: boolean; owner: boolean } | null>(null);
  // No Supabase env → nothing to wait for; start with loading=false.
  const [loading, setLoading] = useState(() => getSupabaseBrowser() !== null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let mounted = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (mounted) {
          setUser(data.user ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        // Never strand the app in loading=true on a network failure.
        if (mounted) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb || !user) return;
    let active = true;
    const userId = user.id;
    const refresh = async () => {
      try {
        const [admin, owners] = await Promise.all([
          sb.rpc("is_admin"),
          sb.from("cafe_owners").select("cafe_slug").eq("user_id", userId).limit(1),
        ]);
        if (active) setAccess({ userId, admin: !admin.error && admin.data === true, owner: !owners.error && !!owners.data?.length });
      } catch { if (active) setAccess({ userId, admin: false, owner: false }); }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: !!user && access?.userId === user.id && access.admin,
      isOwner: !!user && access?.userId === user.id && (access.owner || access.admin),
      signOut: async () => {
        const result = await getSupabaseBrowser()?.auth.signOut();
        if (result?.error) throw result.error;
        setUser(null);
      },
    }),
    [user, loading, access]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
