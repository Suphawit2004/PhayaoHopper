"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { ProfileRow } from "@/lib/types";
import { useAuth } from "@/features/account/AuthProvider";

/**
 * Shared profile state for the signed-in user (display_name, avatar_url).
 * `updateProfile` persists via upsert (also recreates the row if the signup
 * trigger never ran for legacy accounts) and keeps local state in sync.
 */
export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // Row is tagged with the user it was fetched for, so switching accounts
  // instantly hides stale data without a synchronous state reset.
  const [row, setRow] = useState<{ userId: string; profile: ProfileRow } | null>(null);
  const profile = row && row.userId === userId ? row.profile : null;

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let cancelled = false;
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setRow({ userId, profile: data as ProfileRow });
      });
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; profile: ProfileRow }>).detail;
      if (detail.userId === userId) setRow(detail);
    };
    window.addEventListener("profile-updated", onUpdate);
    return () => {
      window.removeEventListener("profile-updated", onUpdate);
      cancelled = true;
    };
  }, [userId]);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<ProfileRow, "display_name" | "avatar_url">>) => {
      const supabase = getSupabaseBrowser();
      if (!supabase || !userId) return false;
      try {
      const { data: saved, error } = await supabase.from("profiles").upsert({
        id: userId,
        ...patch,
      }).select("id, display_name, avatar_url").single();
      if (error || !saved) {
        console.error("profile update failed:", error);
        return false;
      }
      setRow({ userId, profile: saved as ProfileRow });
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: { userId, profile: saved } }));
      return true;
      } catch { return false; }
    },
    [userId]
  );

  return { profile, updateProfile };
}
