"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase-server";
import { validateImageUpload } from "@/lib/image-upload-validation";
import type { ProfileRow } from "@/lib/types";

export type ProfileUpdateResult =
  | { ok: true; profile: ProfileRow }
  | { ok: false; reason: "not_signed_in" | "invalid_name" | "invalid_image" | "storage_error" | "database_error" };

export async function updateMyProfile(form: FormData): Promise<ProfileUpdateResult> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!supabase || !user) return { ok: false, reason: "not_signed_in" };

  const displayName = String(form.get("displayName") ?? "").trim();
  if (!displayName || displayName.length > 60) return { ok: false, reason: "invalid_name" };

  const avatarEntry = form.get("avatar");
  const hasAvatar = avatarEntry instanceof File && avatarEntry.size > 0;
  if (avatarEntry && !(avatarEntry instanceof File)) return { ok: false, reason: "invalid_image" };

  const { data: current, error: currentError } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (currentError) return { ok: false, reason: "database_error" };

  let avatarUrl = current?.avatar_url ?? null;
  let newPath: string | null = null;
  if (hasAvatar) {
    const file = avatarEntry as File;
    const image = await validateImageUpload(file);
    if (!image) return { ok: false, reason: "invalid_image" };
    newPath = `${user.id}/${crypto.randomUUID()}.${image.extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(newPath, file, {
      contentType: image.contentType,
      upsert: false,
    });
    if (uploadError) return { ok: false, reason: "storage_error" };
    avatarUrl = supabase.storage.from("avatars").getPublicUrl(newPath).data.publicUrl;
  }

  const { data: saved, error: saveError } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: displayName, avatar_url: avatarUrl }, { onConflict: "id" })
    .select("id, display_name, avatar_url")
    .single();

  if (saveError || !saved) {
    if (newPath) await supabase.storage.from("avatars").remove([newPath]);
    return { ok: false, reason: "database_error" };
  }

  if (newPath && current?.avatar_url) {
    const oldPath = ownAvatarPath(current.avatar_url, user.id);
    if (oldPath && oldPath !== newPath) await supabase.storage.from("avatars").remove([oldPath]);
  }

  revalidatePath("/");
  return { ok: true, profile: saved as ProfileRow };
}

function ownAvatarPath(publicUrl: string, userId: string): string | null {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) return null;
  try {
    const base = new URL(configuredUrl);
    const avatar = new URL(publicUrl);
    const prefix = "/storage/v1/object/public/avatars/";
    if (avatar.origin !== base.origin || !avatar.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(avatar.pathname.slice(prefix.length));
    if (!path.startsWith(`${userId}/`) || path.split("/").some(part => !part || part === "." || part === "..")) return null;
    return path;
  } catch {
    return null;
  }
}
