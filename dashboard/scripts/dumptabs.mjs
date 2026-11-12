// Dump each tab panel's innerText for every scenario, as JSON:
//   bun scripts/dumptabs.mjs http://localhost:4330 out.json
// Needs playwright (not a dashboard dependency): run it from a folder that
// has it installed, or with NODE_PATH pointing at one.
import { chromium } from 'playwright';
import fs from 'node:fs';
const [base, out] = process.argv.slice(2);
const exe = process.env.CHROMIUM || `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1169/chrome-mac/Chromium.app/Contents/MacOS/Chromium`;
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const tabs = ['results', 'finances', 'cohorts', 'method', 'literature', 'code'];
const res = {};
for (const s of ['uk_low', 'uk_central', 'uk_high', 'korinek']) {
  res[s] = {};
  for (const t of tabs) {
    await page.goto(`${base}/?tab=${t}&s=${s}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    res[s][t] = await page.evaluate((id) => document.getElementById(`tab-${id}`)?.innerText ?? '', t);
  }
}
fs.writeFileSync(out, JSON.stringify(res));
await browser.close();
