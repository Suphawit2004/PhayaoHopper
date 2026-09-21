alter table public.cafe_photos add column review_id uuid references public.reviews(id) on delete set null;
alter table public.cafe_photos add column review_batch uuid;
create index cafe_photos_review_idx on public.cafe_photos(review_id);
revoke insert on public.cafe_photos from authenticated;
grant insert(id,cafe_slug,user_id,path,caption,is_public,review_batch) on public.cafe_photos to authenticated;

create table public.review_coupons (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 cafe_slug text not null references public.cafes(slug),
 review_id uuid references public.reviews(id) on delete set null,
 reward text not null check(reward in ('5_baht','10_percent')),
 issued_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '30 days'),
 used_at timestamptz,
 cancelled_at timestamptz,
 unique(user_id,cafe_slug)
);
create index review_coupons_cafe_idx on public.review_coupons(cafe_slug);
create index review_coupons_review_idx on public.review_coupons(review_id);
alter table public.review_coupons enable row level security;
revoke all on public.review_coupons from anon,authenticated;
grant select on public.review_coupons to authenticated;
create policy coupons_read_own on public.review_coupons for select to authenticated using(user_id=(select auth.uid()));

-- All review creation goes through the transaction below, including direct API clients.
revoke insert,update on public.reviews from anon,authenticated;
drop policy if exists reviews_insert_public on public.reviews;

create or replace function public.submit_review_reward(p_id uuid,p_slug text,p_name text,p_rating integer,p_comment text,p_photos uuid[] default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.reviews; c public.review_coupons; n integer;
begin
 if u is null then raise exception 'not_authenticated'; end if;
 if p_id is null then raise exception 'invalid'; end if;
 -- Serialize requests for this account; retries cannot mint additional rewards.
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select * into r from public.reviews where id=p_id and user_id=u;
 if found then
   select * into c from public.review_coupons where review_id=r.id and user_id=u;
   return jsonb_build_object('review',to_jsonb(r),'coupon',case when c.id is null then null else to_jsonb(c) end);
 end if;
 if not exists(select 1 from public.cafes where slug=p_slug and is_active) then raise exception 'invalid_cafe'; end if;
 perform 1 from public.cafe_visits where user_id=u and cafe_slug=p_slug for share;
 if not found then raise exception 'visit_required'; end if;
 if exists(select 1 from public.reviews where user_id=u and cafe_slug=p_slug) then raise exception 'already_reviewed'; end if;
 if p_name is null or length(trim(p_name)) not between 1 and 60 or p_rating is null or p_rating not between 1 and 5 or length(coalesce(p_comment,''))>500 then raise exception 'invalid'; end if;
 n:=cardinality(p_photos);
 if n is null or n>5 or n<>(select count(distinct x) from unnest(p_photos) x) then raise exception 'invalid_photos'; end if;
 perform 1 from public.cafe_photos where id=any(p_photos) for update;
 if n<>(select count(*) from public.cafe_photos p where p.id=any(p_photos) and p.user_id=u and p.cafe_slug=p_slug and p.review_id is null and p.review_batch=p_id
   and exists(select 1 from storage.objects o where o.bucket_id='cafe-community' and o.name=p.path)) then raise exception 'invalid_photos'; end if;
 insert into public.reviews(id,user_id,cafe_slug,author_name,rating,comment) values(p_id,u,p_slug,trim(p_name),p_rating,nullif(trim(p_comment),'')) returning * into r;
 update public.cafe_photos set review_id=r.id,review_batch=null,is_public=true where id=any(p_photos);
 insert into public.review_coupons(user_id,cafe_slug,review_id,reward) values(u,p_slug,r.id,case when n>=3 then '10_percent' else '5_baht' end)
 on conflict(user_id,cafe_slug) do nothing returning * into c;
 return jsonb_build_object('review',to_jsonb(r),'coupon',case when c.id is null then null else to_jsonb(c) end);
end $$;
revoke all on function public.submit_review_reward(uuid,text,text,integer,text,uuid[]) from public,anon;
grant execute on function public.submit_review_reward(uuid,text,text,integer,text,uuid[]) to authenticated;

create or replace function public.redeem_review_coupon(p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated'; end if;
 update public.review_coupons set used_at=now() where id=p_id and user_id=auth.uid() and used_at is null and cancelled_at is null and expires_at>now();
 return found;
end $$;
revoke all on function public.redeem_review_coupon(uuid) from public,anon;
grant execute on function public.redeem_review_coupon(uuid) to authenticated;

create or replace function private.cancel_review_coupon() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.review_coupons set cancelled_at=now() where review_id=old.id and used_at is null and cancelled_at is null;
 return old;
end $$;
revoke all on function private.cancel_review_coupon() from public,anon,authenticated;
create trigger cancel_coupon_before_review_delete before delete on public.reviews for each row execute function private.cancel_review_coupon();

alter table public.cafe_suggestions add column user_id uuid references auth.users(id) on delete set null;
alter table public.data_reports add column user_id uuid references auth.users(id) on delete set null;
create index cafe_suggestions_user_idx on public.cafe_suggestions(user_id);
create index data_reports_user_idx on public.data_reports(user_id);
revoke insert on public.cafe_suggestions,public.data_reports from anon;
-- Restrictive ownership checks combine with existing validation/admin policies.
create policy suggestions_authenticated_owner on public.cafe_suggestions as restrictive for insert to public with check(auth.uid() is not null and user_id=auth.uid());
create policy reports_authenticated_owner on public.data_reports as restrictive for insert to public with check(auth.uid() is not null and user_id=auth.uid());
