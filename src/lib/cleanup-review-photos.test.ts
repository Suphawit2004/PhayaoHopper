import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanupAbandonedReviewPhotos } from "./cleanup-review-photos";

function client(rows: { id: string; path: string }[], storageError: { message: string } | null = null) {
  const calls: string[] = [];
  let remaining = rows;
  const selectQuery = {
    select: vi.fn(() => selectQuery), not: vi.fn(() => selectQuery), is: vi.fn(() => selectQuery),
    lt: vi.fn(() => selectQuery), order: vi.fn(() => selectQuery), limit: vi.fn(async () => ({ data: remaining, error: null })),
  };
  const deleteQuery = {
    delete: vi.fn(() => deleteQuery),
    in: vi.fn(() => deleteQuery), not: vi.fn(() => deleteQuery), is: vi.fn(() => deleteQuery), lt: vi.fn(() => deleteQuery),
    select: vi.fn(async () => { const deleted = remaining; remaining = []; calls.push("database"); return { data: deleted, error: null }; }),
  };
  const storage = { from: vi.fn(() => ({ remove: vi.fn(async (paths: string[]) => { calls.push(`storage:${paths.join(",")}`); return { error: storageError }; }) })) };
  const sb = { from: vi.fn((table: string) => { expect(table).toBe("cafe_photos"); return { select: () => selectQuery, delete: () => deleteQuery }; }), storage } as unknown as SupabaseClient;
  return { sb, calls, selectQuery, deleteQuery, storage };
}

describe("cleanupAbandonedReviewPhotos", () => {
  it("removes objects before deleting only staged, unlinked rows older than cutoff", async () => {
    const mock = client([{ id: "1", path: "u/old.jpg" }]);
    await expect(cleanupAbandonedReviewPhotos(mock.sb, new Date("2026-01-01T00:00:00Z"))).resolves.toEqual({ removedPhotos: 1 });
    expect(mock.calls).toEqual(["storage:u/old.jpg", "database"]);
    expect(mock.selectQuery.not).toHaveBeenCalledWith("review_batch", "is", null);
    expect(mock.selectQuery.is).toHaveBeenCalledWith("review_id", null);
    expect(mock.selectQuery.lt).toHaveBeenCalledWith("created_at", "2026-01-01T00:00:00.000Z");
  });
  it("keeps rows when Storage removal fails so a later run can retry", async () => {
    const mock = client([{ id: "1", path: "u/old.jpg" }], { message: "storage down" });
    await expect(cleanupAbandonedReviewPhotos(mock.sb, new Date())).rejects.toThrow("Could not remove staged review photo files");
    expect(mock.calls).toEqual(["storage:u/old.jpg"]);
    expect(mock.deleteQuery.select).not.toHaveBeenCalled();
  });
  it("does nothing when no expired staged photos exist", async () => {
    const mock = client([]);
    await expect(cleanupAbandonedReviewPhotos(mock.sb, new Date())).resolves.toEqual({ removedPhotos: 0 });
    expect(mock.storage.from).not.toHaveBeenCalled();
  });
  it("is safe to run repeatedly after the expired rows are gone", async () => {
    const mock = client([{ id: "1", path: "u/old.jpg" }]);
    await expect(cleanupAbandonedReviewPhotos(mock.sb, new Date())).resolves.toEqual({ removedPhotos: 1 });
    await expect(cleanupAbandonedReviewPhotos(mock.sb, new Date())).resolves.toEqual({ removedPhotos: 0 });
    expect(mock.calls).toEqual(["storage:u/old.jpg", "database"]);
  });
});
