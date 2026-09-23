-- A visit is recorded only as part of a successful community photo insert.
-- Existing visits and reviews are preserved.
revoke insert on public.cafe_visits from authenticated;
revoke insert(user_id, cafe_slug) on public.cafe_visits from authenticated;
drop policy if exists cafe_visits_insert_own on public.cafe_visits;

create schema if not exists private;

create function private.record_visit_from_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Staged review photos require a visit already and must not create one.
  if new.review_batch is not null then
    return new;
  end if;

  if auth.uid() is null or auth.uid() <> new.user_id
    or not exists (select 1 from public.cafes c where c.slug = new.cafe_slug and c.is_active)
    or not exists (select 1 from storage.objects o
      where o.bucket_id = 'cafe-community' and o.name = new.path) then
    raise exception 'visit_photo_required' using errcode = '23514';
  end if;

  insert into public.cafe_visits(user_id, cafe_slug)
  values (new.user_id, new.cafe_slug)
  on conflict (user_id, cafe_slug) do nothing;
  return new;
end;
$$;

revoke all on function private.record_visit_from_photo() from public, anon, authenticated;
create trigger record_visit_from_photo
after insert on public.cafe_photos
for each row execute function private.record_visit_from_photo();
