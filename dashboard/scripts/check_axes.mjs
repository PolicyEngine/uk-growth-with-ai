// The chart-labelling rules, on the Story and every Explore sub-tab (and,
// for the axis rule, the Method tabs too).
//
// 1 Axis rule (Vahid: "plot axes labels should be complete more"): every
//   chart carries a y-axis or unit title with its unit, marked in the DOM
//   with data-axis-title="y" (an SVG <text> or an HTML element) inside the
//   chart's figure or card. A chart is an svg[role=img] that draws paths,
//   rects, circles or lines, any svg.story-svg, or any svg in a .chart-plot
//   or .ch-plot; and HTML charts: a figure on a scrolly figure card, a chart
//   Frame (figure.ch-frame), a .chart-plot or [data-chart]. A figure with no
//   y scale (a Sankey, a tile grid, a table) is exempt only when it says so:
//   data-no-axes="<reason>" on the figure or card; exemptions are listed.
//
// 2 Label rule (Vahid: "add label of each group, also check for labeling
//   for all other plots"): every series, group, band or region has a
//   visible direct label. The marks of a chart (svg path, line, polyline,
//   rect, circle) are grouped by colour (the stroke of an unfilled mark,
//   else the fill; data-series on a mark or its group names it instead); a
//   group needs one visible text in the chart, not in a legend, whose
//   nearest group it is and that lies within 40px of one of its marks, or
//   a text in the group's colour, or a text inside data-label-for="<the
//   group's data-series>". A group named only in a legend (.ch-legend,
//   .p2-legend, a chip row) is reported as "legend only". Axes, grids,
//   ticks, zero and marker lines, white halos and plot-sized backgrounds
//   are not series.
//
// 3 Overlap rule: no label's box overlaps a mark: a stroked line of another
//   series or of its own (sampled along its length), or a dot or bar that
//   does not contain the label (a value inside its own bar is fine).
//   Filled areas and ribbons are regions, not lines.
//
// 4 Title rule (the figure-header layout, 18 Nov): a figure title that
//   wraps to leave one word alone on its last line while its row has more
//   than 30% of its width free is squeezed by a column; flagged.
//
// 5 HTML dumbbell rule (the foreign-capital dumbbells, ClosureSlope.jsx,
//   .ex-fc): its marks are HTML, so rules 2 and 3 do not see them. In each
//   row a value label overlaps no dot and no other label, and stays inside
//   the card; the axis ticks and the "Forecast path" label stay inside the
//   card and do not overlap each other; a row's name does not overlap its
//   track (on a phone the name sits above it).
//
// Exemptions: data-decorative on an element (or an ancestor) takes it out
// of rules 2 and 3 (an illustration's tiles, a hover ring); data-label-
// exempt="<reason>" on a chart box skips rule 2 for that chart and is
// listed with the reason.
//
// The Story's figures change with scroll (scrolly states), so the Story is
// read at every scroll position (every 120px) and each state of a figure
// that is wholly on screen is checked; Explore pages are read once, after
// a scroll through so every chart has drawn.
//
//   bun scripts/check_axes.mjs http://localhost:4360 [width]   (needs
//   Playwright; CHROMIUM may name a Chrome binary; BROWSER=webkit runs
//   Playwright's WebKit; ONLY=story,who limits the pages). Prints failures;
//   exits 1 if any.
import { chromium, webkit } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const W = Number(process.argv[3] ?? 1280);
const H = W < 700 ? 844 : 900;
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
// the label, overlap and title rules cover the Story and Explore
const LABELLED = new Set(['story', 'economy', 'finances', 'who', 'households']);
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const WEBKIT = process.env.BROWSER === 'webkit';
const browser = WEBKIT ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await (await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'reduce' })).newPage();

// Runs in the page: finds the chart boxes and checks them. `labels` turns
// on rules 2 to 4; `inView` limits it to boxes wholly on screen.
function audit([labels, inView]) {
  const panel = document.querySelector('.tab-panel:not([hidden])') ?? document.body;
  const SKIP = '[aria-hidden="true"], [hidden], [inert], .scrolly-sizers, .ch-ghost, .p2-text-ghost, .p1-title-ghost, header.site-header, footer, nextjs-portal';
  const BOX = 'figure, .ch-frame, .chart-card, .card, .scrolly-graphic-inner, [data-chart], section';
  const LEGEND = '.ch-legend, .p2-legend, .card-legend, [class*="legend"], [role="radiogroup"], .settings-chip-wrap, button:not(.ex-tile-open)';
  const NOT_SERIES = /(^|[\s_-])(grid|axis|axes|zero|tick|marker|band|baseline|leader|guide|track|bg|backdrop|frame|period|crosshair|ref|rule|halo|hit|focus|shade|shadow|swatch|connector|plane|born-mark|hover|cursor)([\s_-]|$)/i;
  const shown = (e) => {
    if (e.closest(SKIP)) return false;
    if (e.checkVisibility && !e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const svgs = [...panel.querySelectorAll('svg')].filter((s) => {
    if (s.closest(SKIP) || s.parentElement?.closest('svg')) return false;
    const chartish = s.getAttribute('role') === 'img' || s.classList.contains('story-svg') || !!s.closest('.chart-plot, .ch-plot');
    if (!chartish) return false;
    const b = s.getBoundingClientRect();
    if (b.width < 80 || b.height < 40) return false;
    return !!s.querySelector('path, rect, circle, line, polyline');
  });
  const boxes = svgs.map((s) => s.closest(BOX) ?? s.parentElement);
  for (const f of panel.querySelectorAll('.scrolly-graphic-inner figure, figure.ch-frame, .chart-plot, [data-chart]')) {
    if (f.closest(SKIP) || f.parentElement?.closest('.scrolly-graphic-inner figure, figure.ch-frame, [data-chart]')) continue;
    const b = f.getBoundingClientRect();
    if (b.width < 80 || b.height < 40) continue;
    const box = f.closest(BOX) ?? f;
    if (!boxes.includes(box)) boxes.push(box);
  }
  const first = (box, sels) => {
    for (const q of sels) {
      const e = [...box.querySelectorAll(q)].find((x) => !x.closest(SKIP) && x.textContent.trim());
      if (e) return e.textContent;
    }
    return box.querySelector('svg[aria-label], [aria-label]')?.getAttribute('aria-label') ?? '';
  };
  const colourOf = (m, s) => {
    const fill = s.fill && s.fill !== 'none' && !s.fill.startsWith('url') && Number(s.fillOpacity) > 0.05 ? s.fill : '';
    const stroke = s.stroke && s.stroke !== 'none' && !s.stroke.startsWith('url') && parseFloat(s.strokeWidth) > 0 && Number(s.strokeOpacity) > 0.05 ? s.stroke : '';
    const tag = m.tagName.toLowerCase();
    if (tag === 'line' || tag === 'polyline' || (tag === 'path' && stroke && (!fill || fill === 'rgb(0, 0, 0)'))) return { c: stroke, kind: 'line' };
    if (tag === 'circle' && (!fill || /255, 255, 255|249, 250, 251/.test(fill))) return { c: stroke, kind: 'dot' };
    return { c: fill, kind: tag === 'path' ? 'area' : tag === 'circle' ? 'dot' : 'rect' };
  };
  const neutral = (c) => !c || /^rgba?\((255, 255, 255|249, 250, 251|243, 244, 246|0, 0, 0, 0)/.test(c) || c === 'transparent';
  const near = (a, p) => Math.hypot(Math.max(a.left - p.x, 0, p.x - a.right), Math.max(a.top - p.y, 0, p.y - a.bottom));
  const isTick = (t) => {
    for (let a = t; a && a.tagName !== 'svg' && a.tagName !== 'FIGURE'; a = a.parentElement) {
      if (a.hasAttribute?.('data-axis') || /(^|[\s_-])(tick|ticks|ax|axis|axes|yt|x)([\s_-]|$)/.test(a.getAttribute?.('class') ?? '')) return true;
    }
    return false;
  };
  const gap = (a, b) => Math.hypot(Math.max(a.left - b.right, 0, b.left - a.right), Math.max(a.top - b.bottom, 0, b.top - a.bottom));
  const inside = (a, b) => a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
  const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  // sample points of a mark, in screen pixels
  const samples = (m, kind) => {
    const r = m.getBoundingClientRect();
    if (kind !== 'line') return { pts: [{ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }, { x: r.left, y: r.top }, { x: r.right, y: r.bottom }], box: r };
    const out = [];
    try {
      const ctm = m.getScreenCTM();
      const svg = m.ownerSVGElement;
      let len = m.getTotalLength();
      // a line drawn in by its dash (dasharray "L L", offset L at the start):
      // only the drawn length counts
      const st = getComputedStyle(m);
      const dash = (st.strokeDasharray || 'none').split(/[ ,]+/).map(parseFloat).filter(Number.isFinite);
      const unit = m.hasAttribute('pathLength') ? parseFloat(m.getAttribute('pathLength')) : len;
      if (dash.length && dash[0] >= unit * 0.9) len = Math.max(0, len * (1 - (parseFloat(st.strokeDashoffset) || 0) / unit));
      if (len <= 1) return { pts: [], box: { left: 0, right: 0, top: 0, bottom: 0 } };
      for (let l = 0; l <= len; l += Math.max(2, len / 400)) {
        const p = m.getPointAtLength(l);
        const q = svg.createSVGPoint();
        q.x = p.x;
        q.y = p.y;
        const s = q.matrixTransform(ctm);
        out.push({ x: s.x, y: s.y });
      }
    } catch {
      out.push({ x: r.left, y: r.top }, { x: r.right, y: r.bottom });
    }
    return { pts: out, box: r };
  };
  const out = [];
  const seen = new Set();
  for (const box of boxes) {
    if (seen.has(box)) continue;
    seen.add(box);
    const br = box.getBoundingClientRect();
    if (inView && (br.top < 0 || br.bottom > innerHeight || br.height < 60)) continue;
    const id = box.id || box.closest('[id]')?.id || '';
    const title = first(box, ['.ch-title', '.chart-title', '.story-figure-title', 'h3', 'h4', '[class*="title"]', 'figcaption']).replace(/\s+/g, ' ').trim().slice(0, 60);
    const rec = { id, title, axis: null, exempt: null, label: [], overlap: [], wrap: [], sig: '' };
    // 1 axis
    const ex = box.closest('[data-no-axes]') ?? box.querySelector('[data-no-axes]');
    if (ex) rec.exempt = ex.getAttribute('data-no-axes');
    else rec.axis = [...box.querySelectorAll('[data-axis-title="y"]')].some((e) => !e.closest(SKIP));
    if (!labels) {
      out.push(rec);
      continue;
    }
    // 4 title wrap: the words of each rendered line of the title's text
    for (const t of box.querySelectorAll('.story-figure-title, .ch-title, .card-head h3')) {
      if (!shown(t)) continue;
      const row = t.getBoundingClientRect();
      const rng = document.createRange();
      const lines = new Map();
      const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!n.textContent.trim() || el.closest(SKIP) || el.closest('.src-line, .visually-hidden') || !shown(el)) continue;
        let off = 0;
        for (const w of n.textContent.split(/(\s+)/)) {
          if (w.trim()) {
            rng.setStart(n, off);
            rng.setEnd(n, off + w.length);
            const rr = [...rng.getClientRects()].find((x) => x.width > 0);
            if (rr) {
              const k = Math.round(rr.top / 6);
              const l = lines.get(k) ?? { right: 0, words: [] };
              l.right = Math.max(l.right, rr.right);
              l.words.push(w);
              lines.set(k, l);
            }
          }
          off += w.length;
        }
      }
      // an inline icon after the words (an Explore tile's enlarge arrow)
      // keeps a last word company
      for (const ic of t.querySelectorAll('svg')) {
        // (icons are aria-hidden, so not tested with shown())
        if (ic.parentElement === t || ic.closest('.src-line') || ic.parentElement.closest('svg') || !ic.getBoundingClientRect().width) continue;
        const rr = ic.getBoundingClientRect();
        const l = lines.get(Math.round(rr.top / 6)) ?? lines.get(Math.round(rr.top / 6) - 1) ?? lines.get(Math.round(rr.top / 6) + 1);
        if (l) l.words.push('[icon]');
      }
      const ls = [...lines.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
      if (ls.length < 2) continue;
      const last = ls[ls.length - 1];
      const widest = Math.max(...ls.map((l) => l.right)) - row.left;
      const free = (row.width - widest) / row.width;
      if (last.words.length === 1 && free > 0.3) rec.wrap.push(`"${t.textContent.trim().slice(0, 50)}" leaves "${last.words[0]}" alone with ${Math.round(free * 100)}% of the row free`);
    }
    // 2 and 3: marks and labels
    const exemptEl = box.closest('[data-label-exempt]');
    if (exemptEl) rec.exempt = (rec.exempt ? `${rec.exempt}; ` : '') + `labels: ${exemptEl.getAttribute('data-label-exempt')}`;
    const groups = new Map();
    const marks = [];
    for (const m of box.querySelectorAll('svg path, svg rect, svg circle, svg line, svg polyline')) {
      if (m.closest('[data-decorative], [data-axis], defs, clipPath, mask, pattern, marker, .src-line, button, .ch-legend, .p2-legend, .card-legend, svg.lucide')) continue;
      if (!shown(m)) continue;
      let nonSeries = false;
      for (let a = m; a && a !== box; a = a.parentElement) {
        if (NOT_SERIES.test(a.getAttribute?.('class') ?? '')) {
          nonSeries = true;
          break;
        }
      }
      if (nonSeries) continue;
      const s = getComputedStyle(m);
      const { c, kind } = colourOf(m, s);
      if (neutral(c)) continue;
      const r = m.getBoundingClientRect();
      const svgR = m.ownerSVGElement?.getBoundingClientRect();
      // a background or plot-sized fill is a region, not a series mark
      if (kind !== 'line' && svgR && r.width * r.height > 0.3 * svgR.width * svgR.height && svgR.height > 30) continue;
      // a straight horizontal or vertical grey rule is a guide
      if (kind === 'line' && (r.width < 1.5 || r.height < 1.5) && /^rgb\((\d+), \1, \1\)$|229, 231, 235|209, 213, 219|156, 163, 175|107, 114, 128|75, 85, 99|55, 65, 81/.test(c)) continue;
      const key = m.closest('[data-series]')?.getAttribute('data-series') ?? c;
      if (m.matches('.is-pour:not(.is-on)')) continue;
      const smp = samples(m, kind);
      if (kind === 'line' && !smp.pts.length) continue;
      marks.push({ m, key, kind, ...smp });
      // a mark in an exempt part (a small multiple's later panels) is still
      // checked for overlaps, not for a label
      if (m.closest('[data-label-exempt]') && !exemptEl) continue;
      const g = groups.get(key) ?? { key, colour: c, n: 0, pts: [], boxes: [] };
      g.n++;
      if (kind === 'line') g.pts.push(...smp.pts);
      else g.boxes.push(r);
      groups.set(key, g);
    }
    rec.sig = [...groups.keys()].join('|');
    // label candidates: visible text in the chart that is not an axis or
    // unit title, the figure's own title, finding or unit line, or a tick
    const all = [...box.querySelectorAll('svg text, [data-label], [data-label-for], [class*="label"], [class*="value"], [class*="name"], [class*="note"], [class*="lab"], li, td, th')].filter(
      (t) => t.textContent.trim() && !t.closest('[data-axis-title], .story-figure-title, .story-figure-unit, .story-figure-kicker, .ch-title, .ch-unit, .card-head, .card-unit, .card-finding, .src-line') && shown(t),
    );
    const texts = all
      // ticks: a bare number on an axis (the text, or its group up to the
      // svg, marked data-axis or classed as a tick or axis)
      .filter((t) => !(isTick(t) && /^[−+-]?[£\d.,]+(%|pp|bn|p)?$/.test(t.textContent.trim())))
      // the innermost text only
      .filter((t) => !all.some((c) => c !== t && t.contains(c) && c.textContent.trim() === t.textContent.trim()));
    const legendOnly = new Set();
    const labelled = new Set();
    for (const t of texts) {
      const inLegend = !!t.closest(LEGEND);
      const r = t.getBoundingClientRect();
      // the colour of its words (a value's tspan may carry the series colour)
      const tw = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
      let tn = tw.nextNode();
      while (tn && !tn.textContent.trim()) tn = tw.nextNode();
      const tel = tn?.parentElement ?? t;
      const tcol = tel.closest('svg') ? getComputedStyle(tel).fill : getComputedStyle(tel).color;
      const forKey = t.closest('[data-label-for]')?.getAttribute('data-label-for');
      if (forKey && groups.has(forKey)) {
        labelled.add(forKey);
        continue;
      }
      const sw = t.querySelector('[style*="--sw"], [class*="swatch"]') ?? t.closest('li, button')?.querySelector('[style*="--sw"], [class*="swatch"]');
      const swc = sw ? getComputedStyle(sw).backgroundColor : '';
      // its distance to each group; it labels the nearest group, and any
      // other within 8px of that (stacked nodes, a bar and its ribbon)
      const dist = new Map();
      for (const g of groups.values()) {
        if (inLegend && (swc === g.colour || tcol === g.colour)) legendOnly.add(g.key);
        let d = !inLegend && tcol === g.colour ? 0 : Infinity;
        for (const p of g.pts) d = Math.min(d, near(r, p));
        for (const b of g.boxes) d = Math.min(d, gap(r, b));
        dist.set(g.key, d);
      }
      if (inLegend || !dist.size) continue;
      const bd = Math.min(...dist.values());
      for (const [k, d] of dist) if (d <= 40 && d <= bd + 8) labelled.add(k);
    }
    // a line drawn wholly under a labelled line (coincident series) shares
    // that line's label (which should then name it: "all versions")
    const under = (g) =>
      g.pts.length > 1 &&
      [...groups.values()].some((o) => o !== g && labelled.has(o.key) && o.pts.length && g.pts.every((p) => o.pts.some((q) => Math.abs(p.x - q.x) < 2.5 && Math.abs(p.y - q.y) < 2.5)));
    if (!exemptEl) {
      for (const g of groups.values()) {
        if (labelled.has(g.key) || under(g)) continue;
        rec.label.push(`${g.n} ${g.n === 1 ? 'mark' : 'marks'} in ${g.key}${legendOnly.has(g.key) ? ' (named only in the legend)' : ''}, no direct label`);
      }
    }
    // 3 overlaps: each label inside the drawing
    for (const t of texts) {
      if (t.closest(LEGEND) || !(t.closest('svg') || t.closest('.ch-plot, .chart-plot, [data-chart], .p3-rows'))) continue;
      const b = t.getBoundingClientRect();
      const r = { left: b.left + 1, right: b.right - 1, top: b.top + 1, bottom: b.bottom - 1 };
      if (r.right <= r.left || r.bottom <= r.top) continue;
      for (const mk of marks) {
        if (mk.m.contains(t) || t.contains(mk.m)) continue;
        if (!hit(r, mk.box)) continue;
        if (mk.kind === 'line') {
          if (mk.pts.some((q) => q.x > r.left && q.x < r.right && q.y > r.top && q.y < r.bottom)) {
            rec.overlap.push(`"${t.textContent.trim().slice(0, 30)}" crosses a ${mk.key} line`);
            break;
          }
        } else if ((mk.kind === 'dot' || mk.kind === 'rect') && !inside(r, mk.box)) {
          rec.overlap.push(`"${t.textContent.trim().slice(0, 30)}" overlaps a ${mk.key} ${mk.kind}`);
          break;
        }
      }
    }
    out.push(rec);
  }
  return out;
}

// Runs in the page: rule 5, the HTML dumbbells.
function dumbbellAudit() {
  const out = [];
  const shown = (e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (!e.checkVisibility || e.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
  };
  const hit = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
  const within = (a, b) => a.left >= b.left - 0.5 && a.right <= b.right + 0.5;
  const say = (e) => e.textContent.trim().slice(0, 30);
  for (const fig of document.querySelectorAll('.ex-fc')) {
    if (!shown(fig)) continue;
    const card = (fig.closest('.card') ?? fig).getBoundingClientRect();
    for (const row of fig.querySelectorAll('.ex-fc-row[data-arm]')) {
      const where = `${row.closest('[data-measure]')?.dataset.measure ?? ''} ${row.dataset.arm}`;
      const vals = [...row.querySelectorAll('.ex-fc-val, .ex-fc-hole')].filter(shown);
      const dots = [...row.querySelectorAll('.ex-fc-dot')].filter(shown).map((d) => d.getBoundingClientRect());
      vals.forEach((v, i) => {
        const b = v.getBoundingClientRect();
        if (dots.some((d) => hit(b, d))) out.push(`${where}: "${say(v)}" overlaps a dot`);
        vals.slice(i + 1).forEach((w) => hit(b, w.getBoundingClientRect()) && out.push(`${where}: "${say(v)}" overlaps "${say(w)}"`));
        if (!within(b, card)) out.push(`${where}: "${say(v)}" runs outside the card`);
      });
      const name = row.querySelector('.ex-fc-rlabel');
      const track = row.querySelector('.ex-fc-track');
      if (name && track && shown(name) && hit(name.getBoundingClientRect(), track.getBoundingClientRect())) out.push(`${where}: the row's name overlaps its track`);
    }
    const axis = [...fig.querySelectorAll('.ex-fc-tick, .ex-fc-zero-label')].filter(shown);
    axis.forEach((t, i) => {
      const b = t.getBoundingClientRect();
      if (!within(b, card)) out.push(`axis: "${say(t)}" runs outside the card`);
      axis.slice(i + 1).forEach((u) => hit(b, u.getBoundingClientRect()) && out.push(`axis: "${say(t)}" overlaps "${say(u)}"`));
    });
  }
  return out;
}

let fails = 0;
const report = (name, recs) => {
  const missing = recs.filter((r) => r.axis === false);
  const exempt = recs.filter((r) => r.exempt);
  console.log(`${name}: ${recs.length} charts; ${missing.length} without a y or unit title, ${exempt.length} exempt`);
  for (const r of missing) console.log(`  MISSING axis/unit title: ${r.id} "${r.title}"`);
  for (const r of exempt) console.log(`  exempt: ${r.id} "${r.title}": ${r.exempt}`);
  for (const r of recs) {
    for (const l of r.label) console.log(`  UNLABELLED: ${r.id} "${r.title}": ${l}`);
    for (const l of r.overlap) console.log(`  OVERLAP: ${r.id} "${r.title}": ${l}`);
    for (const l of r.wrap) console.log(`  TITLE WRAP: ${r.id}: ${l}`);
    fails += r.label.length + r.overlap.length + r.wrap.length;
  }
  fails += missing.length;
};

for (const [name, path] of Object.entries(PAGES)) {
  if (ONLY && !ONLY.has(name)) continue;
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  await page.waitForTimeout(300);
  const labels = LABELLED.has(name);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  if (name === 'story') {
    // every state of every figure, read at each scroll position; the
    // problems of a figure's states are merged, each reported once
    const figs = new Map();
    for (let y = 0; y < total; y += 120) {
      await page.evaluate((t) => window.scrollTo(0, t), y);
      // long enough for a state's entry (labels fade in after their marks)
      await page.waitForTimeout(350);
      for (const r of await page.evaluate(audit, [labels, true])) {
        const f = figs.get(r.id) ?? { ...r, label: new Set(), overlap: new Set(), wrap: new Set() };
        if (r.axis === false && !f.exempt) f.axis = false;
        for (const k of ['label', 'overlap', 'wrap']) r[k].forEach((x) => f[k].add(x));
        figs.set(r.id, f);
      }
    }
    report(name, [...figs.values()].map((f) => ({ ...f, label: [...f.label], overlap: [...f.overlap], wrap: [...f.wrap] })));
  } else {
    for (let y = 0; y < total; y += H) {
      await page.evaluate((t) => window.scrollTo(0, t), y);
      await page.waitForTimeout(60);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    report(name, await page.evaluate(audit, [labels, false]));
    if (labels) {
      const fc = await page.evaluate(dumbbellAudit);
      for (const l of fc) console.log(`  OVERLAP: closure-slope (dumbbells): ${l}`);
      fails += fc.length;
    }
  }
}
await browser.close();
console.log(fails ? `FAIL: ${fails} problems (${W}px, ${WEBKIT ? 'webkit' : 'chromium'})` : `PASS (${W}px, ${WEBKIT ? 'webkit' : 'chromium'})`);
process.exit(fails ? 1 : 0);
