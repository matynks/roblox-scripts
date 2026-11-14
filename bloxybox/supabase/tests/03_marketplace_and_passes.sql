-- Marketplace purchases, ownership, equipping and Game Passes.

do $$
declare
  v_uid uuid := tests.create_user('shopper');
  v_other uuid := tests.create_user('bystander');
  v_cap_listing uuid := (select l.id from public.marketplace_listings l join public.items i on i.id = l.item_id where i.slug = 'cap-volt');
  v_cap uuid := (select id from public.items where slug = 'cap-volt');
  v_beanie_listing uuid := (select l.id from public.marketplace_listings l join public.items i on i.id = l.item_id where i.slug = 'beanie-ember');
  v_beanie uuid := (select id from public.items where slug = 'beanie-ember');
  v_crown_listing uuid := (select l.id from public.marketplace_listings l join public.items i on i.id = l.item_id where i.slug = 'crown-royal');
  v_starter_top uuid := (select id from public.items where slug = 'top-tee');
  v_result jsonb;
  v_count integer;
begin
  perform tests.authenticate(v_uid);

  -- Buy
  v_result := public.purchase_item(v_cap_listing);
  perform tests.assert_eq((v_result ->> 'price')::bigint, 80::bigint, 'charged the listing price');
  perform tests.assert_eq((v_result ->> 'balance')::bigint, 420::bigint, 'balance returned by server');
  perform tests.assert_eq((select balance from public.wallets where user_id = v_uid), 420::bigint, 'wallet debited');
  select count(*) into v_count from public.inventory where user_id = v_uid and item_id = v_cap and acquired_via = 'purchase' and price_paid = 80;
  perform tests.assert_eq(v_count, 1, 'ownership recorded');
  select count(*) into v_count from public.transactions
  where user_id = v_uid and kind = 'item_purchase' and amount = -80 and reference_id = v_cap::text;
  perform tests.assert_eq(v_count, 1, 'purchase in ledger');

  -- Cannot buy twice
  perform tests.assert_throws(format('select public.purchase_item(%L)', v_cap_listing), 'ALREADY_OWNED', 'double purchase rejected');
  perform tests.assert_eq((select balance from public.wallets where user_id = v_uid), 420::bigint, 'no double charge');

  -- Cannot afford
  perform tests.assert_throws(format('select public.purchase_item(%L)', v_crown_listing), 'INSUFFICIENT_FUNDS', 'unaffordable item rejected');
  select count(*) into v_count from public.inventory where user_id = v_uid and item_id = (select item_id from public.marketplace_listings where id = v_crown_listing);
  perform tests.assert_eq(v_count, 0, 'nothing granted on failed purchase');

  -- Unknown or inactive listings
  perform tests.assert_throws(format('select public.purchase_item(%L)', gen_random_uuid()), 'LISTING_NOT_FOUND', 'unknown listing');
  perform tests.as_owner();
  update public.marketplace_listings set is_active = false where id = v_beanie_listing;
  perform tests.authenticate(v_uid);
  perform tests.assert_throws(format('select public.purchase_item(%L)', v_beanie_listing), 'LISTING_NOT_FOUND', 'inactive listing');
  perform tests.as_owner();
  update public.marketplace_listings set is_active = true where id = v_beanie_listing;
  perform tests.authenticate(v_uid);
  perform public.purchase_item(v_beanie_listing);

  -- Equip: one item per slot
  perform public.equip_item(v_cap);
  perform tests.assert((select equipped from public.inventory where user_id = v_uid and item_id = v_cap), 'cap equipped');
  perform public.equip_item(v_beanie);
  perform tests.assert((select equipped from public.inventory where user_id = v_uid and item_id = v_beanie), 'beanie equipped');
  perform tests.assert(not (select equipped from public.inventory where user_id = v_uid and item_id = v_cap), 'cap unequipped by same-slot equip');
  select count(*) into v_count from public.inventory where user_id = v_uid and slot = 'hat' and equipped;
  perform tests.assert_eq(v_count, 1, 'exactly one hat equipped');

  perform public.unequip_item(v_beanie);
  select count(*) into v_count from public.inventory where user_id = v_uid and slot = 'hat' and equipped;
  perform tests.assert_eq(v_count, 0, 'hat slot empty after unequip');
  perform public.unequip_item(v_starter_top);
  perform public.equip_item(v_starter_top);

  -- Cannot equip what you do not own
  perform tests.assert_throws(format('select public.equip_item(%L)', (select id from public.items where slug = 'back-wings')),
    'NOT_OWNED', 'equip unowned item rejected');

  -- Equipping never touches other users
  perform tests.as_owner();
  select count(*) into v_count from public.inventory where user_id = v_other and equipped;
  perform tests.assert_eq(v_count, 3, 'other user unaffected');
  perform tests.assert_ledger_consistent();
end $$;

-- Concurrency guard: the partial unique index rejects two equipped items in one slot.
do $$
declare
  v_uid uuid := tests.create_user('indexcheck');
begin
  insert into public.inventory (user_id, item_id, slot, equipped, acquired_via)
  values (v_uid, (select id from public.items where slug = 'face-grin'), 'face', false, 'dev_grant');
  perform tests.assert_throws(
    format($q$update public.inventory set equipped = true where user_id = %L and slot = 'face'$q$, v_uid),
    'inventory_one_equipped_per_slot', 'database refuses two equipped faces');
end $$;

-- Game Passes
do $$
declare
  v_uid uuid := tests.create_user('passbuyer');
  v_pass uuid := (select id from public.game_passes where slug = 'box-stack-wide-base');
  v_expensive uuid := (select id from public.game_passes where slug = 'lane-dash-double-coins');
  v_result jsonb;
begin
  perform tests.authenticate(v_uid);

  v_result := public.purchase_game_pass(v_pass);
  perform tests.assert_eq((v_result ->> 'balance')::bigint, 100::bigint, '400 deducted');
  perform tests.assert((select enabled from public.game_pass_ownership where user_id = v_uid and pass_id = v_pass), 'owned and enabled');
  perform tests.assert_throws(format('select public.purchase_game_pass(%L)', v_pass), 'ALREADY_OWNED', 'no double purchase');
  perform tests.assert_throws(format('select public.purchase_game_pass(%L)', v_expensive), 'INSUFFICIENT_FUNDS', 'cannot afford');
  perform tests.assert_throws(format('select public.purchase_game_pass(%L)', gen_random_uuid()), 'PASS_NOT_FOUND', 'unknown pass');

  perform public.set_game_pass_enabled(v_pass, false);
  perform tests.assert(not (select enabled from public.game_pass_ownership where user_id = v_uid and pass_id = v_pass), 'disabled');
  perform public.set_game_pass_enabled(v_pass, true);
  perform tests.assert_throws(format('select public.set_game_pass_enabled(%L, true)', v_expensive), 'NOT_OWNED', 'cannot toggle unowned pass');

  perform tests.as_owner();
  perform tests.assert_eq(
    (select count(*)::integer from public.transactions where user_id = v_uid and kind = 'pass_purchase'), 1, 'one pass purchase in ledger');
  perform tests.assert_ledger_consistent();
end $$;
