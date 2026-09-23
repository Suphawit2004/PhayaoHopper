-- Keep cafe attributes in the existing arrays while allowing admins to add
-- cafe-specific labels from the editor. Bound their size at the database too.
alter table public.cafes drop constraint if exists cafes_feature_validation;

alter table public.cafes add constraint cafes_feature_validation check (
  length(name_th) between 1 and 160 and lat between 19 and 20 and lng between 99.6 and 100.2
  and area in ('lakeside','maeka-uni') and price_range in (1,2)
  and open_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:00)?$'
  and close_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:00)?$'
  and closed_days <@ array[0,1,2,3,4,5,6] and base_rating between 0 and 5
  and cardinality(tags) <= 20 and length(array_to_string(tags, ',')) <= 1200
  and cardinality(lifestyle_tags) <= 20 and length(array_to_string(lifestyle_tags, ',')) <= 1200
);
