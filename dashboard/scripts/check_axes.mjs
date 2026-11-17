// The axis rule (Vahid: "plot axes labels should be complete more"): on
// every tab, every chart carries a y-axis title with its unit, marked in
// the DOM with data-axis-title="y" (an SVG <text> or an HTML element)
// inside the chart's figure or card. A chart is an svg[role=img] that
// draws paths, rects, circles or lines, any svg.story-svg, or any svg in a
// .chart-plot or .ch-plot; and HTML charts: a figure on a scrolly figure
// card, a chart Frame (figure.ch-frame), a .chart-plot or [data-chart]. Charts inside aria-hidden, hidden or measuring
// copies are skipped. A figure with no y scale (a Sankey, a tile grid) is
// exempt only when it says so: data-no-axes="<reason>" on the figure or
// card; exemptions are listed. x titles (data-axis-title="x") are counted
// but not required.
//
//   bun scripts/check_axes.mjs http://localhost:4360   (needs Playwright;
//   CHROMIUM may name a Chrome binary). Prints failures; exits 1 if any.
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const PAGES = {
  story: '/',
  economy: '/?tab=explore',
  finances: '/?tab=explore&sub=finances',
  who: '/?tab=explore&sub=who',
  households: '/?tab=explore&sub=households',
  method: '/?tab=method',
  'household-method': '/?tab=method&sub=households',
  evidence: '/?tab=method&sub=studies',
  data: '/?tab=method&sub=code',
};
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })).newPage();
let total = 0;
for (const [name, path] of Object.entries(PAGES)) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => {
    const panel = document.querySelector('.tab-panel:not([hidden])') ?? document.body;
    const SKIP = '[aria-hidden="true"], [hidden], [inert], .scrolly-sizers, .ch-ghost, header.site-header, footer';
    const BOX = 'figure, .ch-frame, .chart-card, .card, .scrolly-graphic-inner, [data-chart], section';
    const svgs = [...panel.querySelectorAll('svg')].filter((s) => {
      if (s.closest(SKIP) || s.parentElement?.closest('svg')) return false;
      const chartish = s.getAttribute('role') === 'img' || s.classList.contains('story-svg') || !!s.closest('.chart-plot, .ch-plot');
      if (!chartish) return false;
      const b = s.getBoundingClientRect();
      if (b.width < 80 || b.height < 40) return false; // icons, swatches
      return !!s.querySelector('path, rect, circle, line, polyline');
    });
    // HTML charts (bars drawn with divs): a figure on a scrolly figure card,
    // a chart Frame, a .chart-plot, or anything marked data-chart
    const boxes = svgs.map((s) => s.closest(BOX) ?? s.parentElement);
    for (const f of panel.querySelectorAll('.scrolly-graphic-inner figure, figure.ch-frame, .chart-plot, [data-chart]')) {
      if (f.closest(SKIP) || f.parentElement?.closest('.scrolly-graphic-inner figure, figure.ch-frame, [data-chart]')) continue;
      const b = f.getBoundingClientRect();
      if (b.width < 80 || b.height < 40) continue;
      const box = f.closest(BOX) ?? f;
      if (!boxes.includes(box)) boxes.push(box);
    }
    const seen = new Set();
    const out = { bad: [], exempt: [], ok: 0, x: 0 };
    const first = (box, sels) => {
      for (const q of sels) {
        const e = box.querySelector(q);
        if (e?.textContent.trim()) return e.textContent;
      }
      return box.querySelector('svg[aria-label], [aria-label]')?.getAttribute('aria-label') ?? '';
    };
    for (const box of boxes) {
      if (seen.has(box)) continue;
      seen.add(box);
      const id = box.id || box.closest('[id]')?.id || '';
      const title = first(box, ['.ch-title', '.chart-title', 'h3', 'h4', '[class*="title"]', 'figcaption']).replace(/\s+/g, ' ').trim().slice(0, 70);
      const ex = box.closest('[data-no-axes]') ?? box.querySelector('[data-no-axes]');
      if (ex) {
        out.exempt.push(`${id} "${title}": ${ex.getAttribute('data-no-axes')}`);
        continue;
      }
      const titled = [...box.querySelectorAll('[data-axis-title="y"]')].some((e) => !e.closest(SKIP));
      if (box.querySelector('[data-axis-title="x"]')) out.x++;
      if (titled) out.ok++;
      else out.bad.push(`${id} "${title}"`);
    }
    return out;
  });
  total += r.bad.length;
  console.log(`${name}: ${r.bad.length} without a y title (${r.ok} with, ${r.x} with an x title, ${r.exempt.length} exempt)`);
  for (const b of r.bad) console.log(`  MISSING y title: ${b}`);
  for (const e of r.exempt) console.log(`  exempt: ${e}`);
}
await browser.close();
console.log(total ? `FAIL: ${total} charts have no y-axis title` : 'PASS');
process.exit(total ? 1 : 0);
