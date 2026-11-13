// Dump each tab panel's innerText for every scenario, as JSON:
//   bun scripts/dumptabs.mjs http://localhost:4350 out.json
// Needs playwright (not a dashboard dependency): run it from a folder that
// has it installed, or with NODE_PATH pointing at one.
import { chromium } from 'playwright';
import fs from 'node:fs';
const [base, out] = process.argv.slice(2);
const exe = process.env.CHROMIUM || `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1169/chrome-mac/Chromium.app/Contents/MacOS/Chromium`;
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// results:<sub>[:<closure>] dumps a Results sub-tab, with the header's
// closure picker set through the address.
// results:finances:<closure>:<rule> sets the fiscal rule (&rule=) and dumps
// the fiscal-rule card's content only; for the unsolved rule ("fixed") it
// records the disabled option instead.
const SUBS = ['summary', 'income', 'economy', 'finances'];
const tabs = [
  ...SUBS.map((s) => `results:${s}`),
  ...['closed', 'both'].flatMap((c) => SUBS.map((s) => `results:${s}:${c}`)),
  'results:finances:central:dn', 'results:finances:closed:dn', 'results:finances:both:dn',
  'results:finances:central:fixed',
  'who', 'scenarios', 'method', 'studies', 'code',
];
const res = {};
for (const s of ['uk_low', 'uk_central', 'uk_high', 'korinek']) {
  res[s] = {};
  for (const t of tabs) {
    const [tab, sub, closure, rule] = t.split(':');
    const q = new URLSearchParams({ tab, s });
    if (sub) q.set('sub', sub);
    if (closure) q.set('closure', closure);
    if (rule && rule !== 'fixed') q.set('rule', rule);
    await page.goto(`${base}/?${q}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    if (rule === 'fixed') {
      const b = page.locator('#fiscal-rule [role="radio"]', { hasText: 'Fixed spending' });
      res[s][t] = `${await b.innerText()} | disabled=${await b.isDisabled()} | checked=${await b.getAttribute('aria-checked')}`;
      continue;
    }
    if (rule) {
      res[s][t] = await page.locator('#fiscal-rule .chart-plot').innerText();
      continue;
    }
    // Axis ticks are scale, not data: hidden before reading the text.
    res[s][t] = await page.evaluate(([id, sb]) => {
      document.querySelectorAll('[data-axis]').forEach((e) => { e.style.display = 'none'; });
      return document.getElementById(sb ? `results-sub-${sb}` : `tab-${id}`)?.innerText ?? '';
    }, [tab, sub]);
  }
}
fs.writeFileSync(out, JSON.stringify(res));
await browser.close();
