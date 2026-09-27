-- The trigger function only needs to run as part of the AFTER INSERT
-- trigger on auth.users; it doesn't need to be directly callable via the
-- REST API by anon/authenticated roles.
revoke execute on function public.handle_new_member() from public, anon, authenticated;
