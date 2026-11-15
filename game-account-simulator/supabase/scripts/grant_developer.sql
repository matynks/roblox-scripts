-- Bootstrap the first Modify Menu owner.
-- Run ONCE in the Supabase SQL editor (or psql) after the account has signed up in the app.
-- Replace the email below. Later developers can be promoted from the Modify Menu by an owner.
insert into public.developer_roles (user_id, role, note)
select u.id, 'owner', 'bootstrap owner'
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('you@example.com')
on conflict (user_id) do update set role = 'owner';

-- Verify:
select p.username, r.role from public.developer_roles r join public.profiles p on p.id = r.user_id;
