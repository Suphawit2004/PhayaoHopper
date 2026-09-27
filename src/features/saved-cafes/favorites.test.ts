import { afterEach, describe, expect, it, vi } from "vitest";
import { readLocalFavs, reconcileFavorites, writeLocalFavs } from "@/features/saved-cafes/favorites";

afterEach(() => vi.unstubAllGlobals());

function storage(initial: string[]) {
  let value = JSON.stringify(initial);
  const localStorage = {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => { value = next; }),
  };
  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

describe("favorite persistence", () => {
  it("retains guest favorites when merge fails but the server read succeeds", () => {
    const localStorage = storage(["guest", "shared"]);
    expect(reconcileFavorites(readLocalFavs(), ["account", "shared"], false))
      .toEqual(["account", "shared", "guest"]);
    expect(readLocalFavs()).toEqual(["guest", "shared"]);
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it("clears guest storage after a successful merge and read", () => {
    storage(["guest"]);
    expect(reconcileFavorites(readLocalFavs(), ["guest", "account"], true))
      .toEqual(["guest", "account"]);
    expect(readLocalFavs()).toEqual([]);
  });

  it("does not throw when the storage quota is exhausted", () => {
    const localStorage = storage([]);
    localStorage.setItem.mockImplementation(() => { throw new Error("QuotaExceededError"); });
    expect(() => writeLocalFavs(["guest"])).not.toThrow();
  });

  it("does not throw when access to localStorage is blocked", () => {
    vi.stubGlobal("window", { get localStorage() { throw new Error("SecurityError"); } });
    expect(readLocalFavs()).toEqual([]);
    expect(() => writeLocalFavs(["guest"])).not.toThrow();
  });

  it("deduplicates and rejects malformed stored entries", () => {
    const localStorage = storage([]);
    localStorage.getItem.mockReturnValue(JSON.stringify(["cafe", "cafe", "", 42, null, "x".repeat(101)]));
    expect(readLocalFavs()).toEqual(["cafe"]);
  });
});
