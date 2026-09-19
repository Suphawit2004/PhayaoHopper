create table public.cafe_visits (
  user_id uuid not null references auth.users(id) on delete cascade,
  cafe_slug text not null references public.cafes(slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cafe_slug)
);
create index cafe_visits_cafe_slug_idx on public.cafe_visits(cafe_slug);
create index cafe_visits_user_created_idx on public.cafe_visits(user_id, created_at desc, cafe_slug);

alter table public.cafe_visits enable row level security;
revoke all on public.cafe_visits from anon, authenticated;
grant select on public.cafe_visits to authenticated;
grant insert(user_id, cafe_slug) on public.cafe_visits to authenticated;

create policy cafe_visits_read_own on public.cafe_visits
  for select to authenticated using ((select auth.uid()) = user_id);
create policy cafe_visits_insert_own on public.cafe_visits
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.cafes c where c.slug = cafe_slug and c.is_active)
  );
