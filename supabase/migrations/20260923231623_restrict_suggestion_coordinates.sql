-- Restrict new suggestions through the database API while keeping older pending
-- suggestions available for an administrator to correct or reject.
drop policy if exists suggestions_supported_coordinates on public.cafe_suggestions;
create policy suggestions_supported_coordinates on public.cafe_suggestions
  as restrictive for insert to public
  with check (lat between 19 and 20 and lng between 99.6 and 100.2);

-- Keep the publication boundary explicit even for direct RPC callers.
create or replace function public.publish_cafe_suggestion(suggestion_id uuid) returns text
language plpgsql security invoker set search_path = '' as $$
declare s public.cafe_suggestions; new_slug text;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into s from public.cafe_suggestions where id = suggestion_id for update;
  if not found then raise exception 'Suggestion not found'; end if;
  if s.lat is null or s.lng is null or s.lat not between 19 and 20 or s.lng not between 99.6 and 100.2 then
    raise exception 'Suggestion coordinates are outside the supported area';
  end if;
  new_slug := 'cafe-' || s.id::text;
  if s.open_time is null or s.close_time is null or s.address is null then
    raise exception 'Please provide address and opening hours before publishing';
  end if;
  insert into public.cafes(slug,name_th,name_en,description_th,address_th,lat,lng,photo,open_time,close_time,price_range,area)
  values (new_slug,s.name,s.name,coalesce(s.note,''),s.address,s.lat,s.lng,s.photo_url,
    to_char(s.open_time::time,'HH24:MI'),to_char(s.close_time::time,'HH24:MI'),
    coalesce(s.price_range,1),case when s.lat < 19.1 then 'maeka-uni' else 'lakeside' end)
  on conflict (slug) do nothing;
  update public.cafe_suggestions set status = 'approved' where id = suggestion_id;
  return new_slug;
end $$;
