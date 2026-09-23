import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ signedIn: false }));
vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServer: async () => ({
    auth: { getUser: async () => ({ data: { user: state.signedIn ? { id: "member" } : null } }) },
  }),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/components/CafeCommunity", () => ({ MyPhotos: () => null }));

import PhotosPage from "./page";

beforeEach(() => { state.signedIn = false; });

describe("My photos page access", () => {
  it("sends guests to sign in and back to the gallery", async () => {
    await expect(PhotosPage()).rejects.toThrow("redirect:/login?next=/photos");
  });

  it("renders the gallery for the authenticated member", async () => {
    state.signedIn = true;
    const page = await PhotosPage();
    expect(page).toHaveProperty("type", "div");
  });
});
