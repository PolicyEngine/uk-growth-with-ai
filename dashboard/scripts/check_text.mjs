// The text rule (Vahid: "not long text / itemize / each text should have
// item"): on every tab, every rendered text block (p, li, dd, figcaption,
// summary, blockquote) is an item: it leads with a plain icon (an svg inside
// it) and is short (at most 12 words for a list item, 25 for any other
// block). Exempt: source citations (.story-source, [data-cite]: length only,
// they still need an icon), reference lists ([data-reference]: changelog,
// ledger, file lists, citations; length and icon), tables, chart text (svg),
// the site header and footer, and anything aria-hidden or visually hidden.
// A legend entry's colour swatch counts as its icon.
//
//   bun scripts/check_text.mjs http://localhost:4360   (needs Playwright;
//   CHROMIUM may name a Chrome binary). Prints violations; exits 1 if any.
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const PAGES = {
  story: '/',
  economy: '/?tab=explore',
  finances: '/?tab=explore&sub=finances',
  who: '/?tab=explore&sub=who',
  all: '/?tab=explore&sub=all',
  households: '/?tab=explore&sub=households',
  method: '/?tab=method',
  'household-method': '/?tab=method&sub=households',
  scenarios: '/?tab=method&sub=scenarios',
  evidence: '/?tab=method&sub=studies',
  data: '/?tab=method&sub=code',
};
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
let total = 0;
for (const [name, path] of Object.entries(PAGES)) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  const bad = await page.evaluate(() => {
    const panel = document.querySelector('.tab-panel:not([hidden])') ?? document.body;
    const out = [];
    for (const el of panel.querySelectorAll('p, li, dd, figcaption, summary, blockquote')) {
      if (el.closest('svg, table, header.site-header, footer, [aria-hidden="true"], .visually-hidden, [data-reference], [hidden]')) continue;
      if (el.querySelector('p, li, dd, figcaption, blockquote')) continue; // leaf blocks only
      const t = el.innerText.replace(/\s+/g, ' ').trim();
      if (!t) continue;
      const words = t.split(' ').length;
      const cite = !!el.closest('.story-source, [data-cite]');
      const max = el.tagName === 'LI' ? 12 : 25;
      // an icon: an svg in the block, or a legend's colour swatch (the key)
      const icon = !!el.querySelector('svg, [class*="swatch"], [data-icon]');
      const why = [];
      if (!cite && words > max) why.push(`${words} words`);
      if (!icon) why.push('no icon');
      if (why.length) out.push(`${el.closest('[id]')?.id ?? ''} <${el.tagName.toLowerCase()}> ${why.join(', ')}: ${t.slice(0, 80)}`);
    }
    return out;
  });
  total += bad.length;
  console.log(`${name}: ${bad.length}`);
  for (const b of bad) console.log(`  ${b}`);
}
await browser.close();
console.log(total ? `FAIL: ${total} text blocks break the rule` : 'PASS');
process.exit(total ? 1 : 0);
