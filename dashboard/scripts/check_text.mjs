// The text rule, round 1 (Fable's icon decision, plan section 1).
//
// Length, on every tab: every rendered leaf text block (p, li, dd,
// figcaption, summary, blockquote) is short: at most 12 words for a list
// item, 25 for any other block. Exempt from length: source citations
// (.story-source, [data-cite]) and reference lists ([data-reference]).
//
// Icons, on the Story only (Explore and Method no longer fail for a
// missing icon; round 2 brings (b) and (c) to them). An icon marks a kind
// of thing, once per block group; it no longer leads every line.
//   (a) must have exactly one icon: a chart title, a figure title, a step
//       card;
//   (b) must have none: the part opener's h2, a topic header, the
//       takeaway caption (typography spec, 17 Nov), a story beat, source
//       lines, unit lines, axis titles, the model tag, fold summaries and
//       fold bodies, chart notes, legend entries;
//   (c) no leaf text block has more than one icon;
//   (d) at most 220 icons on the Story, and at most 12 in any 800px band.
// Icons are Lucide svgs (Icon.jsx); copies that are aria-hidden as a whole
// (the question frames, the measuring copies) and hidden elements do not
// count. Prints the icon count per scene, so each part sees its share.
//
// Skipped everywhere: tables, chart text (svg), the site header and
// footer, and anything aria-hidden, visually hidden or [hidden].
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
  households: '/?tab=explore&sub=households',
  method: '/?tab=method',
  'household-method': '/?tab=method&sub=households',
  evidence: '/?tab=method&sub=studies',
  data: '/?tab=method&sub=code',
};
const MAX_ICONS = 220;
const MAX_BAND = 12;
const BAND = 800;
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })).newPage();
let total = 0;
for (const [name, path] of Object.entries(PAGES)) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  const story = name === 'story';
  const res = await page.evaluate(
    ({ story, MAX_ICONS, MAX_BAND, BAND }) => {
      const panel = document.querySelector('.tab-panel:not([hidden])') ?? document.body;
      const out = [];
      const skip = 'svg, table, header.site-header, footer, [aria-hidden="true"], .visually-hidden, [hidden], .scrolly-sizers';
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
      };
      // a counted icon: a Lucide svg, visible, not inside an aria-hidden copy
      // (Icon.jsx's own span is aria-hidden: look above it)
      const isIcon = (s) => {
        if (!s.classList.contains('lucide') || !visible(s)) return false;
        const p = s.parentElement;
        const host = p && (p.classList.contains('plain-icon') || p.getAttribute('aria-hidden') === 'true') ? p.parentElement : p;
        return !host?.closest('[aria-hidden="true"], .scrolly-sizers, [hidden], .visually-hidden');
      };
      const iconsIn = (el) => [...el.querySelectorAll('svg.lucide')].filter(isIcon);
      const where = (el) => el.closest('[id]')?.id ?? '';
      const text = (el) => el.innerText.replace(/\s+/g, ' ').trim();
      // length, every tab; (c) on the Story
      for (const el of panel.querySelectorAll('p, li, dd, figcaption, summary, blockquote')) {
        if (el.closest(skip)) continue;
        if (el.querySelector('p, li, dd, figcaption, blockquote')) continue; // leaf blocks only
        const t = text(el);
        if (!t) continue;
        const words = t.split(' ').length;
        const cite = !!el.closest('.story-source, [data-cite], [data-reference]');
        const max = el.tagName === 'LI' ? 12 : 25;
        const why = [];
        if (!cite && words > max) why.push(`${words} words`);
        const n = story ? iconsIn(el).length : 0;
        if (n > 1) why.push(`${n} icons`);
        if (why.length) out.push(`${where(el)} <${el.tagName.toLowerCase()}> ${why.join(', ')}: ${t.slice(0, 80)}`);
      }
      if (!story) return { out };
      // (a) exactly one icon
      for (const sel of ['.ch-title', '.scrolly-card', '.story-figure-title']) {
        for (const el of panel.querySelectorAll(sel)) {
          if (el.closest(skip) || !visible(el)) continue;
          const n = iconsIn(el).length;
          if (n !== 1) out.push(`${where(el)} ${sel}: ${n} icons (must be 1): ${text(el).slice(0, 60)}`);
        }
      }
      // (b) none
      for (const sel of ['.part-opener h2', '.scene-head', '.scrolly-takeaway', '.story-beat', '.story-source', '.ch-source', '.ch-unit', '[data-axis-title]', '.ch-badge', 'details > summary', 'details > :not(summary)', '.ch-note', '.ch-legend li']) {
        for (const el of panel.querySelectorAll(sel)) {
          if (el.closest(skip) || !visible(el)) continue;
          const n = iconsIn(el).length;
          if (n) out.push(`${where(el)} ${sel}: ${n} icon${n > 1 ? 's' : ''} (must be none): ${text(el).slice(0, 60)}`);
        }
      }
      // (d) totals: the page and 800px bands; per scene for the report
      const all = [...panel.querySelectorAll('svg.lucide')].filter(isIcon);
      const bands = {};
      const scenes = {};
      for (const s of all) {
        const b = Math.floor((s.getBoundingClientRect().top + window.scrollY) / BAND);
        bands[b] = (bands[b] ?? 0) + 1;
        const sc = s.closest('.scrolly[id], section[id], [id^="story-"]')?.id ?? 'other';
        scenes[sc] = (scenes[sc] ?? 0) + 1;
      }
      if (all.length > MAX_ICONS) out.push(`${all.length} icons on the Story (at most ${MAX_ICONS})`);
      for (const [b, n] of Object.entries(bands)) if (n > MAX_BAND) out.push(`${n} icons in the band ${b * BAND}-${(+b + 1) * BAND}px (at most ${MAX_BAND})`);
      return { out, icons: all.length, scenes };
    },
    { story, MAX_ICONS, MAX_BAND, BAND },
  );
  total += res.out.length;
  console.log(`${name}: ${res.out.length}${res.icons != null ? ` (icons ${res.icons})` : ''}`);
  if (res.scenes) console.log(`  icons per scene: ${Object.entries(res.scenes).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  for (const b of res.out) console.log(`  ${b}`);
}
await browser.close();
console.log(total ? `FAIL: ${total} text blocks break the rule` : 'PASS');
process.exit(total ? 1 : 0);
