const LS_KEY = "tnl-favs";
const MAX_SLUG_LENGTH = 100;

export function readLocalFavs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const slugs = parsed.filter(
      (v): v is string => typeof v === "string" && v.length > 0 && v.length <= MAX_SLUG_LENGTH
    );
    // Dedupe: duplicates would produce duplicate cards/keys and a failing upsert.
    return [...new Set(slugs)].slice(0, 200);
  } catch {
    return [];
  }
}

export function writeLocalFavs(slugs: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(slugs.slice(0, 200)));
  } catch {
    // Storage can be disabled or full. Keep the in-memory UI usable.
  }
}

/** Keep unsynced guest entries until both the merge and server read succeed. */
export function reconcileFavorites(local: string[], server: string[], merged: boolean): string[] {
  if (!merged) return [...new Set([...server, ...local])];
  if (local.length > 0) writeLocalFavs([]);
  return server;
}
