// Who gains' stat tiles fit their tiles (Fable 5.2, fix list 14; the
// visual pass found "Under 1% to 45%" and "Up to age 29" running out of a
// half-width tile at 390). On ?tab=explore&sub=who, at 390x844 and 360x780
// (one tile a row at 560px and below) and at 1366x650 (two a row): every
// .stat-value, .ex-dd and .ex-bar-code in .ex-who-tiles has its right edge
// inside its tile, and no tile has scrollWidth > clientWidth. Exits 1 on a
// miss. Each size is checked twice: one foreign-capital case, and Both,
// where one set of tiles carries both cases' values (María re-review M10):
// exactly one .ex-who-tiles row, and .ex-two-k/.ex-two-v inside the tile.
//   bun scripts/check_who_tiles.mjs http://localhost:4360
//   (needs Playwright; CHROMIUM may name a Chrome binary)
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const SIZES = [
  [390, 844, 1],
  [360, 780, 1],
  [1366, 650, 2],
];
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let misses = 0;
for (const [W, H, perRow] of SIZES) for (const q of ['', '&closure=both']) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(`${base}/?tab=explore&sub=who${q}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const rows = document.querySelectorAll('.ex-who-tiles');
    const row = rows[0];
    if (!row) return null;
    const tiles = [...row.children].filter((t) => t.getBoundingClientRect().width > 0);
    const out = [];
    for (const t of tiles) {
      const tr = t.getBoundingClientRect();
      if (t.scrollWidth > t.clientWidth) out.push(`tile scrolls (${t.scrollWidth} > ${t.clientWidth}): "${t.textContent.trim().slice(0, 40)}"`);
      for (const e of t.querySelectorAll('.stat-value, .ex-dd, .ex-bar-code, .ex-two-k, .ex-two-v')) {
        const er = e.getBoundingClientRect();
        if (!er.width) continue;
        if (er.right > tr.right + 0.5) out.push(`"${e.textContent.trim().slice(0, 40)}" ${Math.round(er.right - tr.right)}px past its tile`);
      }
    }
    const tops = tiles.map((t) => Math.round(t.getBoundingClientRect().top));
    const perRow = tops.filter((y) => y === tops[0]).length;
    if (rows.length !== 1) out.push(`${rows.length} rows of tiles (want 1)`);
    return { n: tiles.length, perRow, out };
  });
  if (!r) {
    misses++;
    console.log(`  MISS ${W}x${H}${q}: no .ex-who-tiles on the Who page`);
  } else {
    const bad = r.out.length > 0 || r.perRow !== perRow;
    if (bad) misses++;
    console.log(`  ${bad ? 'MISS' : 'ok  '} ${W}x${H}${q}: ${r.n} tiles, ${r.perRow} a row (want ${perRow})${r.out.length ? `; ${r.out.join('; ')}` : ''}`);
  }
  await page.close();
}
await browser.close();
console.log(misses ? `FAIL: ${misses} sizes with Who tiles out of their box` : 'PASS: Who tiles fit');
process.exit(misses ? 1 : 0);
