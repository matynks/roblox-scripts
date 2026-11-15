// Original Larpverse catalog. Every item renders procedurally from {slot, style, colors}.

export const C = {
  black: '#1f2330', white: '#f5f5f7', red: '#e63946', orange: '#f4a261', yellow: '#ffd166', green: '#2a9d8f', lime: '#8ac926',
  blue: '#4f7cff', navy: '#1d3557', purple: '#7b2cbf', pink: '#ff6b9a', brown: '#7f5539', gold: '#e9c46a', silver: '#c0c7d1',
  teal: '#00b4d8', cream: '#f1e3c6', gray: '#6b7280', mint: '#80ed99', lilac: '#c8b6ff', coral: '#ff8c69', blonde: '#f2d17b',
  ice: '#bde0fe', crimson: '#9d0208', forest: '#386641',
};

const PRICE = { common: [25, 150], uncommon: [150, 400], rare: [400, 1200], epic: [1200, 4800], legendary: [5000, 22000], mythic: [25000, 150000] };

function priceFor(rarity, i) {
  const [lo, hi] = PRICE[rarity];
  const steps = [0, 0.15, 0.35, 0.5, 0.7, 0.9];
  const raw = lo + (hi - lo) * steps[i % steps.length];
  const round = raw > 10000 ? 1000 : raw > 1000 ? 100 : raw > 200 ? 25 : 5;
  return Math.round(raw / round) * round;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function buildCatalog() {
  const items = [];
  let n = 0;
  const add = (category, slot, name, style, colors, rarity = 'common', extra = {}) => {
    const sku = extra.sku ?? `${category}-${slug(name)}`;
    items.push({
      sku, name, category, slot, rarity,
      asset: { style, colors, ...(extra.glow ? { glow: true } : {}), ...(extra.pattern ? { pattern: extra.pattern } : {}) },
      price: extra.price ?? priceFor(rarity, n++),
      description: extra.description ?? '',
      tags: extra.tags ?? [],
      isLimited: Boolean(extra.stock),
      stock: extra.stock ?? null,
      onSale: extra.onSale ?? true,
      isFeatured: Boolean(extra.featured),
      bundle: extra.bundle ?? null,
    });
  };

  // Starter outfit — free, granted to every new account.
  add('face', 'face', 'Classic Smile', 'smile', [C.black], 'common', { price: 0, tags: ['starter'], description: 'A friendly default smile.' });
  add('shirt', 'shirt', 'Basic Tee', 'tee', [C.blue], 'common', { price: 0, tags: ['starter'], description: 'A comfy everyday tee.' });
  add('pants', 'pants', 'Basic Jeans', 'jeans', [C.navy], 'common', { price: 0, tags: ['starter'], description: 'Reliable blue jeans.' });
  add('hair', 'hair', 'Starter Side Part', 'sidepart', [C.brown], 'common', { price: 0, tags: ['starter'] });
  add('emote', 'emote', 'Wave', 'wave', [C.yellow], 'common', { price: 0, tags: ['starter'], description: 'Say hello!' });

  // Hats
  const hats = [
    ['Red Ball Cap', 'cap', [C.red, C.white], 'common'], ['Ocean Ball Cap', 'cap', [C.blue, C.white], 'common'], ['Midnight Cap', 'cap', [C.black, C.gold], 'uncommon'],
    ['Cozy Green Beanie', 'beanie', [C.green, C.cream], 'common'], ['Bubblegum Beanie', 'beanie', [C.pink, C.white], 'common'],
    ['Dapper Top Hat', 'tophat', [C.black, C.red], 'rare'], ['Royal Crown', 'crown', [C.gold, C.red], 'epic', { featured: true }],
    ['Frontier Hat', 'cowboy', [C.brown, C.cream], 'uncommon'], ['Studio Headphones', 'headphones', [C.black, C.teal], 'uncommon'],
    ['Golden Halo', 'halo', [C.gold], 'legendary', { glow: true }], ['Ember Horns', 'horns', [C.red, C.orange], 'rare'],
    ['Party Cone', 'partyhat', [C.pink, C.yellow], 'common'], ['Astro Helmet', 'helmet', [C.silver, C.teal], 'rare'],
    ['Painter Beret', 'beret', [C.red], 'common'], ['Bunny Ears', 'bunnyears', [C.white, C.pink], 'uncommon'],
    ['Chef Toque', 'chef', [C.white], 'common'], ['Starry Wizard Hat', 'wizard', [C.purple, C.yellow], 'rare'],
    ['Northern Helm', 'viking', [C.silver, C.brown], 'uncommon'], ['Crystal Tiara', 'tiara', [C.silver, C.pink], 'rare'],
    ['Flower Crown', 'flowercrown', [C.pink, C.green], 'uncommon'], ['Signal Antenna', 'antenna', [C.lime, C.black], 'common'],
    ['Noir Fedora', 'fedora', [C.gray, C.black], 'uncommon'], ['Hooded Cowl', 'hood', [C.navy], 'common'],
  ];
  for (const [name, style, colors, rarity, extra] of hats) add('hat', 'hat', name, style, colors, rarity, extra);

  // Hair
  const hair = [
    ['Spiky Black', 'spiky', [C.black]], ['Spiky Blonde', 'spiky', [C.blonde]], ['Electric Blue Spikes', 'spiky', [C.blue], 'uncommon'],
    ['Chestnut Bob', 'bob', [C.brown]], ['Cotton Candy Bob', 'bob', [C.pink], 'uncommon'], ['Long Raven Hair', 'long', [C.black]],
    ['Long Golden Hair', 'long', [C.blonde]], ['Curly Brown', 'curly', [C.brown]], ['Curly Copper', 'curly', [C.coral], 'uncommon'],
    ['Lime Mohawk', 'mohawk', [C.lime], 'uncommon'], ['Hot Pink Mohawk', 'mohawk', [C.pink], 'uncommon'], ['Top Bun', 'bun', [C.black]],
    ['Brown Ponytail', 'ponytail', [C.brown]], ['Violet Ponytail', 'ponytail', [C.purple], 'uncommon'], ['Classic Afro', 'afro', [C.black]],
    ['Blonde Side Part', 'sidepart', [C.blonde]], ['Buzz Cut', 'buzz', [C.brown]], ['Pink Pigtails', 'pigtails', [C.pink], 'uncommon'],
    ['Teal Waves', 'wavy', [C.teal], 'rare'], ['Silver Waves', 'wavy', [C.silver], 'rare'],
  ];
  for (const [name, style, colors, rarity = 'common'] of hair) add('hair', 'hair', name, style, colors, rarity);

  // Faces
  const faces = [
    ['Big Grin', 'grin'], ['Too Cool', 'cool', 'uncommon'], ['Wink', 'wink'], ['Determined', 'determined'], ['Sleepy', 'sleepy'],
    ['Surprised', 'surprised'], ['Cheeky', 'cheeky'], ['Happy Days', 'happy'], ['Smirk', 'smirk', 'uncommon'], ['Kawaii', 'kawaii', 'uncommon'],
    ['Robo Face', 'robot', 'rare'], ['Grumpy', 'angry'], ['Starstruck', 'stars', 'rare'],
  ];
  for (const [name, style, rarity = 'common'] of faces) add('face', 'face', name, style, [C.black], rarity);

  // Accessories by slot
  const acc = [
    ['face_acc', 'Round Glasses', 'glasses', [C.black], 'common'], ['face_acc', 'Aviator Shades', 'shades', [C.black, C.gold], 'uncommon'],
    ['face_acc', 'Gentleman Monocle', 'monocle', [C.gold], 'rare'], ['face_acc', 'Masquerade Mask', 'mask', [C.purple, C.gold], 'rare'],
    ['face_acc', 'Pirate Eyepatch', 'eyepatch', [C.black], 'common'], ['face_acc', 'Cyber Visor', 'visor', [C.teal], 'uncommon'],
    ['face_acc', 'Heart Glasses', 'heartglasses', [C.pink], 'uncommon'],
    ['neck', 'Knit Scarf', 'scarf', [C.red, C.white], 'common'], ['neck', 'Gold Chain', 'chain', [C.gold], 'rare'],
    ['neck', 'Bow Tie', 'bowtie', [C.red], 'common'], ['neck', 'Office Tie', 'tie', [C.navy], 'common'],
    ['neck', 'Pearl Necklace', 'necklace', [C.white], 'uncommon'], ['neck', 'Bandana', 'bandana', [C.red], 'common'],
    ['back', 'Feather Wings', 'wings', [C.white, C.ice], 'epic'], ['back', 'Hero Cape', 'cape', [C.red], 'rare'],
    ['back', 'Adventure Backpack', 'backpack', [C.orange, C.brown], 'common'], ['back', 'Wooden Sword', 'sword', [C.brown, C.silver], 'common'],
    ['back', 'Rock Guitar', 'guitar', [C.red, C.black], 'uncommon'], ['back', 'Rocket Jetpack', 'jetpack', [C.silver, C.orange], 'epic'],
    ['back', 'Seraph Wings', 'angelwings', [C.gold, C.white], 'legendary', { glow: true }], ['back', 'Dusk Wings', 'batwings', [C.black, C.purple], 'rare'],
    ['shoulder', 'Pal Parrot', 'parrot', [C.green, C.red], 'uncommon'], ['shoulder', 'Shoulder Kitty', 'cat', [C.orange, C.white], 'uncommon'],
    ['shoulder', 'Baby Dragon', 'dragon', [C.purple, C.yellow], 'legendary'], ['shoulder', 'Wise Owl', 'owl', [C.brown, C.cream], 'rare'],
    ['waist', 'Leather Belt', 'belt', [C.brown, C.gold], 'common'], ['waist', 'Tool Belt', 'toolbelt', [C.brown, C.silver], 'common'],
    ['waist', 'Fox Tail', 'tail', [C.orange, C.white], 'uncommon'],
  ];
  for (const [slot, name, style, colors, rarity, extra] of acc) add('accessory', slot, name, style, colors, rarity, extra);

  // Clothing
  const shirts = [
    ['Sunset Tee', 'tee', [C.orange]], ['Mint Tee', 'tee', [C.mint]], ['Midnight Tee', 'tee', [C.black]],
    ['Sailor Stripes', 'stripes', [C.white, C.navy]], ['Candy Stripes', 'stripes', [C.pink, C.white]], ['Cloud Hoodie', 'hoodie', [C.gray]],
    ['Neon Hoodie', 'hoodie', [C.lime, C.black], 'uncommon'], ['Varsity Jacket', 'jacket', [C.navy, C.cream], 'uncommon'],
    ['Leather Jacket', 'jacket', [C.black, C.silver], 'rare'], ['Business Suit', 'suit', [C.navy, C.white], 'uncommon'],
    ['Tuxedo', 'suit', [C.black, C.white], 'rare'], ['Star Tee', 'star', [C.purple, C.yellow]], ['Beach Tank', 'tank', [C.teal]],
    ['Lumber Flannel', 'flannel', [C.red, C.black]], ['Cozy Sweater', 'sweater', [C.cream, C.brown]], ['Team Jersey', 'jersey', [C.blue, C.white]],
    ['Knight Armor', 'armor', [C.silver, C.gray], 'rare'], ['Sundress', 'dress', [C.yellow, C.white]], ['Gala Gown', 'dress', [C.purple, C.gold], 'rare'],
    ['Police Uniform', 'uniform', [C.navy, C.gold], 'uncommon'], ['Medic Scrubs', 'scrubs', [C.teal, C.white], 'uncommon'],
  ];
  for (const [name, style, colors, rarity = 'common'] of shirts) add('shirt', 'shirt', name, style, colors, rarity);
  const pants = [
    ['Black Jeans', 'jeans', [C.black]], ['Light Wash Jeans', 'jeans', [C.ice]], ['Summer Shorts', 'shorts', [C.coral]],
    ['Cargo Pants', 'cargo', [C.forest]], ['Pleated Skirt', 'skirt', [C.navy]], ['Pink Skirt', 'skirt', [C.pink]], ['Track Joggers', 'joggers', [C.gray, C.white]],
    ['Suit Trousers', 'suitpants', [C.navy], 'uncommon'], ['Tux Trousers', 'suitpants', [C.black], 'uncommon'], ['Armored Greaves', 'armorlegs', [C.silver], 'rare'],
  ];
  for (const [name, style, colors, rarity = 'common'] of pants) add('pants', 'pants', name, style, colors, rarity);

  // Animation packs and emotes
  const anims = [
    ['Robot Animation Pack', 'robot', 'rare'], ['Ninja Animation Pack', 'ninja', 'rare'], ['Bubbly Animation Pack', 'bubbly', 'uncommon'],
    ['Zombie Animation Pack', 'zombie', 'uncommon'], ['Levitation Animation Pack', 'levitate', 'epic'], ['Elder Animation Pack', 'elder', 'common'],
    ['Superhero Animation Pack', 'superhero', 'epic'], ['Cartoony Animation Pack', 'cartoony', 'uncommon'],
  ];
  for (const [name, style, rarity] of anims) add('animation', 'animation', name, style, [C.purple], rarity);
  const emotes = [
    ['Dance', 'dance', 'common'], ['Cheer', 'cheer', 'common'], ['Salute', 'salute', 'common'], ['Shrug', 'shrug', 'common'],
    ['Laugh', 'laugh', 'common'], ['Spin', 'spin', 'uncommon'], ['Jump', 'jump', 'common'], ['Clap', 'clap', 'common'], ['Bow', 'bow', 'uncommon'],
    ['Victory Pose', 'victory', 'rare'],
  ];
  for (const [name, style, rarity] of emotes) add('emote', 'emote', name, style, [C.yellow], rarity);

  // Collectibles (limited stock, serial numbers)
  const coll = [
    ['hat', 'Golden Crown of Larpverse', 'crown', [C.gold, C.purple], 'mythic', 100, { glow: true, featured: true }],
    ['shoulder', 'Frost Dragon', 'dragon', [C.ice, C.teal], 'legendary', 250],
    ['back', 'Valkyrie Wings', 'wings', [C.silver, C.gold], 'legendary', 500, { glow: true }],
    ['face_acc', 'Neon Shades', 'shades', [C.pink, C.teal], 'epic', 1000, { glow: true, featured: true }],
    ['aura', 'Rainbow Aura', 'rainbow', [C.pink, C.teal], 'mythic', 300],
    ['aura', 'Shadow Aura', 'shadow', [C.black, C.purple], 'legendary', 750],
    ['hat', 'Diamond Tiara', 'tiara', [C.ice, C.white], 'legendary', 400, { glow: true }],
    ['hat', 'Ember Crown', 'crown', [C.red, C.orange], 'epic', 1500],
    ['aura', 'Frost Aura', 'frost', [C.ice, C.white], 'epic', 2000],
  ];
  for (const [slot, name, style, colors, rarity, stock, extra = {}] of coll) {
    add('collectible', slot, name, style, colors, rarity, { stock, ...extra, description: `Limited collectible — only ${stock.toLocaleString('en-US')} exist. Each copy has a serial number.` });
  }

  // Special (event-only, not for sale)
  add('special', 'hat', "Founder's Halo", 'halo', [C.gold, C.white], 'legendary', { onSale: false, glow: true, price: 0, description: 'Awarded to early Larpverse founders.' });
  add('special', 'aura', 'Spotlight Aura', 'sparkle', [C.yellow, C.white], 'epic', { onSale: false, price: 0, description: 'Awarded to Star Awards winners.' });
  add('special', 'back', 'Event Cape', 'cape', [C.purple, C.gold], 'rare', { onSale: false, price: 0, description: 'For special event participants.' });
  add('special', 'aura', 'Golden Aura', 'gold', [C.gold], 'mythic', { onSale: false, price: 0, description: 'The rarest glow in Larpverse.' });

  // Bundles (resolved to item ids after insert)
  const bundles = [
    ['Space Ranger Bundle', ['hat-astro-helmet', 'shirt-knight-armor', 'pants-armored-greaves', 'accessory-rocket-jetpack', 'animation-superhero-animation-pack'], 'epic', 4200],
    ['Royal Court Bundle', ['hat-royal-crown', 'accessory-hero-cape', 'shirt-tuxedo', 'pants-tux-trousers'], 'epic', 3600],
    ['Street Style Bundle', ['hat-midnight-cap', 'shirt-neon-hoodie', 'pants-track-joggers', 'hat-studio-headphones'], 'uncommon', 650],
    ['Mystic Mage Bundle', ['hat-starry-wizard-hat', 'accessory-dusk-wings', 'shirt-gala-gown', 'face-starstruck'], 'rare', 1800],
    ['City Responder Bundle', ['shirt-police-uniform', 'shirt-medic-scrubs', 'pants-suit-trousers', 'emote-salute'], 'uncommon', 480],
  ];
  for (const [name, children, rarity, price] of bundles) add('bundle', 'bundle', name, 'bundle', [C.purple, C.gold], rarity, { price, bundle: children, description: `Includes ${children.length} items.` });

  return items;
}
