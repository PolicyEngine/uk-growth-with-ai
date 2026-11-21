// The text rule, round 1 (Fable's icon decision, plan section 1).
//
// Length, on every tab: every rendered leaf text block (p, li, dd,
// figcaption, summary, blockquote) is short: at most 12 words for a list
// item, 25 for any other block and for a Finding box's line (.finding-lines
// li, a sentence: it also needs a final full stop and no svg). Exempt from length: source citations
// (.story-source, [data-cite]) and reference lists ([data-reference]).
//
// Icons, on the Story only (Explore and Method no longer fail for a
// missing icon; round 2 brings (b) and (c) to them). An icon marks a kind
// of thing, once per block group; it no longer leads every line.
//   (a) must have exactly one icon: a chart title, a figure title, a step
//       card (its closing line's icon not counted), a takeaway caption, an
//       essential caveat line, a tile caption (Vahid, 21 Nov: "all text
//       should have icon");
//   (b) must have none: the part opener's h2, a topic header, the
//       story beat, source
//       lines, unit lines, axis titles, the model tag, fold summaries and
//       fold bodies, chart notes, legend entries;
//   (c) no leaf text block has more than one icon;
//   (d) at most 220 icons on the Story, and at most 12 in any 800px band;
//   (e) no list marker or bare "N." without its text (below the loop).
// Icons are Lucide svgs (Icon.jsx); copies that are aria-hidden as a whole
// (the question frames, the measuring copies) and hidden elements do not
// count. Prints the icon count per scene, so each part sees its share.
//
// Hyphens, every tab: no U+2011 (non-breaking hyphen) in rendered text,
// svg text included. Names, every tab: no visible "uk-ai-study" (the
// household study's repo slug) outside code. Wording, every tab: no
// visible "AI ... arrives" (the extra AI starts; AI is already here), and
// no "arrive" in any scene question, hint or header. Nowhere, hidden text
// and attributes included: the withdrawn "2 x 0.2" OBR cross-check.
//
// Titles, on the Story only (story-finding-titles-fable.md, 18 Nov): every
// visible figure title (.story-figure-title, .ch-title) and panel head
// (.p3-group-head.p3-group-first) is a finding sentence: (1) 4 to 10
// words (a .p3-long and a .p3-short copy each checked); (2) a finite verb
// from TITLE_VERBS (a new verb is added with its title); (3) no metadata:
// no year range, no trailing ", YYYY", no trailing "by ..." clause with no
// verb before it, no unit words (per cent of, £bn, pp, %); (4) no result
// figure: the only digits allowed are four-digit years, "2010s" and
// decile numbers after "decile(s)"; (5) no full stop at the end and no
// colon; (6) a data line follows: the first unit line after the title in
// its figure is non-empty and names a source (ONS, OBR, OG-UK, IMF, DSIT,
// household study); a panel head needs a unit line of its own, its source
// is its figure's. Text is taken without the "Sources and notes" button
// and the Replay control. A title marked data-title-fallback (a solve
// pending or a condition failed) is exempt and printed, so a fallback in
// the default view is seen. Walked at 1280x900, reduced motion, through
// every card of every scene (scrolly-go), so every card's state's title is
// read; a state shown only on entry (the morph's record, before its first
// card) is not reached here and is covered by part2.test.jsx.
//
// Skipped everywhere: tables, chart text (svg), the site header and
// footer, and anything aria-hidden, visually hidden or [hidden].
//
//   bun scripts/check_text.mjs http://localhost:4360   (needs Playwright;
//   CHROMIUM may name a Chrome binary). Prints violations; exits 1 if any.
import { chromium, webkit } from 'playwright';

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
  detail: '/?tab=method&sub=detail',
};
const MAX_ICONS = 220;
const MAX_BAND = 12;
const BAND = 800;
// BROWSER=webkit runs Playwright's WebKit (an approximation of Safari)
const browser = process.env.BROWSER === 'webkit' ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })).newPage();
let total = 0;
// ONLY=who,finances limits the pages
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
for (const [name, path] of Object.entries(PAGES)) {
  if (ONLY && !ONLY.has(name)) continue;
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
      // The "Sources and notes" button's BookOpen (SourceLine.jsx) is a
      // control, not a text icon: not counted.
      const isIcon = (s) => {
        if (!s.classList.contains('lucide') || !visible(s) || s.closest('.src-line-btn')) return false;
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
        // a Finding box's line is a sentence, not a list item (item 18): at
        // most 25 words, a final full stop, no icon
        const line = el.tagName === 'LI' && el.parentElement?.classList.contains('finding-lines');
        // the close's recap and What's next lines (item 34) are sentences led
        // by an icon, each one line of a two- or three-line list: capped as a paragraph
        const sentence = el.tagName === 'LI' && el.parentElement?.matches('.close-recap, .close-next-list');
        const max = el.tagName === 'LI' && !line && !sentence ? 12 : 25;
        const why = [];
        if (!cite && words > max) why.push(`${words} words`);
        if (line && !/\.$/.test(t)) why.push('no final full stop');
        if (line && el.querySelector('svg')) why.push('an svg in a finding line');
        const n = story ? iconsIn(el).length : 0;
        if (n > 1) why.push(`${n} icons`);
        if (why.length) out.push(`${where(el)} <${el.tagName.toLowerCase()}> ${why.join(', ')}: ${t.slice(0, 80)}`);
      }
      // A Finding box has one icon at most, on its lead (item 18)
      for (const el of panel.querySelectorAll('.finding-lead')) {
        const n = iconsIn(el).length;
        if (n > 1) out.push(`${where(el)} .finding-lead: ${n} icons (at most 1): ${text(el).slice(0, 60)}`);
        // and, title-level, no full stop at the end (Vahid, 18 Nov)
        if (/\.$/.test(text(el))) out.push(`${where(el)} .finding-lead ends in a full stop: ${text(el).slice(0, 60)}`);
      }
      // No non-breaking hyphen (U+2011) anywhere in rendered text, svg
      // included: Inter's subset lacks it, so it falls back to another font.
      // Hyphenated names use a normal hyphen in a nowrap span (Hy.jsx).
      const nb = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = nb.nextNode(); n; n = nb.nextNode()) {
        if (!n.nodeValue.includes('\u2011') || !n.parentElement?.getClientRects().length) continue;
        out.push(`${where(n.parentElement)} U+2011 non-breaking hyphen: ${n.nodeValue.trim().slice(0, 60)}`);
      }
      // The household study is named, not given its repo slug: no visible
      // "uk-ai-study" outside code (commands, paths) and the site's own URLs.
      const sw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = sw.nextNode(); n; n = sw.nextNode()) {
        const el = n.parentElement;
        if (!n.nodeValue.includes('uk-ai-study') || !el?.getClientRects().length || el.closest('code, pre, kbd, [aria-hidden="true"], .visually-hidden')) continue;
        out.push(`${where(el)} repo slug "uk-ai-study" in visible text: ${n.nodeValue.trim().slice(0, 60)}`);
      }
      // Wording (Vahid, 18 Nov): AI does not "arrive" (it is already
      // here); the extra AI starts. No visible "AI ... arrive(s)" in a
      // sentence, svg text (chart markers) included.
      // the withdrawn linear OBR cross-check (surprise2027-runs.md: "2 x 0.2
      // = 0.4%" is gone): nowhere on any tab, hidden text, svg, titles and
      // aria-labels included
      const TWO_X = /\b2\s*[x×]\s*0\.2\b/;
      {
        const all = [document.body.textContent, ...[...document.querySelectorAll('[aria-label], [title]')].map((e) => `${e.getAttribute('aria-label') ?? ''} ${e.getAttribute('title') ?? ''}`)].join('\n');
        const m = all.match(new RegExp(`.{0,40}${TWO_X.source}.{0,20}`));
        if (m) out.push(`withdrawn "2 x 0.2" cross-check on the page: ${m[0].trim()}`);
      }
      const ARRIVE = /\bAI\b[^.:;!?\n]{0,60}\barriv/i;
      for (const line of document.body.innerText.split('\n')) if (ARRIVE.test(line)) out.push(`"AI arrives" wording in visible text: ${line.trim().slice(0, 80)}`);
      for (const t of document.querySelectorAll('svg text')) {
        if (ARRIVE.test(t.textContent) && t.getClientRects().length && !t.closest('[aria-hidden="true"]')) out.push(`${where(t)} "AI arrives" wording in chart text: ${t.textContent.trim().slice(0, 80)}`);
      }
      // and no "arrive" at all in a scene's question, hint or header (18
      // Nov: "then new ones arrive" in the shock scene's hint), the
      // question screens' aria-hidden copies included
      for (const t of document.querySelectorAll('.q-stage-hint, .q-stage-q, .scene-head')) {
        if (/\barriv/i.test(t.textContent)) out.push(`${where(t)} "arrive" wording in a scene's question or hint: ${t.textContent.trim().slice(0, 80)}`);
      }
      if (!story) return { out };
      // (a) exactly one icon
      for (const sel of ['.ch-title', '.scrolly-card', '.story-figure-title', '.scrolly-takeaway', '.src-essential', '.p2-shock-cap']) {
        for (const el of panel.querySelectorAll(sel)) {
          if (el.closest(skip) || !visible(el)) continue;
          // a step card's closing line counts as its own block
          const n = iconsIn(el).filter((s) => sel !== '.scrolly-card' || !s.closest('.scrolly-takeaway-in-step')).length;
          if (n !== 1) out.push(`${where(el)} ${sel}: ${n} icons (must be 1): ${text(el).slice(0, 60)}`);
        }
      }
      // (b) none
      for (const sel of ['.part-opener h2', '.scene-head', '.story-beat', '.story-source', '.ch-source', '.ch-unit', '[data-axis-title]', '.ch-badge', 'details > summary', 'details > :not(summary)', '.ch-note', '.ch-legend li']) {
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
// (e) no bare list marker (Vahid, 18 Nov: "1." and "2." showed while the
// step texts were hidden): on the Story every <ol>/<ul> is layout, so no
// list item may draw a visible ::marker, and no element may show a bare
// "N." whose text is not shown. Checked at 1280x900 (above) and 390x844,
// reduced motion and motion on, at the top of the page and with each
// scene's figure in view.
const MARKERS = () => {
  const panel = document.querySelector('.tab-panel:not([hidden])') ?? document.body;
  const out = [];
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden], .scrolly-sizers, .visually-hidden');
  };
  for (const li of panel.querySelectorAll('li')) {
    if (!shown(li)) continue;
    const cs = getComputedStyle(li);
    if (cs.display !== 'list-item') continue;
    const m = getComputedStyle(li, '::marker');
    const marker = (cs.listStyleType !== 'none' || cs.listStyleImage !== 'none') && m.content !== 'none';
    if (marker) out.push(`${li.closest('[id]')?.id ?? ''} <li> draws a ${cs.listStyleType} marker: ${li.innerText.replace(/\s+/g, ' ').trim().slice(0, 50)}`);
  }
  for (const el of panel.querySelectorAll('li, p, span, div')) {
    if (!shown(el) || el.children.length) continue;
    if (/^\s*\d+\.\s*$/.test(el.textContent)) out.push(`${el.closest('[id]')?.id ?? ''} <${el.tagName.toLowerCase()}> shows a bare "${el.textContent.trim()}"`);
  }
  return out;
};
for (const [W, H] of [[1280, 900], [390, 844]]) {
  for (const motion of ['reduce', 'no-preference']) {
    const p = await (await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: motion })).newPage();
    await p.goto(base + '/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    const seen = new Set(await p.evaluate(MARKERS));
    const ids = await p.evaluate(() => [...document.querySelectorAll('.tab-panel:not([hidden]) .scrolly[id], .tab-panel:not([hidden]) section[id]')].map((e) => e.id));
    for (const id of ids) {
      await p.evaluate((id) => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' }), id);
      await p.waitForTimeout(150);
      for (const m of await p.evaluate(MARKERS)) seen.add(m);
    }
    await p.close();
    total += seen.size;
    console.log(`story markers ${W}x${H} ${motion === 'reduce' ? 'reduced motion' : 'motion'}: ${seen.size}`);
    for (const m of seen) console.log(`  ${m}`);
  }
}
// ---- titles as findings (Story) ----
const TITLE_VERBS = /^(is|are|was|were|has|have|had|puts?|gains?|falls?|rises?|sits?|splits?|covers?|absorbs?|offsets?|brings?|changes?|raises?|forecasts?|moves?|ends?|stays?|costs?|loses?|takes?|holds?|grows?|shifts?|runs?|swung)$/i;
const TITLES = () => {
  const panel = document.querySelector('.tab-panel:not([hidden])') ?? document.body;
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden], .scrolly-sizers, .visually-hidden, [aria-hidden="true"]');
  };
  // the text without the controls; each of a long/short pair on its own
  const read = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll('button, [class^="src-"], [class*=" src-"], [hidden], .p3-head-actions, .p2-text-ghost, .p1-title-ghost, .ch-ghost, [aria-hidden="true"]').forEach((x) => x.remove());
    const pair = [...c.querySelectorAll('.p3-long, .p3-short')];
    const t = (n) => n.textContent.replace(/\s+/g, ' ').trim();
    if (pair.length) {
      const long = c.cloneNode(true);
      long.querySelectorAll('.p3-short').forEach((x) => x.remove());
      const short = c.cloneNode(true);
      short.querySelectorAll('.p3-long').forEach((x) => x.remove());
      return [t(long), t(short)];
    }
    return [t(c)];
  };
  const out = [];
  for (const el of panel.querySelectorAll('.story-figure-title, .ch-title, .p3-group-head.p3-group-first')) {
    if (!shown(el)) continue;
    const group = el.matches('.p3-group-head');
    const fig = el.closest('figure') ?? el.parentElement;
    const units = [...fig.querySelectorAll('.story-figure-unit, .ch-unit')].filter((u) => el.compareDocumentPosition(u) & Node.DOCUMENT_POSITION_FOLLOWING);
    // a panel head's own unit line: the next one after it, before the next head
    const unit = units.find((u) => shown(u)) ?? null;
    out.push({
      where: el.closest('[id]')?.id ?? '',
      texts: read(el),
      fallback: el.hasAttribute('data-title-fallback'),
      group,
      unit: unit ? unit.textContent.replace(/\s+/g, ' ').trim() : '',
      // the figure names its source by its model badge or its Sources and
      // notes button, not in the unit line (item-36-fable.md §1.3: short
      // units carry no source name)
      source: !!fig.querySelector('.ch-badge, .model-line, [data-source-line], .src-line-btn'),
    });
  }
  return out;
};
{
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })).newPage();
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  const seen = new Map();
  const take = (rows) => {
    for (const r of rows) for (const t of r.texts) seen.set(`${r.where}|${t}`, { ...r, text: t });
  };
  take(await p.evaluate(TITLES));
  const scenes = await p.evaluate(() => [...document.querySelectorAll('.tab-panel:not([hidden]) .scrolly[id]')].map((s) => ({ id: s.id, n: s.querySelectorAll('.scrolly-step:not(.is-spacer)').length })));
  for (const sc of scenes) {
    for (let k = 0; k < sc.n; k++) {
      await p.evaluate(({ id, k }) => document.getElementById(id)?.dispatchEvent(new CustomEvent('scrolly-go', { detail: { k, instant: true } })), { id: sc.id, k });
      await p.waitForTimeout(350);
      take(await p.evaluate(TITLES));
    }
  }
  await p.close();
  const bad = [];
  const exempt = [];
  for (const r of seen.values()) {
    const t = r.text;
    if (r.fallback) {
      exempt.push(`${r.where}: "${t}"`);
      continue;
    }
    const words = t.split(' ').filter(Boolean);
    const why = [];
    if (words.length < 4 || words.length > 10) why.push(`${words.length} words (4 to 10)`);
    const bare = words.map((w) => w.replace(/[^\p{L}’'-]/gu, ''));
    const vi = bare.findIndex((w) => TITLE_VERBS.test(w));
    if (vi < 0) why.push('no finite verb (a label, not a sentence)');
    if (/\b\d{4}\s*(to|–|-)\s*(\w+\s)?\d{4}\b/.test(t)) why.push('a year range');
    if (/,\s*\d{4}$/.test(t)) why.push('a trailing year');
    const by = bare.lastIndexOf('by');
    if (by >= 0 && (vi < 0 || vi > by) && !/[,;]/.test(words.slice(by).join(' '))) why.push('a trailing "by ..." clause');
    if (/per cent of|£bn|\bpp\b|%/.test(t)) why.push('unit words');
    const rest = t.replace(/\b\d{4}s?\b/g, '').replace(/\bdeciles?\s+(from\s+)?\d+(\s*(to|and|–|-)\s*\d+)?/gi, '');
    if (/\d/.test(rest)) why.push('a result figure');
    if (/\.$/.test(t)) why.push('a full stop at the end');
    if (/:/.test(t)) why.push('a colon');
    if (!r.unit) why.push('no data line after it');
    else if (!r.source) why.push('its figure has no model badge and no Sources and notes button');
    if (why.length) bad.push(`${r.where}: "${t}": ${why.join('; ')}`);
  }
  total += bad.length;
  console.log(`story titles: ${seen.size} read, ${bad.length} break the title rule, ${exempt.length} fallback${exempt.length === 1 ? '' : 's'}`);
  for (const b of bad) console.log(`  ${b}`);
  for (const e of exempt) console.log(`  fallback (exempt) ${e}`);
}
await browser.close();
console.log(total ? `FAIL: ${total} text blocks break the rule` : 'PASS');
process.exit(total ? 1 : 0);
