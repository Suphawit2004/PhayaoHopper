import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const db = new PGlite();
const member = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
async function asUser(id: string, role = "authenticated") {
  await db.exec(`reset role; set role ${role}; select set_config('request.jwt.claim.sub','${id}',false);`);
}
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    create table public.cafes(slug text primary key, is_active boolean not null default true);
    grant select on public.cafes to authenticated;
    insert into auth.users values ('${member}'),('${other}');
    insert into cafes values ('active-cafe',true),('hidden-cafe',false);
  `);
  await db.exec(readFileSync('supabase/migrations/20260919170131_cafe_visits.sql','utf8'));
}, 30000);
afterAll(() => db.close());

describe("private cafe visit history", () => {
  it("rejects guests", async () => {
    await asUser('', 'anon');
    await expect(db.query('select * from cafe_visits')).rejects.toThrow();
    await expect(db.exec(`insert into cafe_visits(user_id,cafe_slug) values ('${member}','active-cafe')`)).rejects.toThrow();
  });
  it("persists an owned visit and keeps its timestamp on duplicate saves", async () => {
    await asUser(member);
    await db.exec(`insert into cafe_visits(user_id,cafe_slug) values ('${member}','active-cafe') on conflict(user_id,cafe_slug) do nothing`);
    const first = await db.query('select cafe_slug,created_at from cafe_visits');
    await db.exec(`insert into cafe_visits(user_id,cafe_slug) values ('${member}','active-cafe') on conflict(user_id,cafe_slug) do nothing`);
    expect((await db.query('select cafe_slug,created_at from cafe_visits')).rows).toEqual(first.rows);
    expect(first.rows).toHaveLength(1);
  });
  it("does not expose visits to a different account or permit impersonation", async () => {
    await asUser(other);
    expect((await db.query('select * from cafe_visits')).rows).toHaveLength(0);
    await expect(db.exec(`insert into cafe_visits(user_id,cafe_slug) values ('${member}','active-cafe') on conflict do nothing`)).rejects.toThrow();
  });
  it("rejects missing cafes and inactive cafes", async () => {
    await asUser(member);
    for (const slug of ['missing-cafe','hidden-cafe']) {
      await expect(db.exec(`insert into cafe_visits(user_id,cafe_slug) values ('${member}','${slug}')`)).rejects.toThrow();
    }
  });
  it("does not permit changing ownership, timestamps, or deleting history", async () => {
    await asUser(member);
    await expect(db.exec(`update cafe_visits set user_id='${other}'`)).rejects.toThrow();
    await expect(db.exec(`delete from cafe_visits`)).rejects.toThrow();
    await expect(db.exec(`insert into cafe_visits(user_id,cafe_slug,created_at) values ('${member}','active-cafe','2000-01-01') on conflict do nothing`)).rejects.toThrow();
  });
});
