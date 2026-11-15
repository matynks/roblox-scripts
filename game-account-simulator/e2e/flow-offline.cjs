// End-to-end player journey against the exported web build (offline backend).
// Usage: node e2e/flow-offline.cjs  (expects `node e2e/serve.mjs dist 8090` running)
const { chromium } = require('playwright');

const base = process.env.E2E_URL ?? 'http://localhost:8090';
const out = process.env.E2E_OUT ?? 'e2e/screenshots';
const scale = Number(process.env.E2E_SCALE ?? 1);
const results = [];
const step = async (name, fn) => {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e).slice(0, 300) });
    console.log(`✗ ${name}: ${String(e).slice(0, 300)}`);
  }
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: scale });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  const tid = (id) => page.getByTestId(id).first();
  const username = `Tester${Date.now().toString(36).slice(-5)}`;

  await step('welcome loads', async () => {
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await tid('go-register').waitFor({ timeout: 15000 });
  });

  await step('register validates and creates account', async () => {
    await tid('go-register').click();
    await tid('reg-username').fill('_bad__');
    await page.waitForTimeout(600);
    await shot('01-register-invalid');
    await tid('reg-username').fill(username);
    await page.getByText('Available!').waitFor({ timeout: 8000 });
    await tid('reg-display').fill('Test Pilot');
    await tid('reg-email').fill(`${username.toLowerCase()}@example.com`);
    await tid('reg-password').fill('Sup3rSecret!');
    await tid('reg-confirm').fill('Sup3rSecret!');
    await tid('reg-terms').click();
    await shot('02-register-filled');
    await tid('reg-submit').click();
    await tid('home-screen').waitFor({ timeout: 15000 });
    await page.waitForTimeout(1200);
    await shot('03-home');
  });

  await step('claim daily reward', async () => {
    await tid('claim-daily').click();
    await page.getByText('Day 1 reward').waitFor({ timeout: 8000 });
    await page.waitForTimeout(500);
    await shot('04-daily-claimed');
  });

  await step('browse marketplace and buy an item', async () => {
    await tid('tab-marketplace').click();
    await tid('market-grid').waitFor({ timeout: 10000 });
    await page.waitForTimeout(1200);
    await shot('05-marketplace');
    await tid('market-search').fill('Blockora Cap');
    await page.waitForTimeout(1200);
    await tid('item-hat-blockora-cap').click();
    await tid('item-screen').waitFor();
    await page.waitForTimeout(600);
    await shot('06-item');
    await tid('buy-button').click();
    await tid('confirm-purchase').waitFor();
    await page.waitForTimeout(500);
    await shot('07-purchase-confirm');
    await tid('confirm-purchase').click();
    await page.getByText('Blockora Cap is yours!').waitFor({ timeout: 8000 });
    await tid('wear-now').waitFor({ timeout: 8000 });
    await tid('wear-now').click();
    await page.waitForTimeout(800);
    await shot('08-item-owned');
  });

  await step('avatar editor equips and saves', async () => {
    await page.goto(`${base}/avatar`);
    await tid('avatar-screen').waitFor({ timeout: 10000 });
    await tid('avtab-shirt').click();
    await page.waitForTimeout(300);
    await tid('equip-shirt-basic-red').click();
    await tid('avtab-body').click();
    await tid('skin-#C68642').click();
    await tid('body-broad').click();
    await page.waitForTimeout(500);
    await shot('09-avatar-editing');
    await tid('avatar-save').click();
    await page.getByText('Look saved').waitFor({ timeout: 8000 });
  });

  await step('discover and game details', async () => {
    await tid('tab-discover').click();
    await tid('discover-screen').waitFor();
    await page.waitForTimeout(1000);
    await shot('10-discover');
    await tid('featured-sky-stack').click();
    await tid('game-screen').waitFor();
    await page.waitForTimeout(600);
    await shot('11-game');
  });

  await step('play Sky Stack to game over and get rewarded', async () => {
    await tid('play-button').click();
    await tid('start-run').click();
    await tid('stack-area').waitFor({ timeout: 10000 });
    await page.waitForTimeout(3000); // countdown
    await shot('12-stack-playing');
    // Wait a bit so the server-side elapsed time covers the minimum session length, then tap until the tower falls.
    for (let i = 0; i < 80; i++) {
      if (await tid('play-results').isVisible().catch(() => false)) break;
      await tid('stack-area').click({ force: true }).catch(() => {});
      await page.waitForTimeout(330 + (i % 3) * 90);
    }
    await tid('play-results').waitFor({ timeout: 20000 });
    await page.waitForTimeout(800);
    await shot('13-results');
  });

  await step('play Block Smash (reflex) and pause/resume', async () => {
    await page.goto(`${base}/play/block-smash`);
    await tid('start-run').click();
    await tid('reflex-area').waitFor({ timeout: 10000 });
    await page.waitForTimeout(3200);
    for (let i = 0; i < 25; i++) {
      await tid(`cell-${(i * 5) % 16}`).click({ force: true }).catch(() => {});
      await page.waitForTimeout(80);
    }
    await shot('14-reflex');
    await tid('pause-button').click();
    await tid('pause-menu').waitFor();
    await shot('15-paused');
    await tid('resume').click();
  });

  await step('social: find a simulated player and add as friend', async () => {
    await page.goto(`${base}/search`);
    await tid('search-input').fill('Pixel');
    await tid('search-add-PixelPioneer').click({ timeout: 10000 });
    await page.getByText(/now friends/).waitFor({ timeout: 8000 });
    await shot('16-search');
    await page.goto(`${base}/user/PixelPioneer`);
    await tid('profile-view').waitFor({ timeout: 10000 });
    // the friendship must survive the full page reload above
    await tid('profile-friends-btn').waitFor({ timeout: 5000 });
    await page.waitForTimeout(800);
    await shot('17-other-profile');
    await tid('profile-follow').click();
    await page.waitForTimeout(800);
  });

  await step('my profile, inventory, achievements, transactions', async () => {
    await page.goto(`${base}/profile`);
    await tid('profile-view').waitFor({ timeout: 10000 });
    await page.waitForTimeout(800);
    await shot('18-my-profile');
    await page.goto(`${base}/inventory`);
    await tid('inventory-screen').waitFor({ timeout: 10000 });
    await page.waitForTimeout(800);
    await shot('19-inventory');
    await page.goto(`${base}/achievements`);
    await tid('achievements-screen').waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    await shot('20-achievements');
    await page.goto(`${base}/transactions`);
    await tid('transactions-screen').waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    await shot('21-transactions');
    await page.goto(`${base}/notifications`);
    await tid('notifications-screen').waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    await shot('22-notifications');
  });

  await step('rewards and analytics', async () => {
    await page.goto(`${base}/rewards`);
    await tid('rewards-screen').waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    await shot('23-rewards');
    await page.goto(`${base}/analytics`);
    await tid('analytics-screen').waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    await shot('24-analytics');
  });

  await step('Modify Menu is refused offline', async () => {
    await page.goto(`${base}/modify`);
    await tid('modify-denied').waitFor({ timeout: 10000 });
    await shot('25-modify-denied');
  });

  await step('light theme', async () => {
    await page.goto(`${base}/settings`);
    await tid('settings-screen').waitFor({ timeout: 10000 });
    await tid('theme-light').click();
    await page.waitForTimeout(500);
    await shot('26-settings-light');
    await page.goto(`${base}/home`);
    await tid('home-screen').waitFor({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await shot('27-home-light');
    await page.goto(`${base}/settings`);
    await tid('theme-dark').click();
  });

  await step('session persists across reload; sign out and back in', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await tid('settings-screen').waitFor({ timeout: 15000 });
    await tid('sign-out').click();
    await tid('confirm-ok').click();
    await tid('welcome-screen').waitFor({ timeout: 10000 });
    await tid('go-login').click();
    await tid('login-email').fill(`${username.toLowerCase()}@example.com`);
    await tid('login-password').fill('wrong-password1');
    await tid('login-submit').click();
    await tid('login-error').waitFor({ timeout: 8000 });
    await shot('28-login-error');
    await tid('login-password').fill('Sup3rSecret!');
    await tid('login-submit').click();
    await tid('home-screen').waitFor({ timeout: 15000 });
  });

  console.log('\nconsole errors:', errors.length ? errors.slice(0, 15) : 'none');
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
  require('fs').writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})();
