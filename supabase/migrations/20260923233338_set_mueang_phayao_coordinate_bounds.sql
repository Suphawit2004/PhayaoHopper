-- Keep the cafe catalogue within a practical region from central Phayao to
-- Mae Ka / the University of Phayao. Existing published cafes were checked
-- against this box before applying the constraint (14/14 are inside).
alter table public.cafes drop constraint if exists cafes_feature_validation;
alter table public.cafes add constraint cafes_feature_validation check (
  length(name_th) between 1 and 160 and lat between 19 and 19.25 and lng between 99.75 and 100.05
  and area in ('lakeside','maeka-uni') and price_range in (1,2)
  and open_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:00)?$'
  and close_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:00)?$'
  and closed_days <@ array[0,1,2,3,4,5,6] and base_rating between 0 and 5
  and cardinality(tags) <= 20 and length(array_to_string(tags, ',')) <= 1200
  and cardinality(lifestyle_tags) <= 20 and length(array_to_string(lifestyle_tags, ',')) <= 1200
);

drop policy if exists suggestions_supported_coordinates on public.cafe_suggestions;
create policy suggestions_supported_coordinates on public.cafe_suggestions
  as restrictive for insert to public
  with check (lat between 19 and 19.25 and lng between 99.75 and 100.05);

create or replace function public.publish_cafe_suggestion(suggestion_id uuid) returns text
language plpgsql security invoker set search_path = '' as $$
declare s public.cafe_suggestions; new_slug text;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into s from public.cafe_suggestions where id = suggestion_id for update;
  if not found then raise exception 'Suggestion not found'; end if;
  if s.lat is null or s.lng is null or s.lat not between 19 and 19.25 or s.lng not between 99.75 and 100.05 then
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
