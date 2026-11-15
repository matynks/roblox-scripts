// Quick visual smoke run: loads a route, captures console errors and a screenshot.
const { chromium } = require('playwright');

(async () => {
  const base = process.env.E2E_URL ?? 'http://localhost:8090';
  const out = process.env.E2E_OUT ?? 'e2e/screenshots';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/00-welcome.png` });
  console.log('url:', page.url());
  console.log('errors:', JSON.stringify(errors, null, 1).slice(0, 3000));
  await browser.close();
})();
