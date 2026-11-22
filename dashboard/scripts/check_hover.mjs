// Hover on every chart (M4, maria-round-brief.md; Vahid, 18 Nov: "all plots
// should be hoverable"). For every rendered chart on every page:
//   1 hover: moving the pointer over its marks shows a value tooltip (a
//     visible [role="tooltip"] or .ch-tip with a digit in it);
//   2 keyboard: the chart (or an element inside it) takes focus, and an
//     arrow key, or the focus itself, shows the tooltip or a live read-out;
//   3 data: every tooltip value that names its source (data-path, a dotted
//     path into the active surprise file) prints that value as the chart's
//     formatter does (the sign, the digits; the unit is not compared).
// A chart is found as check_axes finds it (an svg with role="img", a
// .story-svg, or one inside .chart-plot / .ch-plot), plus the story figures
// drawn as rows or tiles and the value grids (table.ex-mx, table.ex-sg); at
// least 80x40, not in
// [aria-hidden] / [hidden] / [inert]. data-hover-exempt="<reason>" on a
// chart box skips it, listed with the reason (a diagram, a table).
//
//   bun scripts/check_hover.mjs http://localhost:4360 [width height]
//   (CHROMIUM may name a Chrome binary; BROWSER=webkit runs WebKit; ONLY=
//   story,who limits the pages). Prints one line per chart; exits 1 on any
//   miss.
import { chromium, webkit } from 'playwright';
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4360';
const W = Number(process.argv[3] ?? 1280);
const H = Number(process.argv[4] ?? (W < 700 ? 844 : 800));
const PAGES = {
  story: '/',
  economy: '/?tab=explore',
  finances: '/?tab=explore&sub=finances',
  who: '/?tab=explore&sub=who',
  households: '/?tab=explore&sub=households',
  method: '/?tab=method&sub=how',
  overview: '/?tab=method',
  inputs: '/?tab=method&sub=inputs',
  'household-method': '/?tab=method&sub=households',
  evidence: '/?tab=method&sub=studies',
};
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const WEBKIT = process.env.BROWSER === 'webkit';
// the page's active result file (layout.tsx: body[data-data-file]), read
// once from the first page; DATA_DIR may point at the build's src/data
const DATA_DIR = process.env.DATA_DIR ?? new URL('../src/data/', import.meta.url).pathname;
let DATA = null;
const browser = WEBKIT ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'reduce', hasTouch: W < 700 });
const page = await ctx.newPage();

// the charts on the page now, each tagged data-hover-idx; boxes in page px
const FIND = () => {
  const SKIP = '[aria-hidden="true"], [hidden], [inert], .scrolly-sizers, .ch-ghost, .p2-text-ghost, .p1-title-ghost, header.site-header, footer, nextjs-portal';
  const BOX = 'figure, .ch-frame, .chart-card, .card, .scrolly-graphic-inner, [data-chart], section';
  const shown = (e) => !e.closest(SKIP) && (!e.checkVisibility || e.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
  const panel = document.querySelector('.tab-panel:not([hidden])') ?? document.body;
  const out = [];
  // a chart: an svg drawn as one (role img, .story-svg, in a plot box), or
  // a story figure drawn as rows of small svgs or html marks (a waterfall,
  // dumbbells, tiles): the figure is the chart, its plot its marks
  const cands = [];
  for (const s of panel.querySelectorAll('svg')) {
    if (s.parentElement?.closest('svg') || !shown(s)) continue;
    const chartish = s.getAttribute('role') === 'img' || s.classList.contains('story-svg') || !!s.closest('.chart-plot, .ch-plot');
    if (!chartish) continue;
    const b = s.getBoundingClientRect();
    if (b.width < 80 || b.height < 40) continue;
    if (!s.querySelector('path, rect, circle, line, polyline')) continue;
    cands.push([s, s.closest(BOX) ?? s.parentElement]);
  }
  // Method's charts drawn in HTML: the timing, the life cycle, the growth
  // check and each evidence lane
  for (const f of panel.querySelectorAll('figure.mx-tl, figure.mx-olg, #growth-check .mx-kpi-chart, #evidence-lanes .mx-lane')) {
    if (!shown(f) || f.querySelector('[data-hover-svg]')) continue;
    const b = f.getBoundingClientRect();
    if (b.width < 80 || b.height < 40) continue;
    cands.push([f, f]);
  }
  for (const f of panel.querySelectorAll('figure.p3-figure, figure.p2-figure, .lens-fig')) {
    if (!shown(f) || f.querySelector('[data-hover-svg]')) continue;
    const b = f.getBoundingClientRect();
    if (b.width < 80 || b.height < 40) continue;
    if (!f.querySelector('[data-mark], svg rect, svg path, svg circle')) continue;
    cands.push([f, f]);
  }
  // the grids (Across scenarios, debt across scenarios, the ζK grid): a
  // table of values, each cell a hover target
  for (const t of panel.querySelectorAll('table.ex-mx, table.ex-sg')) {
    if (!shown(t)) continue;
    const b = t.getBoundingClientRect();
    if (b.width < 80 || b.height < 40) continue;
    cands.push([t, t.closest('.card, section, figure') ?? t.parentElement]);
  }
  for (const [s, box] of cands) {
    if (box.dataset.hoverIdx || s.dataset.hoverSvg) continue;
    box.dataset.hoverIdx = String(out.length);
    s.dataset.hoverSvg = String(out.length);
    const title = (box.querySelector('.story-figure-title, .card-title, h3, h4, figcaption')?.textContent ?? s.getAttribute('aria-label') ?? '').trim().slice(0, 60);
    out.push({ i: out.length, id: box.id || box.closest('[id]')?.id || '', title, exempt: box.closest('[data-hover-exempt]')?.dataset.hoverExempt ?? null });
  }
  return out;
};
// the one tooltip (ChartHover and Crosshair draw .ch-tip) and the Sankeys'
// own (ruled to stay); an old TipBox (.tip-box) no longer counts
const TIP = '.ch-tip, .sankey-tip';
const tipText = () =>
  page.evaluate((TIP) => {
    const t = [...document.querySelectorAll(TIP)].filter((e) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && Number(s.opacity) > 0.05;
    });
    const live = [...document.querySelectorAll('[aria-live]')].map((e) => e.textContent.trim()).filter((x) => /\d/.test(x));
    return { text: t.map((e) => e.textContent.trim()).join(' | '), paths: t.flatMap((e) => [...e.querySelectorAll('[data-path]')].map((n) => [n.dataset.path, n.textContent.trim()])), live: live.join(' | ') };
  }, TIP);
// points over the chart's marks, in viewport px
const MARKS = (i) => {
  const svg = document.querySelector(`[data-hover-svg="${i}"]`);
  if (!svg) return [];
  const pts = [];
  // a chart's declared hover targets first (ChartHover's data-tip), anywhere
  // in its box
  const box = document.querySelector(`[data-hover-idx="${i}"]`);
  for (const m of box?.querySelectorAll('[data-tip]') ?? []) {
    const r = m.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) pts.push([r.left + r.width / 2, r.top + r.height / 2]);
  }
  if (pts.length) return pts.slice(0, 6);
  for (const m of svg.querySelectorAll('circle, rect, path, line, polyline, [data-mark]')) {
    if (m.closest('[aria-hidden="true"]') && !m.closest('svg[aria-hidden]')) continue;
    const r = m.getBoundingClientRect();
    if (r.width * r.height < 4 && r.width < 2) continue;
    if (r.width > svg.getBoundingClientRect().width * 0.95 && r.height > svg.getBoundingClientRect().height * 0.9) continue;
    pts.push([r.left + r.width / 2, r.top + r.height / 2]);
  }
  // spread: at most 6, from across the chart
  const step = Math.max(1, Math.floor(pts.length / 6));
  return pts.filter((_, k) => k % step === 0).slice(0, 6);
};
// a dotted path into the data; a key may hold a dot ("zk0.1", beside
// "zk0"), so the longest run of segments that names a key is taken; a four-digit segment
// into an array is a year (its index in DATA.years)
const at = (path) => {
  const seg = path.split('.');
  let o = DATA;
  for (let k = 0; k < seg.length && o != null; ) {
    if (Array.isArray(o) && /^\d{4}$/.test(seg[k])) {
      o = o[DATA.years.indexOf(Number(seg[k]))];
      k += 1;
      continue;
    }
    let j = seg.length;
    while (j > k && !(seg.slice(k, j).join('.') in Object(o))) j -= 1;
    if (j === k) return undefined;
    o = o[seg.slice(k, j).join('.')];
    k = j;
  }
  return o;
};
const digits = (s) => (String(s).match(/[−-]?\d+(?:\.\d+)?/) ?? [''])[0].replace('−', '-');

let fails = 0;
const lines = [];
for (const [name, path] of Object.entries(PAGES)) {
  if (ONLY && !ONLY.has(name)) continue;
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  if (!DATA) {
    const file = await page.evaluate(() => document.body.dataset.dataFile);
    if (!file) throw new Error('body[data-data-file] missing: the active data file is unknown');
    DATA = JSON.parse(readFileSync(`${DATA_DIR}${file}`));
  }
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const seen = new Map();
  for (let y = 0; y < total; y += Math.round(H * 0.6)) {
    await page.evaluate((t) => window.scrollTo(0, t), y);
    await page.waitForTimeout(250);
    for (const c of await page.evaluate(FIND)) {
      const key = `${c.id}|${c.title}`;
      if (seen.has(key)) continue;
      if (c.exempt) {
        seen.set(key, { ...c, res: `exempt: ${c.exempt}` });
        continue;
      }
      // the chart in the middle of the screen, settled
      await page.evaluate((i) => document.querySelector(`[data-hover-svg="${i}"]`)?.scrollIntoView({ block: 'center' }), c.i);
      await page.waitForTimeout(700);
      // hover: the marks, then the plot's middle
      let hover = null;
      const pts = await page.evaluate(MARKS, c.i);
      // a chart re-rendered away under the scroll (a phone's per-step copy)
      // is read again on a later pass
      const box = await page.evaluate((i) => {
        const r = document.querySelector(`[data-hover-svg="${i}"]`)?.getBoundingClientRect();
        return r ? [r.left + r.width / 2, r.top + r.height / 2] : null;
      }, c.i);
      if (!box) continue;
      for (const [x, yy] of [...pts, box]) {
        if (yy < 0 || yy > H) continue;
        await page.mouse.move(x, yy);
        await page.waitForTimeout(80);
        const t = await tipText();
        if (/\d/.test(t.text)) {
          hover = t;
          break;
        }
      }
      await page.mouse.move(1, 1);
      // keyboard: the first focusable element of the chart box
      const focused = await page.evaluate((i) => {
        const box = document.querySelector(`[data-hover-idx="${i}"]`);
        const svg = document.querySelector(`[data-hover-svg="${i}"]`);
        // the chart's own focus target: the focusable element around its
        // plot, else one inside it that is not a button or a link
        const g = svg?.closest('[tabindex]:not([tabindex="-1"])') ?? svg?.querySelector('[tabindex]:not([tabindex="-1"])') ?? box?.querySelector('[data-chart-focus]');
        if (!g) return false;
        g.focus();
        return document.activeElement === g;
      }, c.i);
      let key2 = null;
      if (focused) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(80);
        const t = await tipText();
        if (/\d/.test(t.text) || /\d/.test(t.live)) key2 = t;
        await page.keyboard.press('Escape');
        await page.evaluate(() => document.activeElement?.blur());
      }
      // data: each tooltip value that names its path
      const bad = [];
      for (const [p, txt] of [...(hover?.paths ?? []), ...(key2?.paths ?? [])]) {
        const v = at(p);
        if (typeof v !== 'number') continue;
        const d = Number(digits(txt));
        const dp = (digits(txt).split('.')[1] ?? '').length;
        if (!(Math.abs(Number(v.toFixed(dp)) - d) < 1e-9)) bad.push(`${p}: ${txt} against ${v}`);
      }
      const ok = !!hover && !!key2 && !bad.length;
      if (!ok) fails++;
      seen.set(key, { ...c, res: `${ok ? 'ok  ' : 'MISS'} hover ${hover ? 'yes' : 'NO'}, keyboard ${key2 ? 'yes' : focused ? 'NO (no read-out)' : 'NO (not focusable)'}${bad.length ? `, data ${bad.slice(0, 2).join('; ')}` : ''}${hover ? ` · "${hover.text.slice(0, 60)}"` : ''}` });
    }
  }
  lines.push(`${name}: ${seen.size} charts`);
  for (const c of seen.values()) lines.push(`  ${c.res.startsWith('exempt') ? 'ok  ' : ''}${c.res.startsWith('exempt') ? c.res : c.res} ${c.id ? `#${c.id}` : ''} "${c.title}"`);
}
console.log(`check_hover ${WEBKIT ? 'webkit' : 'chromium'} ${W}x${H}`);
console.log(lines.join('\n'));
console.log(fails ? `FAIL: ${fails} chart(s) without hover, keyboard or matching values` : 'PASS');
await browser.close();
process.exit(fails ? 1 : 0);
