import type { CatalogItemSeed, ItemAsset, ItemSetSeed, ItemSlot, Rarity, SeasonKey } from './types';

/**
 * The Blockora marketplace. Every item is original and drawn procedurally by
 * src/avatar from its `asset` description — there are no image files to license.
 */

export const ITEM_SETS: ItemSetSeed[] = [
  { key: 'knight', name: 'Valiant Knight', description: 'Forge-bright armor for heroes of the realm.', rewardOrbs: 800, sortOrder: 1 },
  { key: 'pirate', name: 'Salt & Sails', description: 'Everything a captain needs for the open sea.', rewardOrbs: 500, sortOrder: 2 },
  { key: 'astro', name: 'Starbound Explorer', description: 'Gear rated for zero gravity and beyond.', rewardOrbs: 900, sortOrder: 3 },
  { key: 'street', name: 'Block Street', description: 'Fresh fits from the city skate park.', rewardOrbs: 300, sortOrder: 4 },
];

type Extra = Partial<Omit<CatalogItemSeed, 'id' | 'name' | 'slot' | 'rarity' | 'price' | 'asset' | 'description'>>;

function it(
  id: string,
  name: string,
  slot: ItemSlot,
  rarity: Rarity,
  price: number,
  asset: ItemAsset,
  description: string,
  extra: Extra = {},
): CatalogItemSeed {
  return { id, name, slot, rarity, price, asset, description, ageDays: 60, ...extra };
}

const season = (seasonKey: SeasonKey, ageDays = 10): Extra => ({ seasonKey, ageDays });

export const CATALOG: CatalogItemSeed[] = [
  // ── Hair ────────────────────────────────────────────────────────────────
  it('hair-classic-cut', 'Classic Cut', 'hair', 'common', 0, { shape: 'short', primary: '#5B3A29' }, 'A tidy everyday style.', { starter: true, forSale: false, ageDays: 400 }),
  it('hair-side-swoop', 'Side Swoop', 'hair', 'common', 0, { shape: 'swoop', primary: '#1F1A17' }, 'Swept to the side with style.', { starter: true, forSale: false, ageDays: 400 }),
  it('hair-top-bun', 'Top Bun', 'hair', 'common', 0, { shape: 'bun', primary: '#8A3B1E' }, 'Neat, quick and ready for anything.', { starter: true, forSale: false, ageDays: 400 }),
  it('hair-fresh-buzz', 'Fresh Buzz', 'hair', 'common', 60, { shape: 'buzz', primary: '#3A2A1F' }, 'Low maintenance, high confidence.', { ageDays: 300, baseSales: 9400 }),
  it('hair-ginger-swoop', 'Ginger Swoop', 'hair', 'common', 90, { shape: 'swoop', primary: '#D9692C' }, 'A warm copper swoop.', { ageDays: 220, baseSales: 6100 }),
  it('hair-electric-spikes', 'Electric Spikes', 'hair', 'uncommon', 180, { shape: 'spiky', primary: '#FFD23F', secondary: '#FF9F1C' }, 'Charged up and pointing skyward.', { ageDays: 160, baseSales: 7200, featured: true }),
  it('hair-mint-spikes', 'Mint Spikes', 'hair', 'uncommon', 160, { shape: 'spiky', primary: '#7CF5C8' }, 'Cool, crisp and a little wild.', { ageDays: 120, baseSales: 3900 }),
  it('hair-midnight-long', 'Midnight Waves', 'hair', 'uncommon', 200, { shape: 'long', primary: '#2B2D42', secondary: '#4A4E69' }, 'Long waves the color of a night sky.', { ageDays: 180, baseSales: 8800 }),
  it('hair-silver-ponytail', 'Silver Ponytail', 'hair', 'uncommon', 220, { shape: 'ponytail', primary: '#CFD6E0' }, 'Sleek and swishy.', { ageDays: 140, baseSales: 4100 }),
  it('hair-punk-mohawk', 'Punk Mohawk', 'hair', 'rare', 400, { shape: 'mohawk', primary: '#E63946' }, 'Loud hair for loud players.', { ageDays: 90, baseSales: 2300 }),
  it('hair-cotton-candy', 'Cotton Candy Curls', 'hair', 'rare', 450, { shape: 'curly', primary: '#FF9FD1', secondary: '#9FD8FF' }, 'Two-tone curls, sweet as a fair day.', { ageDays: 45, baseSales: 2900 }),
  it('hair-royal-curls', 'Royal Curls', 'hair', 'rare', 600, { shape: 'curly', primary: '#F4D35E', secondary: '#EE964B' }, 'Golden ringlets fit for a ruler.', { ageDays: 75, baseSales: 1500 }),
  it('hair-galaxy-afro', 'Galaxy Afro', 'hair', 'epic', 1200, { shape: 'afro', primary: '#4C2A85', secondary: '#00D1FF', pattern: 'stars' }, 'A whole universe of volume.', { ageDays: 30, baseSales: 980 }),

  // ── Faces ───────────────────────────────────────────────────────────────
  it('face-friendly-smile', 'Friendly Smile', 'face', 'common', 0, { shape: 'smile', primary: '#1E1E24' }, 'The classic welcome.', { starter: true, forSale: false, ageDays: 400 }),
  it('face-determined', 'Determined', 'face', 'common', 0, { shape: 'determined', primary: '#1E1E24' }, 'Eyes on the goal.', { starter: true, forSale: false, ageDays: 400 }),
  it('face-big-grin', 'Big Grin', 'face', 'common', 50, { shape: 'grin', primary: '#1E1E24' }, 'Ear to ear happiness.', { ageDays: 300, baseSales: 12000 }),
  it('face-cheeky-wink', 'Cheeky Wink', 'face', 'common', 75, { shape: 'wink', primary: '#1E1E24' }, 'You know what you did.', { ageDays: 260, baseSales: 7600 }),
  it('face-gasp', 'Gasp!', 'face', 'common', 75, { shape: 'surprised', primary: '#1E1E24' }, 'Did that just happen?', { ageDays: 210, baseSales: 5300 }),
  it('face-sleepyhead', 'Sleepyhead', 'face', 'uncommon', 120, { shape: 'sleepy', primary: '#1E1E24' }, 'Five more minutes…', { ageDays: 150, baseSales: 3400 }),
  it('face-too-cool', 'Too Cool', 'face', 'uncommon', 150, { shape: 'cool', primary: '#1E1E24' }, 'Unbothered. Moisturized. Winning.', { ageDays: 100, baseSales: 6700 }),
  it('face-starstruck', 'Starstruck', 'face', 'rare', 500, { shape: 'starry', primary: '#1E1E24', accent: '#FFC53D' }, 'Stars in your eyes, literally.', { ageDays: 40, baseSales: 1900 }),
  it('face-kitty', 'Kitty Face', 'face', 'rare', 650, { shape: 'cat', primary: '#1E1E24', accent: '#FF8FAB' }, 'Whiskers included.', { ageDays: 50, baseSales: 2200 }),
  it('face-robo-visor', 'Robo Face', 'face', 'epic', 1500, { shape: 'robot', primary: '#00E5FF', glow: true }, 'Beep boop, maximum style.', { ageDays: 20, baseSales: 640 }),

  // ── Hats ────────────────────────────────────────────────────────────────
  it('hat-blockora-cap', 'Blockora Cap', 'hat', 'common', 100, { shape: 'cap', primary: '#7C5CFF', secondary: '#22D3EE', pattern: 'emblem' }, 'Rep the platform.', { featured: true, ageDays: 360, baseSales: 15200 }),
  it('hat-red-cap', 'Red Cap', 'hat', 'common', 80, { shape: 'cap', primary: '#E63946', secondary: '#F1FAEE' }, 'A sporty classic.', { setKey: 'street', ageDays: 300, baseSales: 8300 }),
  it('hat-cozy-beanie', 'Cozy Beanie', 'hat', 'common', 90, { shape: 'beanie', primary: '#3A86FF', secondary: '#FFFFFF' }, 'Warm ears, warm heart.', { ageDays: 250, baseSales: 7700 }),
  it('hat-party-cone', 'Party Cone', 'hat', 'common', 110, { shape: 'party', primary: '#FF4D6D', secondary: '#FFD166', pattern: 'dots' }, 'Every day is a celebration.', { ageDays: 200, baseSales: 4500 }),
  it('hat-fisher-bucket', 'Fisher Bucket Hat', 'hat', 'common', 120, { shape: 'bucket', primary: '#8DB580' }, 'Shade for long afternoons.', { ageDays: 170, baseSales: 3100 }),
  it('hat-signal-antenna', 'Signal Antenna', 'hat', 'uncommon', 250, { shape: 'antenna', primary: '#A0AEC0', accent: '#FF4D6D', glow: true }, 'Full bars, everywhere.', { ageDays: 130, baseSales: 2600 }),
  it('hat-bunny-ears', 'Bunny Ears', 'hat', 'uncommon', 280, { shape: 'bunny_ears', primary: '#FFFFFF', secondary: '#FFB3C6' }, 'Hop to it.', { ageDays: 110, baseSales: 3800 }),
  it('hat-cat-ears', 'Cat Ears', 'hat', 'uncommon', 280, { shape: 'cat_ears', primary: '#2B2D42', secondary: '#FF8FAB' }, 'Feline fine.', { ageDays: 95, baseSales: 4200 }),
  it('hat-studio-headphones', 'Studio Headphones', 'hat', 'uncommon', 300, { shape: 'headphones', primary: '#222831', accent: '#22D3EE' }, 'Hear every beat.', { ageDays: 80, baseSales: 5100 }),
  it('hat-dapper-top-hat', 'Dapper Top Hat', 'hat', 'rare', 700, { shape: 'tophat', primary: '#1B1B1E', secondary: '#E63946' }, 'For the most distinguished players.', { ageDays: 140, baseSales: 1700 }),
  it('hat-demon-horns', 'Shadow Horns', 'hat', 'rare', 850, { shape: 'horns', primary: '#B5172B' }, 'A little mischievous.', { ageDays: 70, baseSales: 1400 }),
  it('hat-pirate-tricorn', 'Captain Tricorn', 'hat', 'uncommon', 320, { shape: 'tricorn', primary: '#2D1E2F', accent: '#FFC53D' }, 'Command the deck.', { setKey: 'pirate', ageDays: 65, baseSales: 1600 }),
  it('hat-knight-helm', 'Knight Helm', 'hat', 'rare', 900, { shape: 'helmet', primary: '#8D99AE', secondary: '#2B2D42', accent: '#FFC53D' }, 'Polished steel, visor down.', { setKey: 'knight', ageDays: 55, baseSales: 900 }),
  it('hat-arcane-wizard', 'Arcane Wizard Hat', 'hat', 'epic', 1800, { shape: 'wizard', primary: '#5A3FC0', secondary: '#FFD166', pattern: 'stars' }, 'Spells sold separately.', { ageDays: 35, baseSales: 760 }),
  it('hat-angel-halo', 'Angel Halo', 'hat', 'epic', 2200, { shape: 'halo', primary: '#FFE066', glow: true }, 'Glowing reviews only.', { ageDays: 28, baseSales: 610 }),
  it('hat-space-helmet', 'Space Helmet', 'hat', 'epic', 2500, { shape: 'helmet', primary: '#E8EEF5', secondary: '#22D3EE', glow: true }, 'Oxygen included.', { setKey: 'astro', ageDays: 25, baseSales: 540 }),
  it('hat-golden-crown', 'Golden Crown', 'hat', 'legendary', 6000, { shape: 'crown', primary: '#FFC53D', accent: '#E63946' }, 'Heavy is the head.', { featured: true, ageDays: 15, baseSales: 210 }),

  // ── Face accessories ────────────────────────────────────────────────────
  it('fx-pirate-eyepatch', 'Pirate Eyepatch', 'face_accessory', 'common', 70, { shape: 'eyepatch', primary: '#111111' }, 'Arr.', { setKey: 'pirate', ageDays: 300, baseSales: 5200 }),
  it('fx-round-glasses', 'Round Glasses', 'face_accessory', 'common', 90, { shape: 'glasses', primary: '#2B2D42' }, 'Smart and sharp.', { ageDays: 280, baseSales: 9100 }),
  it('fx-lab-goggles', 'Lab Goggles', 'face_accessory', 'uncommon', 200, { shape: 'goggles', primary: '#F4A261', secondary: '#9AD1FF' }, 'Safety first, science second.', { ageDays: 190, baseSales: 2700 }),
  it('fx-aviator-shades', 'Aviator Shades', 'face_accessory', 'uncommon', 240, { shape: 'shades', primary: '#111111', secondary: '#5A6B7B' }, 'Cruising altitude.', { setKey: 'street', ageDays: 160, baseSales: 6900 }),
  it('fx-heart-specs', 'Heart Specs', 'face_accessory', 'uncommon', 260, { shape: 'heart_glasses', primary: '#FF5DA2' }, 'Seeing everything with love.', { ageDays: 120, baseSales: 3600 }),
  it('fx-ninja-mask', 'Ninja Mask', 'face_accessory', 'uncommon', 300, { shape: 'mask', primary: '#1F2937' }, 'Silent, stylish.', { ageDays: 85, baseSales: 3000 }),
  it('fx-star-shades', 'Star Shades', 'face_accessory', 'rare', 480, { shape: 'star_glasses', primary: '#FF4D6D', secondary: '#FFD166' }, 'Main-character energy.', { ageDays: 60, baseSales: 1800 }),
  it('fx-fancy-monocle', 'Fancy Monocle', 'face_accessory', 'rare', 550, { shape: 'monocle', primary: '#FFC53D' }, 'Indubitably.', { ageDays: 75, baseSales: 1200 }),
  it('fx-cyber-visor', 'Cyber Visor', 'face_accessory', 'rare', 900, { shape: 'visor', primary: '#22D3EE', glow: true }, 'HUD online.', { ageDays: 40, baseSales: 1300 }),

  // ── Neck ────────────────────────────────────────────────────────────────
  it('neck-office-tie', 'Office Tie', 'neck', 'common', 70, { shape: 'tie', primary: '#3A86FF' }, 'Business casual.', { ageDays: 300, baseSales: 4100 }),
  it('neck-classy-bowtie', 'Classy Bowtie', 'neck', 'common', 80, { shape: 'bowtie', primary: '#2B2D42' }, 'Dressed for the occasion.', { ageDays: 260, baseSales: 3800 }),
  it('neck-red-bandana', 'Red Bandana', 'neck', 'common', 90, { shape: 'bandana', primary: '#D62828', secondary: '#FFFFFF', pattern: 'dots' }, 'Ready for adventure.', { setKey: 'street', ageDays: 200, baseSales: 3500 }),
  it('neck-cozy-scarf', 'Cozy Scarf', 'neck', 'common', 100, { shape: 'scarf', primary: '#E63946', secondary: '#FFFFFF', pattern: 'stripes' }, 'Wrapped up warm.', { ageDays: 180, baseSales: 4400 }),
  it('neck-gold-chain', 'Gold Chain', 'neck', 'rare', 700, { shape: 'chain', primary: '#FFC53D' }, 'Shine bright.', { ageDays: 70, baseSales: 1600 }),
  it('neck-champion-medal', 'Champion Medal', 'neck', 'epic', 2000, { shape: 'medal', primary: '#FFC53D', secondary: '#3A86FF' }, 'First place, every time.', { ageDays: 30, baseSales: 420 }),

  // ── Back ────────────────────────────────────────────────────────────────
  it('back-explorer-pack', 'Explorer Backpack', 'back', 'common', 150, { shape: 'backpack', primary: '#2A9D8F', secondary: '#E9C46A' }, 'Room for snacks and maps.', { ageDays: 280, baseSales: 6300 }),
  it('back-hero-cape', 'Hero Cape', 'back', 'uncommon', 350, { shape: 'cape', primary: '#E63946', secondary: '#B5172B' }, 'Capes are back.', { ageDays: 210, baseSales: 5400 }),
  it('back-knight-shield', 'Knight Shield', 'back', 'uncommon', 420, { shape: 'shield', primary: '#8D99AE', accent: '#FFC53D' }, 'Block like a pro.', { setKey: 'knight', ageDays: 150, baseSales: 1900 }),
  it('back-rock-guitar', 'Rock Guitar', 'back', 'rare', 750, { shape: 'guitar', primary: '#E63946', secondary: '#1B1B1E' }, 'Encore! Encore!', { ageDays: 110, baseSales: 1300 }),
  it('back-pixel-sword', 'Pixel Sword', 'back', 'rare', 800, { shape: 'sword', primary: '#9AD1FF', secondary: '#6D4C41' }, 'Sharp edges, crisp pixels.', { ageDays: 95, baseSales: 2100 }),
  it('back-bat-wings', 'Dusk Wings', 'back', 'rare', 900, { shape: 'bat_wings', primary: '#2B2D42', secondary: '#6A040F' }, 'For creatures of the night.', { ageDays: 80, baseSales: 1100 }),
  it('back-royal-cape', 'Royal Cape', 'back', 'epic', 2400, { shape: 'cape', primary: '#5A189A', secondary: '#FFC53D' }, 'Trimmed in gold thread.', { ageDays: 45, baseSales: 480 }),
  it('back-butterfly-wings', 'Prism Butterfly Wings', 'back', 'epic', 2600, { shape: 'wings', primary: '#FF9FD1', secondary: '#9FD8FF' }, 'Shimmer with every step.', { ageDays: 38, baseSales: 520 }),
  it('back-rocket-jetpack', 'Rocket Jetpack', 'back', 'epic', 3000, { shape: 'jetpack', primary: '#A0AEC0', accent: '#FF7B00' }, 'Ignition in 3, 2, 1…', { setKey: 'astro', ageDays: 22, baseSales: 390 }),
  it('back-angel-wings', 'Seraph Wings', 'back', 'legendary', 7500, { shape: 'angel_wings', primary: '#FFFFFF', secondary: '#FFE8A3', glow: true }, 'Radiant and rare.', { ageDays: 12, baseSales: 140 }),

  // ── Shirts ──────────────────────────────────────────────────────────────
  it('shirt-basic-blue', 'Basic Tee — Blue', 'shirt', 'common', 0, { shape: 'tee', primary: '#3A86FF' }, 'Simple and comfy.', { starter: true, forSale: false, ageDays: 400 }),
  it('shirt-basic-white', 'Basic Tee — White', 'shirt', 'common', 0, { shape: 'tee', primary: '#F1F5F9' }, 'A clean canvas.', { starter: true, forSale: false, ageDays: 400 }),
  it('shirt-basic-red', 'Basic Tee — Red', 'shirt', 'common', 0, { shape: 'tee', primary: '#E63946' }, 'Bold basics.', { starter: true, forSale: false, ageDays: 400 }),
  it('shirt-gym-tank', 'Gym Tank', 'shirt', 'common', 60, { shape: 'tank', primary: '#FF9F1C' }, 'Leg day? Arm day? Every day.', { ageDays: 300, baseSales: 5100 }),
  it('shirt-polka-tee', 'Polka Tee', 'shirt', 'common', 90, { shape: 'tee', primary: '#FFB703', secondary: '#FB8500', pattern: 'dots' }, 'Spot the style.', { ageDays: 240, baseSales: 3900 }),
  it('shirt-striped-tee', 'Striped Tee', 'shirt', 'common', 100, { shape: 'tee', primary: '#2EC4B6', secondary: '#FFFFFF', pattern: 'stripes' }, 'Nautical and nice.', { ageDays: 230, baseSales: 6200 }),
  it('shirt-blockora-tee', 'Blockora Logo Tee', 'shirt', 'common', 120, { shape: 'tee', primary: '#7C5CFF', secondary: '#22D3EE', pattern: 'emblem' }, 'Official simulator merch.', { featured: true, ageDays: 360, baseSales: 14100 }),
  it('shirt-cozy-hoodie', 'Cozy Hoodie', 'shirt', 'common', 180, { shape: 'hoodie', primary: '#6C757D', secondary: '#495057' }, 'Your favorite hoodie, now in blocks.', { setKey: 'street', ageDays: 200, baseSales: 8900 }),
  it('shirt-team-jersey', 'Team Jersey', 'shirt', 'uncommon', 280, { shape: 'jersey', primary: '#3A86FF', secondary: '#FFFFFF' }, 'Number one fan.', { ageDays: 150, baseSales: 3300 }),
  it('shirt-holiday-sweater', 'Winter Knit Sweater', 'shirt', 'uncommon', 300, { shape: 'sweater', primary: '#C1121F', secondary: '#FFFFFF', pattern: 'zigzag' }, 'Knitted with love.', { ageDays: 130, baseSales: 2800 }),
  it('shirt-varsity-jacket', 'Varsity Jacket', 'shirt', 'uncommon', 450, { shape: 'jacket', primary: '#E63946', secondary: '#F8F9FA' }, 'Letterman energy.', { ageDays: 120, baseSales: 2500 }),
  it('shirt-galaxy-tee', 'Galaxy Tee', 'shirt', 'rare', 520, { shape: 'tee', primary: '#240046', secondary: '#C77DFF', pattern: 'stars' }, 'Wear the cosmos.', { ageDays: 70, baseSales: 2000 }),
  it('shirt-pirate-coat', 'Captain\'s Coat', 'shirt', 'rare', 700, { shape: 'jacket', primary: '#6D2E46', secondary: '#FFC53D' }, 'Brass buttons and big plans.', { setKey: 'pirate', ageDays: 65, baseSales: 1100 }),
  it('shirt-leather-jacket', 'Leather Jacket', 'shirt', 'rare', 800, { shape: 'jacket', primary: '#2B2D42', secondary: '#ADB5BD' }, 'Effortlessly cool.', { ageDays: 90, baseSales: 1900 }),
  it('shirt-sharp-suit', 'Sharp Suit', 'shirt', 'epic', 1600, { shape: 'suit', primary: '#1F2937', secondary: '#E63946' }, 'Means business.', { ageDays: 50, baseSales: 700 }),
  it('shirt-knight-armor', 'Knight Armor', 'shirt', 'epic', 2200, { shape: 'armor', primary: '#8D99AE', secondary: '#2B2D42', accent: '#FFC53D' }, 'Battle-tested plate.', { setKey: 'knight', ageDays: 55, baseSales: 560 }),
  it('shirt-space-suit', 'Space Suit', 'shirt', 'epic', 2400, { shape: 'armor', primary: '#E8EEF5', secondary: '#A0AEC0', accent: '#22D3EE' }, 'Pressurized and stylish.', { setKey: 'astro', ageDays: 25, baseSales: 470 }),

  // ── Pants ───────────────────────────────────────────────────────────────
  it('pants-blue-jeans', 'Blue Jeans', 'pants', 'common', 0, { shape: 'jeans', primary: '#1D4E89' }, 'Goes with everything.', { starter: true, forSale: false, ageDays: 400 }),
  it('pants-black-joggers', 'Black Joggers', 'pants', 'common', 0, { shape: 'joggers', primary: '#22223B' }, 'Ready to run.', { starter: true, forSale: false, ageDays: 400 }),
  it('pants-summer-shorts', 'Summer Shorts', 'pants', 'common', 70, { shape: 'shorts', primary: '#F4A261' }, 'Sunshine approved.', { ageDays: 260, baseSales: 4800 }),
  it('pants-pleated-skirt', 'Pleated Skirt', 'pants', 'common', 110, { shape: 'skirt', primary: '#E76F51' }, 'Twirl-tested.', { ageDays: 220, baseSales: 3700 }),
  it('pants-white-chinos', 'White Chinos', 'pants', 'common', 120, { shape: 'jeans', primary: '#EDE6DB' }, 'Crisp and clean.', { ageDays: 190, baseSales: 2900 }),
  it('pants-plaid-skirt', 'Plaid Skirt', 'pants', 'uncommon', 200, { shape: 'skirt', primary: '#8E1C2E', secondary: '#FFC53D', pattern: 'checker' }, 'Tartan with attitude.', { ageDays: 150, baseSales: 2400 }),
  it('pants-camo-cargo', 'Camo Cargo', 'pants', 'uncommon', 220, { shape: 'cargo', primary: '#606C38', secondary: '#283618', pattern: 'dots' }, 'Pockets for days.', { setKey: 'street', ageDays: 140, baseSales: 3100 }),
  it('pants-pirate-trousers', 'Deckhand Trousers', 'pants', 'uncommon', 260, { shape: 'cargo', primary: '#3D2B1F' }, 'Salt-stained and sturdy.', { setKey: 'pirate', ageDays: 65, baseSales: 1200 }),
  it('pants-space-pants', 'Space Pants', 'pants', 'rare', 900, { shape: 'armor_legs', primary: '#E8EEF5', accent: '#22D3EE' }, 'Moonwalk ready.', { setKey: 'astro', ageDays: 25, baseSales: 560 }),
  it('pants-knight-greaves', 'Knight Greaves', 'pants', 'epic', 1400, { shape: 'armor_legs', primary: '#8D99AE', accent: '#FFC53D' }, 'Shin protection, deluxe.', { setKey: 'knight', ageDays: 55, baseSales: 520 }),

  // ── Shoes ───────────────────────────────────────────────────────────────
  it('shoes-white-sneakers', 'White Sneakers', 'shoes', 'common', 0, { shape: 'sneakers', primary: '#F8F9FA', accent: '#3A86FF' }, 'Fresh out of the box.', { starter: true, forSale: false, ageDays: 400 }),
  it('shoes-black-sneakers', 'Black Sneakers', 'shoes', 'common', 0, { shape: 'sneakers', primary: '#212529', accent: '#ADB5BD' }, 'Scuff-proof style.', { starter: true, forSale: false, ageDays: 400 }),
  it('shoes-beach-sandals', 'Beach Sandals', 'shoes', 'common', 50, { shape: 'sandals', primary: '#2EC4B6' }, 'Sand optional.', { ageDays: 250, baseSales: 4200 }),
  it('shoes-hiking-boots', 'Hiking Boots', 'shoes', 'common', 120, { shape: 'boots', primary: '#7F5539', secondary: '#B08968' }, 'Trail tough.', { ageDays: 210, baseSales: 3000 }),
  it('shoes-red-hightops', 'Red Hightops', 'shoes', 'uncommon', 180, { shape: 'hightops', primary: '#E63946', accent: '#FFFFFF' }, 'Laced up and loud.', { setKey: 'street', ageDays: 170, baseSales: 5600 }),
  it('shoes-pirate-boots', 'Captain Boots', 'shoes', 'uncommon', 240, { shape: 'boots', primary: '#1B1B1E', secondary: '#FFC53D' }, 'Buckled for the storm.', { setKey: 'pirate', ageDays: 65, baseSales: 1300 }),
  it('shoes-knight-sabatons', 'Knight Sabatons', 'shoes', 'rare', 600, { shape: 'boots', primary: '#8D99AE', secondary: '#FFC53D' }, 'Clank clank.', { setKey: 'knight', ageDays: 55, baseSales: 610 }),
  it('shoes-rocket-boots', 'Rocket Boots', 'shoes', 'epic', 1900, { shape: 'rocket', primary: '#A0AEC0', accent: '#FF7B00' }, 'Jump higher. Allegedly.', { setKey: 'astro', ageDays: 25, baseSales: 430 }),
  it('shoes-gold-kicks', 'Gold Kicks', 'shoes', 'legendary', 5000, { shape: 'hightops', primary: '#FFC53D', accent: '#FFFFFF', glow: true }, 'Walk on gold.', { ageDays: 14, baseSales: 180 }),

  // ── Limited collectibles (finite stock, serial numbers) ─────────────────
  it('ltd-frost-crown', 'Frost Crown', 'hat', 'mythic', 15000, { shape: 'crown', primary: '#BDE7FF', accent: '#7FDBFF', glow: true }, 'Carved from never-melting ice. Only 100 exist.', { limited: { stock: 100, sold: 58 }, featured: true, ageDays: 8 }),
  it('ltd-void-wings', 'Void Wings', 'back', 'mythic', 22000, { shape: 'wings', primary: '#10002B', secondary: '#7B2CBF', glow: true }, 'Woven from the space between stars. Only 50 exist.', { limited: { stock: 50, sold: 47 }, ageDays: 20 }),
  it('ltd-prism-visor', 'Prism Visor', 'face_accessory', 'legendary', 8000, { shape: 'visor', primary: '#FF4D6D', secondary: '#22D3EE', glow: true }, 'Splits light into pure style. Only 200 exist.', { limited: { stock: 200, sold: 61 }, ageDays: 5 }),
  it('ltd-ember-horns', 'Ember Horns', 'hat', 'legendary', 9500, { shape: 'horns', primary: '#FF7B00', secondary: '#FFD166', glow: true }, 'Still warm to the touch. Only 150 exist.', { limited: { stock: 150, sold: 70 }, ageDays: 33 }),
  it('ltd-celestial-cape', 'Celestial Cape', 'back', 'mythic', 18000, { shape: 'cape', primary: '#0B132B', secondary: '#5BC0EB', pattern: 'stars', glow: true }, 'The first Blockora limited. Only 40 were ever made.', { limited: { stock: 40, sold: 40 }, ageDays: 120 }),

  // ── Seasonal exclusives (only purchasable during their season) ──────────
  it('sea-neon-hoodie', 'Neon Hoodie', 'shirt', 'rare', 650, { shape: 'hoodie', primary: '#111827', secondary: '#39FF14', glow: true }, 'Neon Harvest exclusive.', season('neon_harvest', 12)),
  it('sea-neon-joggers', 'Neon Joggers', 'pants', 'rare', 450, { shape: 'joggers', primary: '#111827', accent: '#39FF14', pattern: 'stripes' }, 'Neon Harvest exclusive.', season('neon_harvest', 12)),
  it('sea-neon-kicks', 'Neon Kicks', 'shoes', 'rare', 500, { shape: 'sneakers', primary: '#111827', accent: '#39FF14', glow: true }, 'Neon Harvest exclusive.', season('neon_harvest', 12)),
  it('sea-neon-mohawk', 'Neon Mohawk', 'hair', 'epic', 1400, { shape: 'mohawk', primary: '#39FF14', glow: true }, 'Neon Harvest exclusive.', season('neon_harvest', 6)),
  it('sea-pumpkin-beanie', 'Pumpkin Beanie', 'hat', 'uncommon', 260, { shape: 'beanie', primary: '#FF8C42', secondary: '#6A994E' }, 'Neon Harvest exclusive.', season('neon_harvest', 9)),
  it('sea-frost-scarf', 'Frost Scarf', 'neck', 'uncommon', 300, { shape: 'scarf', primary: '#BDE7FF', secondary: '#FFFFFF', pattern: 'stripes' }, 'Frostbyte Festival exclusive.', season('frostbyte', 2)),
  it('sea-snow-beanie', 'Snowflake Beanie', 'hat', 'uncommon', 280, { shape: 'beanie', primary: '#E0FBFC', secondary: '#3D5A80', pattern: 'stars' }, 'Frostbyte Festival exclusive.', season('frostbyte', 2)),
  it('sea-ice-skates', 'Ice Skates', 'shoes', 'rare', 600, { shape: 'boots', primary: '#FFFFFF', secondary: '#9AD1FF' }, 'Frostbyte Festival exclusive.', season('frostbyte', 2)),
  it('sea-bloom-crown', 'Flower Crown', 'hat', 'rare', 550, { shape: 'crown', primary: '#FF8FAB', accent: '#90BE6D' }, 'Bloom Rush exclusive.', season('bloom', 2)),
  it('sea-bloom-dress', 'Petal Skirt', 'pants', 'uncommon', 320, { shape: 'skirt', primary: '#FFC8DD', secondary: '#BDE0FE', pattern: 'dots' }, 'Bloom Rush exclusive.', season('bloom', 2)),
  it('sea-solar-shades', 'Solar Shades', 'face_accessory', 'rare', 520, { shape: 'shades', primary: '#FF9F1C', secondary: '#FFBF69' }, 'Solar Splash exclusive.', season('solar', 2)),
  it('sea-surf-shorts', 'Surf Shorts', 'pants', 'uncommon', 240, { shape: 'shorts', primary: '#00B4D8', secondary: '#FFFFFF', pattern: 'zigzag' }, 'Solar Splash exclusive.', season('solar', 2)),
];

export const SEASONS: Record<SeasonKey, { name: string; tagline: string; colors: [string, string] }> = {
  frostbyte: { name: 'Frostbyte Festival', tagline: 'Glacier-cool drops all winter long.', colors: ['#0EA5E9', '#A5F3FC'] },
  bloom: { name: 'Bloom Rush', tagline: 'Fresh colors are popping up everywhere.', colors: ['#F472B6', '#A3E635'] },
  solar: { name: 'Solar Splash', tagline: 'Turn up the heat with summer exclusives.', colors: ['#F59E0B', '#06B6D4'] },
  neon_harvest: { name: 'Neon Harvest', tagline: 'Glow-in-the-dark gear for the darkest nights.', colors: ['#39FF14', '#7C3AED'] },
};
