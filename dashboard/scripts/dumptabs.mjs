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
// Results has sub-tabs: each is dumped as results:<sub>
// results:<sub>:<closure> dumps a sub-tab with the closure selector set
const tabs = [
  'results:overview', 'results:income', 'results:variables', 'results:finances',
  'results:variables:closed', 'results:finances:closed', 'results:variables:both', 'results:finances:both',
  'cohorts', 'method', 'literature', 'code',
];
const res = {};
for (const s of ['uk_low', 'uk_central', 'uk_high', 'korinek']) {
  res[s] = {};
  for (const t of tabs) {
    const [tab, sub, closure] = t.split(':');
    await page.goto(`${base}/?tab=${tab}${sub ? `&sub=${sub}` : ''}${closure ? `&closure=${closure}` : ''}&s=${s}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    // Axis ticks are scale, not data: hidden before reading the text.
    res[s][t] = await page.evaluate(([id, sb]) => {
      document.querySelectorAll('[data-axis]').forEach((e) => { e.style.display = 'none'; });
      return document.getElementById(sb ? `sub-${sb}` : `tab-${id}`)?.innerText ?? '';
    }, [tab, sub]);
  }
}
fs.writeFileSync(out, JSON.stringify(res));
await browser.close();
