-- Blockora — function privileges
-- Nothing is executable by default; signed-in players get the public RPCs.
-- `anon` (signed-out) may only check username availability during sign-up.

revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on all functions in schema public to authenticated;
grant execute on function public.check_username_available(text) to anon;

-- Policy helpers must be callable by the querying role.
grant execute on function private.can_view(uuid, text) to authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function private.are_friends(uuid, uuid) to authenticated;
