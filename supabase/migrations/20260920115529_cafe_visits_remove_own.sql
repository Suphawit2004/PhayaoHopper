grant delete on public.cafe_visits to authenticated;
create policy cafe_visits_delete_own on public.cafe_visits
  for delete to authenticated using ((select auth.uid()) = user_id);
