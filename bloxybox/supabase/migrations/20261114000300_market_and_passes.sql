-- BloxyBox marketplace, inventory and Game Pass RPCs.
-- Every purchase locks the buyer's wallet row first, so ownership checks and
-- debits for the same user are serialised (no double-spend, no double-buy).

create function public.purchase_item(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_listing public.marketplace_listings;
  v_item public.items;
  v_tx public.transactions;
  v_inventory_id uuid;
begin
  -- Serialise all purchases of this user.
  perform 1 from public.wallets where user_id = v_uid for update;
  if not found then
    raise exception 'WALLET_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_listing from public.marketplace_listings where id = p_listing_id and is_active;
  if not found then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_item from public.items where id = v_listing.item_id;

  if exists (select 1 from public.inventory where user_id = v_uid and item_id = v_item.id) then
    raise exception 'ALREADY_OWNED' using errcode = 'P0001';
  end if;

  v_tx := public._apply_wallet_change(
    v_uid, -v_listing.price, 'item_purchase', 'Purchased ' || v_item.name,
    'item', v_item.id::text,
    jsonb_build_object('listing_id', v_listing.id, 'price', v_listing.price, 'item_name', v_item.name, 'rarity', v_item.rarity)
  );

  insert into public.inventory (user_id, item_id, slot, equipped, acquired_via, price_paid)
  values (v_uid, v_item.id, v_item.slot, false, 'purchase', v_listing.price)
  returning id into v_inventory_id;

  return jsonb_build_object(
    'item_id', v_item.id,
    'inventory_id', v_inventory_id,
    'price', v_listing.price,
    'balance', v_tx.balance_after,
    'transaction_id', v_tx.id
  );
end;
$$;

create function public.equip_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_row public.inventory;
begin
  select * into v_row from public.inventory where user_id = v_uid and item_id = p_item_id for update;
  if not found then
    raise exception 'NOT_OWNED' using errcode = 'P0001';
  end if;

  update public.inventory
  set equipped = false
  where user_id = v_uid and slot = v_row.slot and equipped and item_id <> p_item_id;

  update public.inventory set equipped = true where id = v_row.id;

  return jsonb_build_object('item_id', p_item_id, 'slot', v_row.slot, 'equipped', true);
end;
$$;

create function public.unequip_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_row public.inventory;
begin
  select * into v_row from public.inventory where user_id = v_uid and item_id = p_item_id for update;
  if not found then
    raise exception 'NOT_OWNED' using errcode = 'P0001';
  end if;

  update public.inventory set equipped = false where id = v_row.id;

  return jsonb_build_object('item_id', p_item_id, 'slot', v_row.slot, 'equipped', false);
end;
$$;

create function public.purchase_game_pass(p_pass_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
  v_pass public.game_passes;
  v_experience public.experiences;
  v_tx public.transactions;
begin
  perform 1 from public.wallets where user_id = v_uid for update;
  if not found then
    raise exception 'WALLET_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_pass from public.game_passes where id = p_pass_id and is_active;
  if not found then
    raise exception 'PASS_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_experience from public.experiences where id = v_pass.experience_id;

  if exists (select 1 from public.game_pass_ownership where user_id = v_uid and pass_id = v_pass.id) then
    raise exception 'ALREADY_OWNED' using errcode = 'P0001';
  end if;

  v_tx := public._apply_wallet_change(
    v_uid, -v_pass.price, 'pass_purchase', 'Game Pass: ' || v_pass.name || ' (' || v_experience.title || ')',
    'game_pass', v_pass.id::text,
    jsonb_build_object('price', v_pass.price, 'pass_name', v_pass.name, 'experience', v_experience.slug, 'perk', v_pass.perk)
  );

  insert into public.game_pass_ownership (user_id, pass_id, enabled, acquired_via, price_paid)
  values (v_uid, v_pass.id, true, 'purchase', v_pass.price);

  return jsonb_build_object(
    'pass_id', v_pass.id,
    'price', v_pass.price,
    'balance', v_tx.balance_after,
    'transaction_id', v_tx.id
  );
end;
$$;

create function public.set_game_pass_enabled(p_pass_id uuid, p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_user();
begin
  if p_enabled is null then
    raise exception 'INVALID_VALUE' using errcode = '22023';
  end if;

  update public.game_pass_ownership
  set enabled = p_enabled
  where user_id = v_uid and pass_id = p_pass_id;

  if not found then
    raise exception 'NOT_OWNED' using errcode = 'P0001';
  end if;

  return jsonb_build_object('pass_id', p_pass_id, 'enabled', p_enabled);
end;
$$;

revoke all on function public.purchase_item(uuid) from public, anon, authenticated;
revoke all on function public.equip_item(uuid) from public, anon, authenticated;
revoke all on function public.unequip_item(uuid) from public, anon, authenticated;
revoke all on function public.purchase_game_pass(uuid) from public, anon, authenticated;
revoke all on function public.set_game_pass_enabled(uuid, boolean) from public, anon, authenticated;

grant execute on function public.purchase_item(uuid) to authenticated;
grant execute on function public.equip_item(uuid) to authenticated;
grant execute on function public.unequip_item(uuid) to authenticated;
grant execute on function public.purchase_game_pass(uuid) to authenticated;
grant execute on function public.set_game_pass_enabled(uuid, boolean) to authenticated;
