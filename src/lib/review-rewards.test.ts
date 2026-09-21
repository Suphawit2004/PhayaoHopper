import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, it, expect } from 'vitest';
const db=new PGlite();
const user='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
const id=(n:number)=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12,'0')}`;
async function asUser(uid=user,role='authenticated') {await db.exec(`reset role; set role ${role}; select set_config('request.jwt.claim.sub','${uid}',false);`);}
async function review(n:number,slug='baan-baann',photos:string[]=[]) {
 const result=await db.query<{result:{review:{id:string};coupon:{id:string;reward:string;issued_at:string;expires_at:string}|null}}>('select submit_review_reward($1,$2,$3,$4,$5,$6::uuid[]) as result',[id(n),slug,'Test reviewer',5,'Review',photos]);return result.rows[0].result;
}
async function visit(slug='baan-baann') { await db.query('insert into cafe_visits(user_id,cafe_slug) values ($1,$2) on conflict do nothing',[user,slug]); }
async function stage(n:number,batch:number,slug='baan-baann',uid=user,object=true) {
 await db.query('insert into cafe_photos(id,user_id,cafe_slug,path,review_batch) values ($1,$2,$3,$4,$5)',[id(n),uid,slug,`${uid}/${n}.jpg`,id(batch)]);
 if(object) await db.query("insert into storage.objects(bucket_id,name) values ('cafe-community',$1)",[`${uid}/${n}.jpg`]);
 return id(n);
}
beforeAll(async()=>{
await db.exec(`
create role anon; create role authenticated;
create schema auth; create schema storage;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.email() returns text language sql stable as $$ select current_setting('request.jwt.claim.email',true) $$;
create function auth.jwt() returns jsonb language sql stable as $$ select json_build_object('email', current_setting('request.jwt.claim.email',true), 'sub', current_setting('request.jwt.claim.sub',true))::jsonb $$;
create function auth.role() returns text language sql stable as $$ select current_user::text $$;
grant usage on schema auth, storage to anon, authenticated;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, metadata jsonb, owner_id text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;
grant select,insert,update,delete on storage.objects to anon,authenticated;
`);
await db.exec(readFileSync('supabase/schema.sql','utf8').replace('create extension if not exists pgcrypto;',''));
await db.exec(readFileSync('supabase/migrations/20260825000000_profile_avatar_and_review_deletion.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20260907083438_complete_cafe_features.sql','utf8'));

await db.exec(readFileSync('supabase/migrations/20260919170131_cafe_visits.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20260920115529_cafe_visits_remove_own.sql','utf8'));
await db.exec(`insert into auth.users(id,email) values ('${user}','test@example.test'),('${other}','other@example.test'); insert into reviews(id,user_id,cafe_slug,author_name,rating) values ('${id(99)}','${other}','baan-baann','Legacy',4)`);
await db.exec(readFileSync('supabase/migrations/20260921114634_review_rewards.sql','utf8'));
},30000);
afterAll(()=>db.close());
it('preserves old reviews without retroactive coupons',async()=>{
 expect((await db.query('select * from reviews')).rows).toHaveLength(1);
 expect((await db.query('select * from review_coupons')).rows).toHaveLength(0);
});
it('blocks guests, direct table insert and members without a visit',async()=>{
 await asUser('','anon'); await expect(review(1)).rejects.toThrow();
 await expect(db.exec("insert into reviews(cafe_slug,author_name,rating) values ('baan-baann','Guest',5)")).rejects.toThrow();
 await asUser(); await expect(review(1)).rejects.toThrow('visit_required');
 await expect(db.exec(`insert into reviews(user_id,cafe_slug,author_name,rating) values ('${user}','baan-baann','Bypass',5)`)).rejects.toThrow();
});
it('atomically issues a 5-baht 30-day coupon and handles retries',async()=>{
 await visit(); const first=await review(1); expect(first.coupon?.reward).toBe('5_baht');
 expect(Date.parse(first.coupon!.expires_at)-Date.parse(first.coupon!.issued_at)).toBe(30*86400000);
 expect(await review(1)).toEqual(first);
 await expect(review(2)).rejects.toThrow('already_reviewed');
 expect((await db.query('select * from review_coupons')).rows).toHaveLength(1);
});
it('rejects foreign redemption and only one of competing redemption requests succeeds',async()=>{
 const coupon=(await review(1)).coupon!.id;
 await asUser(other); expect((await db.query('select * from review_coupons')).rows).toHaveLength(0);
 expect((await db.query<{ok:boolean}>('select redeem_review_coupon($1) ok',[coupon])).rows[0].ok).toBe(false);
 await asUser(); const results=await Promise.all([db.query<{ok:boolean}>('select redeem_review_coupon($1) ok',[coupon]),db.query<{ok:boolean}>('select redeem_review_coupon($1) ok',[coupon])]);
 expect(results.map(r=>r.rows[0].ok).sort()).toEqual([false,true]);
 await expect(db.exec('update review_coupons set used_at=null')).rejects.toThrow();
 await expect(db.exec('delete from review_coupons')).rejects.toThrow();
});
it('removing a visit retains review; deleting and recreating cannot earn again',async()=>{
 await db.exec('delete from cafe_visits'); expect((await db.query('select * from reviews where user_id=$1',[user])).rows).toHaveLength(1);
 await db.query('delete from reviews where id=$1',[id(1)]); await visit(); expect((await review(2)).coupon).toBeNull();
 const old=(await db.query<{used_at:string;review_id:null}>('select * from review_coupons')).rows[0];expect(old.used_at).toBeTruthy();expect(old.review_id).toBeNull();
});
it('rejects incomplete, duplicated, excessive and foreign photos without inserting review or coupon',async()=>{
 const slug=(await db.query<{slug:string}>("select slug from cafes where slug<>'baan-baann' order by slug limit 1")).rows[0].slug;
 await visit(slug); await stage(10,3,slug,user,false);
 await expect(review(3,slug,[id(10)])).rejects.toThrow('invalid_photos');
 await db.query("insert into storage.objects(bucket_id,name) values ('cafe-community',$1)",[`${user}/10.jpg`]);
 await expect(review(3,slug,[id(10),id(10)])).rejects.toThrow('invalid_photos');
 await expect(review(3,slug,Array.from({length:6},(_,i)=>id(10+i)))).rejects.toThrow('invalid_photos');
 await asUser(other); await stage(11,3,slug,other); await asUser(); await expect(review(3,slug,[id(11)])).rejects.toThrow('invalid_photos');
 await expect(review(3,slug,[id(999)])).rejects.toThrow('invalid_photos');
 expect((await db.query('select * from reviews where id=$1',[id(3)])).rows).toHaveLength(0);
 await stage(12,3,slug); await stage(13,3,slug);
 const result=await review(3,slug,[id(10),id(12),id(13)]); expect(result.coupon?.reward).toBe('10_percent');
 expect((await db.query('select * from cafe_photos where review_id=$1 and is_public and review_batch is null',[id(3)])).rows).toHaveLength(3);
 await asUser('','anon');expect((await db.query('select * from cafe_photos where review_id=$1',[id(3)])).rows).toHaveLength(3);
 await asUser(); await db.query('delete from reviews where id=$1',[id(3)]);
 const coupon=(await db.query<{id:string;cancelled_at:string}>('select * from review_coupons where id=$1',[result.coupon!.id])).rows[0]; expect(coupon.cancelled_at).toBeTruthy();
 expect((await db.query<{ok:boolean}>('select redeem_review_coupon($1) ok',[coupon.id])).rows[0].ok).toBe(false);
 expect((await review(4,slug)).coupon).toBeNull();
});
it('one or two photos still give 5 baht; expiry uses server time',async()=>{
 const slugs=(await db.query<{slug:string}>("select slug from cafes where slug not in (select cafe_slug from review_coupons) order by slug limit 2")).rows.map(x=>x.slug);
 for(let i=0;i<2;i++) {
  await visit(slugs[i]); const photoIds=[]; for(let j=0;j<=i;j++) photoIds.push(await stage(20+i*2+j,5+i,slugs[i]));
  const result=await review(5+i,slugs[i],photoIds); expect(result.coupon?.reward).toBe('5_baht');
  await db.exec('reset role'); await db.query("update review_coupons set expires_at=now()-interval '1 second' where id=$1",[result.coupon!.id]); await asUser();
  expect((await db.query<{ok:boolean}>('select redeem_review_coupon($1) ok',[result.coupon!.id])).rows[0].ok).toBe(false);
 }
});
it('requires owned accounts for suggestions and reports, even direct API inserts',async()=>{
 const suggestion="insert into cafe_suggestions(name,lat,lng,user_id) values ('Test',19.17,99.9,$1)";
 const report="insert into data_reports(cafe_slug,field,message,user_id) values ('baan-baann','hours','Correction',$1)";
 for(const sql of [suggestion,report]) {
  await asUser('','anon');await expect(db.query(sql,[user])).rejects.toThrow();
  await asUser();await expect(db.query(sql,[other])).rejects.toThrow();await expect(db.query(sql,[null])).rejects.toThrow();await db.query(sql,[user]);
 }
});
