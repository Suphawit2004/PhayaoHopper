"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { readLocalFavs, writeLocalFavs, reconcileFavorites } from "@/lib/favorites";
import { useAuth } from "./AuthProvider";

interface FavoritesContextValue {
  slugs: string[];
  ready: boolean;
  has: (slug: string) => boolean;
  toggle: (slug: string) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

interface FavRow {
  cafe_slug: string;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  // Load favourites whenever the auth state settles.
  // Keyed on user.id (not the user object) so token refreshes don't refetch.
  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    async function sync(nextUserId: string | null) {
      const supabase = getSupabaseBrowser();

      // Guest mode (or DB not configured): localStorage only.
      if (!supabase || !nextUserId) {
        setSlugs(readLocalFavs());
        setReady(true);
        return;
      }

      // One-time merge of guest favourites into the database after login.
      const local = readLocalFavs();
      let merged = local.length === 0;
      if (local.length > 0) {
        const { error } = await supabase.from("favorites").upsert(
          local.map((cafe_slug) => ({ user_id: nextUserId, cafe_slug })),
          { onConflict: "user_id,cafe_slug", ignoreDuplicates: true }
        );
        merged = !error;
        if (error) {
          // Keep the guest list intact — it will be retried on next login.
          console.error("favorites merge failed:", error);
        }
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("cafe_slug")
        .eq("user_id", nextUserId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error || !data) {
        console.error("favorites fetch failed:", error);
        // Server list unavailable: show whatever we have locally instead of
        // pretending the account has no favourites.
        setSlugs(readLocalFavs());
      } else {
        setSlugs(reconcileFavorites(local, data.map((row: FavRow) => row.cafe_slug), merged));
      }
      setReady(true);
    }

    sync(userId).catch(() => {
      // Network/DB failure — fall back to whatever we can show.
      if (!cancelled) {
        setSlugs(userId ? readLocalFavs() : []);
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId, loading]);

  const toggle = useCallback(
    async (slug: string) => {
      const exists = slugs.includes(slug);
      const next = exists ? slugs.filter((s) => s !== slug) : [slug, ...slugs];

      // Optimistic update
      setSlugs(next);

      const supabase = getSupabaseBrowser();
      if (!supabase || !user) {
        writeLocalFavs(next); // guest persistence
        return true;
      }

      // Roll back just this slug instead of restoring a stale snapshot, so a
      // failed toggle can't undo an unrelated toggle that happened meanwhile.
      const rollback = () => {
        console.error(`${exists ? "unfavorite" : "favorite"} failed`);
        setSlugs((prev) =>
          exists ? (prev.includes(slug) ? prev : [slug, ...prev]) : prev.filter((s) => s !== slug)
        );
      };

      try {
        const { error } = exists
          ? await supabase.from("favorites").delete().eq("user_id", user.id).eq("cafe_slug", slug)
          : await supabase.from("favorites").upsert({ user_id: user.id, cafe_slug: slug });
        if (error) { rollback(); return false; }
        return true;
      } catch {
        rollback();
        return false;
      }
    },
    [slugs, user]
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      slugs,
      ready,
      has: (slug: string) => slugs.includes(slug),
      toggle,
    }),
    [slugs, ready, toggle]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
