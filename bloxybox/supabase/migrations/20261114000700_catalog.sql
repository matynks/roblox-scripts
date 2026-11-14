-- BloxyBox catalog: avatar items, marketplace prices, experiences and Game Passes.
-- All names and designs are original to BloxyBox. Idempotent (safe to re-run).

insert into public.items (slug, name, description, slot, rarity, asset_key, primary_color, secondary_color, is_starter) values
  -- Starter items (granted at sign-up, not sold)
  ('face-smile',     'Classic Smile',        'The friendly face every Boxling starts with.',                        'face',      'common',    'smile',     '#1B1B2A', '#FFFFFF', true),
  ('top-tee',        'Starter Tee',          'A soft cotton tee with the BloxyBox stripe.',                          'top',       'common',    'tee',       '#3D7BFF', '#FFFFFF', true),
  ('bottom-jeans',   'Starter Jeans',        'Sturdy everyday jeans.',                                               'bottom',    'common',    'jeans',     '#2E3A59', '#4A5A85', true),
  -- Hats
  ('cap-volt',       'Volt Cap',             'A sporty cap with an electric-blue brim.',                             'hat',       'common',    'cap',       '#4F7CFF', '#FFFFFF', false),
  ('beanie-ember',   'Ember Beanie',         'Warm knit beanie in a glowing ember red.',                             'hat',       'common',    'beanie',    '#FF6B5A', '#FFD3CC', false),
  ('antenna-buddy',  'Antenna Buddy',        'Picks up good vibes from up to three blocks away.',                    'hat',       'uncommon',  'antenna',   '#9AA3B5', '#5CFFB0', false),
  ('propeller-cap',  'Propeller Cap',        'Spins when you run. Lift not included.',                               'hat',       'uncommon',  'propeller', '#FFC83D', '#4F7CFF', false),
  ('top-hat-noir',   'Midnight Top Hat',     'A tall, dramatic hat with a violet band.',                             'hat',       'rare',      'tophat',    '#22223A', '#B98CFF', false),
  ('halo-glow',      'Glow Halo',            'A floating ring of soft light.',                                       'hat',       'epic',      'halo',      '#FFF3A6', '#FFFFFF', false),
  ('wizard-hat',     'Starlight Wizard Hat', 'Embroidered with tiny golden stars.',                                  'hat',       'epic',      'wizard',    '#5B3FD6', '#FFE58A', false),
  ('crown-royal',    'Box Royale Crown',     'For champions of the stack. Heavy is the box that wears it.',          'hat',       'legendary', 'crown',     '#FFCE3A', '#FF4F8B', false),
  -- Faces
  ('face-grin',      'Big Grin',             'All teeth, all joy.',                                                  'face',      'common',    'grin',      '#1B1B2A', '#FFFFFF', false),
  ('face-sleepy',    'Sleepy',               'Five more minutes, please.',                                           'face',      'common',    'sleepy',    '#1B1B2A', '#9DB8FF', false),
  ('face-wink',      'Wink',                 'A cheeky wink with rosy cheeks.',                                      'face',      'common',    'wink',      '#1B1B2A', '#FF7AA8', false),
  ('face-cool',      'Cool Shades',          'Reflective shades for bright arcade lights.',                          'face',      'uncommon',  'cool',      '#14141F', '#5CC8FF', false),
  ('face-stars',     'Starstruck',           'Eyes full of stars after a new high score.',                           'face',      'rare',      'star_eyes', '#FFC83D', '#1B1B2A', false),
  ('face-visor',     'Neon Visor',           'A glowing LED visor with a scrolling scan line.',                      'face',      'epic',      'visor',     '#00E5C3', '#0D0D18', false),
  -- Tops
  ('top-hoodie-mint','Mint Hoodie',          'A cosy hoodie with a front pocket.',                                   'top',       'common',    'hoodie',    '#4FD1A5', '#2F9C79', false),
  ('top-stripes',    'Sunset Stripes',       'Warm stripes for warm days.',                                          'top',       'uncommon',  'stripes',   '#FF8A4C', '#FFE1C7', false),
  ('top-jacket',     'Varsity Jacket',       'Classic varsity jacket with contrast sleeves.',                        'top',       'rare',      'jacket',    '#3048C9', '#F3F4FF', false),
  ('top-tux',        'Gala Tux',             'Formal wear for award nights.',                                        'top',       'epic',      'tux',       '#1A1A26', '#FFFFFF', false),
  ('top-armor',      'Circuit Armor',        'Plated armour traced with glowing circuitry.',                         'top',       'legendary', 'armor',     '#7A86A8', '#00E5FF', false),
  -- Bottoms
  ('bottom-shorts',  'Court Shorts',         'Light shorts with side stripes.',                                      'bottom',    'common',    'shorts',    '#FF5A7A', '#FFFFFF', false),
  ('bottom-cargo',   'Trail Cargo',          'Pockets for every snack.',                                             'bottom',    'uncommon',  'cargo',     '#6E7B4F', '#4B5536', false),
  ('bottom-sport',   'Racer Joggers',        'Track joggers with a racing stripe.',                                  'bottom',    'rare',      'sport',     '#222638', '#FF4F8B', false),
  -- Accessories
  ('acc-scarf',      'Cozy Scarf',           'A chunky knit scarf.',                                                 'accessory', 'common',    'scarf',     '#E84A5F', '#FFD166', false),
  ('acc-bowtie',     'Dapper Bow Tie',       'Instantly 20% more dapper.',                                           'accessory', 'uncommon',  'bowtie',    '#B98CFF', '#6A3FD1', false),
  ('acc-medal',      'Champion Medal',       'Awarded for outstanding stacking.',                                    'accessory', 'rare',      'medal',     '#FFC83D', '#3D7BFF', false),
  -- Back
  ('back-backpack',  'Explorer Pack',        'Room for maps, snacks and a spare box.',                               'back',      'uncommon',  'backpack',  '#FF9F43', '#8A4B12', false),
  ('back-cape',      'Hero Cape',            'Flutters dramatically at all times.',                                  'back',      'rare',      'cape',      '#E63946', '#FFD166', false),
  ('back-jetpack',   'Rocket Jetpack',       'Twin thrusters with a cheerful glow.',                                 'back',      'epic',      'jetpack',   '#B7C0D8', '#FF6B3D', false),
  ('back-wings',     'Prism Wings',          'Translucent wings that shimmer in every colour.',                      'back',      'legendary', 'wings',     '#9BE7FF', '#D9A8FF', false)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, slot = excluded.slot, rarity = excluded.rarity,
  asset_key = excluded.asset_key, primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color, is_starter = excluded.is_starter;

insert into public.marketplace_listings (item_id, price, is_active, is_featured)
select i.id, v.price, true, v.featured
from (values
  ('cap-volt', 80, false), ('beanie-ember', 120, false), ('antenna-buddy', 260, false),
  ('propeller-cap', 300, true), ('top-hat-noir', 750, false), ('halo-glow', 1400, false),
  ('wizard-hat', 1600, true), ('crown-royal', 4200, true),
  ('face-grin', 60, false), ('face-sleepy', 70, false), ('face-wink', 90, false),
  ('face-cool', 350, true), ('face-stars', 650, false), ('face-visor', 1800, false),
  ('top-hoodie-mint', 150, false), ('top-stripes', 240, false), ('top-jacket', 800, true),
  ('top-tux', 1500, false), ('top-armor', 3600, false),
  ('bottom-shorts', 90, false), ('bottom-cargo', 220, false), ('bottom-sport', 520, false),
  ('acc-scarf', 110, false), ('acc-bowtie', 200, false), ('acc-medal', 900, false),
  ('back-backpack', 380, false), ('back-cape', 950, true), ('back-jetpack', 2200, false),
  ('back-wings', 5000, false)
) as v(slug, price, featured)
join public.items i on i.slug = v.slug
on conflict (item_id) do update set price = excluded.price, is_featured = excluded.is_featured, is_active = true;

insert into public.experiences (
  slug, title, tagline, description, how_to_play, category, status, is_featured, sort_order, accent_color,
  score_label, released_at, coins_per_point, win_bonus, max_reward_per_run, daily_reward_cap, xp_per_point,
  max_xp_per_run, max_points_per_second, win_score, min_win_seconds, max_session_minutes
) values
  ('box-stack', 'Box Stack', 'Stack it high. Stack it perfect.',
   'Drop sliding boxes onto your tower. Anything that hangs over the edge is sliced off, so every miss makes the next drop harder. Land 30 floors to win.',
   'Tap anywhere to drop the moving box. Line it up with the box below: overhangs are cut away. A perfect drop restores a little width.',
   'arcade', 'playable', true, 1, '#FFB23F', 'Floors', '2026-11-01',
   4, 80, 250, 1500, 5, 250, 4, 30, 8, 30),
  ('lane-dash', 'Lane Dash', 'Three lanes. No brakes.',
   'Race down a neon track, switch lanes to dodge barriers and scoop up coins. The track speeds up the further you go. Reach the 2,000 m finish line to win.',
   'Swipe left or right, or tap the left or right side of the screen, to change lanes. Hitting a barrier ends the run.',
   'action', 'playable', true, 2, '#33D6FF', 'Points', '2026-11-10',
   0.5, 100, 400, 2000, 0.6, 300, 20, 200, 60, 30),
  ('orbit-hop', 'Orbit Hop', 'Leap between spinning planets.',
   'A gravity platformer about timing jumps between orbiting worlds. Currently in development and not playable yet.',
   '', 'casual', 'in_development', false, 3, '#B07CFF', 'Score', null,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 30),
  ('pixel-garden', 'Pixel Garden', 'Grow a tiny pixel paradise.',
   'A relaxing builder about planting and decorating a pocket garden. Currently in development and not playable yet.',
   '', 'simulation', 'in_development', false, 4, '#5EE08A', 'Score', null,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 30)
on conflict (slug) do update set
  title = excluded.title, tagline = excluded.tagline, description = excluded.description,
  how_to_play = excluded.how_to_play, category = excluded.category, status = excluded.status,
  is_featured = excluded.is_featured, sort_order = excluded.sort_order, accent_color = excluded.accent_color,
  score_label = excluded.score_label, released_at = excluded.released_at,
  coins_per_point = excluded.coins_per_point, win_bonus = excluded.win_bonus,
  max_reward_per_run = excluded.max_reward_per_run, daily_reward_cap = excluded.daily_reward_cap,
  xp_per_point = excluded.xp_per_point, max_xp_per_run = excluded.max_xp_per_run,
  max_points_per_second = excluded.max_points_per_second, win_score = excluded.win_score,
  min_win_seconds = excluded.min_win_seconds, max_session_minutes = excluded.max_session_minutes;

insert into public.game_passes (slug, experience_id, name, description, price, perk, sort_order)
select v.slug, e.id, v.name, v.description, v.price, v.perk, v.sort_order
from (values
  ('box-stack-double-coins', 'box-stack', 'Double Coins',  'Earn twice the BoxCoins from every Box Stack run (daily cap still applies).', 750, 'double_coins', 1),
  ('box-stack-wide-base',    'box-stack', 'Wide Base',     'Start every tower with a 30% wider box.',                                    400, 'wide_start',   2),
  ('box-stack-slow-motion',  'box-stack', 'Steady Hands',  'Boxes slide 20% slower.',                                                    500, 'slow_motion',  3),
  ('lane-dash-double-coins', 'lane-dash', 'Double Coins',  'Earn twice the BoxCoins from every Lane Dash run (daily cap still applies).', 900, 'double_coins', 1),
  ('lane-dash-second-wind',  'lane-dash', 'Second Wind',   'Survive one crash per run with a protective shield.',                        600, 'extra_life',   2),
  ('lane-dash-coin-magnet',  'lane-dash', 'Coin Magnet',   'Collect coins in neighbouring lanes too.',                                   700, 'coin_magnet',  3)
) as v(slug, experience_slug, name, description, price, perk, sort_order)
join public.experiences e on e.slug = v.experience_slug
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  perk = excluded.perk, sort_order = excluded.sort_order, is_active = true;

insert into public.app_meta (key, value) values ('schema_version', '20261114000700')
on conflict (key) do update set value = excluded.value;
