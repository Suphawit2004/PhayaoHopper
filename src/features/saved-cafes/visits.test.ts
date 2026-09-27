import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const db = new PGlite();
const member = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
async function asUser(id: string, role = "authenticated") {
  await db.exec(`reset role; set role ${role}; select set_config('request.jwt.claim.sub','${id}',false);`);
}
async function postPhoto(path: string, slug = "active-cafe", user = member, batch?: string) {
  await db.query("insert into storage.objects(bucket_id,name) values ('cafe-community',$1)", [path]);
  await db.query("insert into cafe_photos(user_id,cafe_slug,path,review_batch) values ($1,$2,$3,$4)", [user, slug, path, batch ?? null]);
}

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth, storage to authenticated;
    create table public.cafes(slug text primary key, is_active boolean not null default true);
    grant select on public.cafes to authenticated;
    create table storage.objects(bucket_id text, name text);
    grant insert on storage.objects to authenticated;
    create table public.cafe_photos(user_id uuid, cafe_slug text, path text, review_batch uuid, is_public boolean default true);
    grant insert on public.cafe_photos to authenticated;
    insert into auth.users values ('${member}'),('${other}');
    insert into cafes values ('active-cafe',true),('hidden-cafe',false);
  `);
  await db.exec(readFileSync('supabase/migrations/20260919170131_cafe_visits.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260920115529_cafe_visits_remove_own.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260923040141_require_photo_for_visit.sql','utf8'));
}, 30000);
afterAll(() => db.close());

describe("photo-backed cafe visit history", () => {
  it("blocks guests and direct visit inserts", async () => {
    await asUser("", "anon");
    await expect(db.query("select * from cafe_visits")).rejects.toThrow();
    await asUser(member);
    await expect(db.exec(`insert into cafe_visits(user_id,cafe_slug) values ('${member}','active-cafe')`)).rejects.toThrow();
  });
  it("does not record a visit without a stored photo or for a hidden cafe", async () => {
    await asUser(member);
    await expect(db.exec(`insert into cafe_photos(user_id,cafe_slug,path) values ('${member}','active-cafe','${member}/missing.jpg')`)).rejects.toThrow("visit_photo_required");
    await expect(postPhoto(`${member}/hidden.jpg`, "hidden-cafe")).rejects.toThrow("visit_photo_required");
    expect((await db.query("select * from cafe_visits")).rows).toHaveLength(0);
  });
  it("ignores staged review photos and rejects another user's photo", async () => {
    await asUser(member);
    await postPhoto(`${member}/staged.jpg`, "active-cafe", member, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect((await db.query("select * from cafe_visits")).rows).toHaveLength(0);
    await expect(postPhoto(`${other}/foreign.jpg`, "active-cafe", other)).rejects.toThrow("visit_photo_required");
  });
  it("records one visit after successful photo inserts and keeps its timestamp", async () => {
    await asUser(member);
    await postPhoto(`${member}/first.jpg`);
    const first = (await db.query("select cafe_slug,created_at from cafe_visits")).rows;
    expect(first).toHaveLength(1);
    await postPhoto(`${member}/second.jpg`);
    expect((await db.query("select cafe_slug,created_at from cafe_visits")).rows).toEqual(first);
    await asUser(other);
    expect((await db.query("select * from cafe_visits")).rows).toHaveLength(0);
  });
  it("lets the owner remove a visit and requires another photo to restore it", async () => {
    await asUser(other);
    expect((await db.query(`delete from cafe_visits where user_id='${member}' returning cafe_slug`)).rows).toHaveLength(0);
    await asUser(member);
    expect((await db.query("delete from cafe_visits returning cafe_slug")).rows).toHaveLength(1);
    await expect(db.exec(`insert into cafe_visits(user_id,cafe_slug) values ('${member}','active-cafe')`)).rejects.toThrow();
    await postPhoto(`${member}/again.jpg`);
    expect((await db.query("select * from cafe_visits")).rows).toHaveLength(1);
  });
});
