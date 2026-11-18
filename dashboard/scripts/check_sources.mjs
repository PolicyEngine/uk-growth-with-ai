// The quiet-sources rule (Vahid: "these links of quick notes make the page
// ugly ... don't make things busy in story tab"). Every figure keeps its
// sources and notes behind one small "Sources and notes" button
// (components/ui/SourceLine.jsx, [data-source-line]); nothing of them shows
// at rest. On the Story at 1280x800 and 390x844, popovers closed, it fails
// when:
//   - a figure (a visible <figure>, or the vitals panel) has no sources
//     button, or more than one;
//   - a source line shows a link, or any source or caveat text shows at rest
//     under a figure (.story-source, .ch-source, .p3-key, .p1-sources, an
//     old inline foot), beyond the essential lines Fable approved
//     (.src-essential, 12 words or fewer, on six figures);
//   - step text (.scrolly-step) holds a citation link: one leaving the
//     dashboard, or one to a source document;
//   - a sources button opens no links, or does not open and close (Enter,
//     Esc, aria-expanded).
// Explore and Method (1280x800) get the per-figure checks too: a figure is a
// <figure> or a chart card (.card with a .chart-plot); reference tables and
// ledgers that ARE lists of sources are not figures.
// Prints the visible underlined links on the Story at each size.
//
//   bun scripts/check_sources.mjs http://localhost:4360   (needs Playwright;
//   CHROMIUM may name a Chrome binary). Exits 1 on any failure.
import { chromium, webkit } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const SIZES = [
  [1280, 800],
  [390, 844],
];
const OTHER = {
  economy: '/?tab=explore',
  finances: '/?tab=explore&sub=finances',
  who: '/?tab=explore&sub=who',
  households: '/?tab=explore&sub=households',
  method: '/?tab=method',
  'household-method': '/?tab=method&sub=households',
};
// BROWSER=webkit runs Playwright's WebKit (an approximation of Safari)
const browser = process.env.BROWSER === 'webkit' ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let fails = 0;
const say = (name, out) => {
  console.log(`${name}: ${out.length}`);
  for (const o of out) console.log(`  ${o}`);
  fails += out.length;
};

// Runs in the page: the rest-state audit of the visible tab panel.
function audit({ story }) {
  const panel = document.querySelector('.tab-panel:not([hidden])');
  const SKIP = '[aria-hidden="true"], [hidden], [inert], .scrolly-sizers, .ch-ghost, .visually-hidden';
  const visible = (el) => {
    if (el.closest(SKIP)) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const where = (el) => el.closest('[id]')?.id ?? el.className;
  const underlined = (a) => {
    for (let e = a; e && e !== panel; e = e.parentElement) if (getComputedStyle(e).textDecorationLine.includes('underline')) return true;
    return false;
  };
  const out = [];
  const links = [...panel.querySelectorAll('a')].filter(visible);
  // figures
  const figs = story
    ? [...panel.querySelectorAll('figure'), ...panel.querySelectorAll('#p1-vitals')].filter(visible)
    : [...panel.querySelectorAll('figure, .card')].filter((f) => visible(f) && (f.matches('figure') || f.querySelector('.chart-plot')) && !f.parentElement.closest('figure, .card'));
  for (const f of figs) {
    // a figure alone in a card may carry its button in the card's title
    const card = f.parentElement?.closest('.card, .info-card');
    const host = card && card.querySelectorAll('figure').length === 1 ? card : f;
    const n = [...host.querySelectorAll('[data-source-line]')].filter(visible).length;
    if (n !== 1) out.push(`${where(f)}: ${n} sources buttons (must be 1)`);
  }
  // source lines show no link at rest; no source or caveat text under a figure
  for (const s of panel.querySelectorAll('[data-source-line]')) {
    const shown = [...s.querySelectorAll('a')].filter(visible);
    if (shown.length) out.push(`${where(s)}: a source line shows ${shown.length} link(s)`);
  }
  const OLD = '.story-source, .ch-source, .p3-key, .p1-sources, .p2-result-links, .ex-src, .card > .disclosure-in-card';
  for (const s of panel.querySelectorAll(OLD)) {
    if (!visible(s) || s.closest('[data-source-line]')) continue;
    const t = s.innerText.replace(/\s+/g, ' ').trim();
    if (t) out.push(`${where(s)}: source or note text at rest (${[...s.querySelectorAll('a')].filter(visible).length} links): ${t.slice(0, 70)}`);
  }
  // the essential caveat lines Fable approved (charts-finale-fable.md, C):
  // one per figure, 12 words or fewer, only on these figures
  const ESSENTIAL = ['p2-shock', 'p2-output', 'story-output', 'p3-central', 'p3-channels', 'p3-changes'];
  for (const e of panel.querySelectorAll('.src-essential')) {
    if (!visible(e)) continue;
    const w = e.innerText.trim().split(/\s+/).length;
    const id = e.closest('.scrolly[id], section[id]')?.id ?? where(e);
    if (w > 12) out.push(`${where(e)}: essential caveat of ${w} words (at most 12)`);
    if (!ESSENTIAL.some((k) => e.closest(`#${k}`))) out.push(`${id}: an essential caveat line on a figure not approved for one: ${e.innerText.trim()}`);
  }
  // step text: no citation links
  const origin = location.origin;
  const DOC = /\.(pdf|csv|xlsx?|json|tex)(\?|#|$)|doi\.org|github\.com|ons\.gov\.uk|obr\.uk|gov\.uk|imf\.org/i;
  for (const a of panel.querySelectorAll('.scrolly-step a')) {
    const h = a.href;
    if (!h.startsWith(origin) || DOC.test(h)) out.push(`${where(a)}: step text cites ${a.textContent.trim().slice(0, 40)} -> ${a.getAttribute('href').slice(0, 60)}`);
  }
  return {
    out,
    figures: figs.length,
    buttons: [...panel.querySelectorAll('[data-source-line]')].filter(visible).length,
    links: links.length,
    underlined: links.filter(underlined).length,
  };
}

// Open every visible sources button with Enter: it must expand, hold links,
// take focus, and close on Esc with focus back on the button.
async function openAll(page) {
  const out = [];
  const n = await page.evaluate(() => {
    const SKIP = '[aria-hidden="true"], [hidden], [inert], .scrolly-sizers';
    const bs = [...document.querySelectorAll('.tab-panel:not([hidden]) [data-source-line] button.src-line-btn')].filter((b) => !b.closest(SKIP) && b.getBoundingClientRect().width > 0);
    bs.forEach((b, i) => b.setAttribute('data-check-src', i));
    return bs.length;
  });
  let opened = 0;
  for (let i = 0; i < n; i++) {
    const b = page.locator(`[data-check-src="${i}"]`);
    await b.scrollIntoViewIfNeeded();
    await b.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(60);
    const r = await page.evaluate((i) => {
      const b = document.querySelector(`[data-check-src="${i}"]`);
      const pop = document.getElementById(b.getAttribute('aria-controls'));
      const links = pop ? [...pop.querySelectorAll('a[href]')].filter((a) => a.getAttribute('href')) : [];
      return { expanded: b.getAttribute('aria-expanded'), pop: !!pop, links: links.length, focusIn: !!pop?.contains(document.activeElement), id: b.closest('[id]')?.id ?? '' };
    }, i);
    if (r.expanded !== 'true' || !r.pop) out.push(`${r.id}: the sources button did not open`);
    else if (!r.links) out.push(`${r.id}: the sources popover holds no link`);
    else if (!r.focusIn) out.push(`${r.id}: focus did not move into the popover`);
    else opened++;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(40);
    const closed = await page.evaluate((i) => {
      const b = document.querySelector(`[data-check-src="${i}"]`);
      return b.getAttribute('aria-expanded') === 'false' && !document.getElementById(b.getAttribute('aria-controls')) && document.activeElement === b;
    }, i);
    if (!closed) out.push(`button ${i}: Esc did not close it and return focus`);
  }
  return { out, opened, n };
}

// Named external links (checks-words2.md, item 8): each is on the Story
// once, visible, with its expected text, opening a new tab with noopener.
// Their URLs were checked by hand (curl, status 200, the right document).
const EXTERNAL = [
  { where: '#beat-7pct', text: 'Doorley et al. (2026)', href: 'https://doi.org/10.26504/jr16' },
  { where: '#beat-7pct', text: 'Briggs and Kodnani (2023)', href: 'https://www.gspublishing.com/content/research/en/reports/2023/03/27/d64e052b-0f6e-45d7-967b-d7be35fabd16.pdf' },
  { where: '#beat-7pct', text: 'Who bears the AI shock?', href: /^https:\/\/github\.com\/PolicyEngine\/uk-ai-study\/blob\/[0-9a-f]{40}\/paper\/main\.pdf$/ },
];
for (const [w, h] of SIZES) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' })).newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const out = [];
  for (const x of EXTERNAL) {
    const r = await page.evaluate(({ where, text }) => {
      const as = [...document.querySelectorAll(`${where} a`)].filter((a) => a.textContent.trim() === text);
      const a = as[0];
      if (!a) return { n: 0 };
      a.scrollIntoView({ block: 'center' });
      const b = a.getBoundingClientRect();
      return { n: as.length, href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel') ?? '', shown: b.width > 0 && b.height > 0 };
    }, { where: x.where, text: x.text });
    const hrefOk = r.n && (typeof x.href === 'string' ? r.href === x.href : x.href.test(r.href));
    if (r.n !== 1) out.push(`${x.where} "${x.text}": ${r.n} links (must be 1)`);
    else if (!hrefOk) out.push(`${x.where} "${x.text}": href ${r.href}`);
    else if (!r.shown) out.push(`${x.where} "${x.text}": not visible`);
    else if (r.target !== '_blank' || !/noopener/.test(r.rel)) out.push(`${x.where} "${x.text}": target ${r.target}, rel ${r.rel}`);
  }
  say(`story ${w}x${h} named external links (${EXTERNAL.length})`, out);
  await page.close();
}
// Two lenses (checks-words2.md, item 10): every link in the close's figure
// (the "can say" chips, the overlap, the two pay figures) resolves to an
// id on the page; a keyboard focus shows a ring; a click lands with the
// target's header (or, for a step card, the card, made the active step)
// in view below the sticky bars, and still: two reads 400ms apart agree.
// A beat lands settled (--ba 1). Motion on, so the landing is the real one.
// The "Leaves out" items are not links.
for (const [w, h] of SIZES) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const out = [];
  const LENS_A = '#story-close .lens-fig a[href*="#"]:not([href^="http"])';
  const hrefs = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((a) => a.getAttribute('href')), LENS_A);
  const plain = await page.evaluate(() => document.querySelectorAll('#story-close .lens-outside a').length);
  if (plain) out.push(`${plain} links among the "Leaves out" items (must be none)`);
  if (hrefs.length !== 10) out.push(`${hrefs.length} links in the lenses (expected 10: 7 chips, the overlap, 2 pay figures)`);
  for (let i = 0; i < hrefs.length; i++) {
    const id = hrefs[i].split('#')[1];
    if (!id || !(await page.evaluate((id) => !!document.getElementById(id), id))) {
      out.push(`${hrefs[i]}: no element with that id`);
      continue;
    }
    await page.evaluate(() => document.getElementById('story-close').scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(1200);
    const link = page.locator(LENS_A).nth(i);
    await link.scrollIntoViewIfNeeded();
    // keyboard: reach it with Tab from the element before it
    await link.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => {
      const a = document.activeElement;
      const cs = getComputedStyle(a);
      return { tag: a.tagName, href: a.getAttribute('href'), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 };
    });
    if (ring.tag !== 'A' || ring.href !== hrefs[i]) out.push(`${hrefs[i]}: not reached by Tab (focus on ${ring.tag} ${ring.href})`);
    else if (!ring.ring) out.push(`${hrefs[i]}: no visible focus ring`);
    await link.click();
    await page.waitForTimeout(1500);
    const read = () =>
      page.evaluate((id) => {
        const el = document.getElementById(id);
        let bars = 0;
        document.querySelectorAll('[data-sticky-bar]').forEach((b) => {
          if (getComputedStyle(b).position === 'sticky') bars = Math.max(bars, b.getBoundingClientRect().bottom);
        });
        const step = el.closest('.scrolly-step');
        // the header: a step card itself; else the first of the scene's
        // question (its pinned question screen or its header), a beat's
        // headline, a heading, that is drawn and in view
        const drawn = (x) => { const r = x.getBoundingClientRect(); const cs = getComputedStyle(x); return r.height > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) > 0 && r.top >= bars - 1 && r.bottom <= innerHeight; };
        const heads = step ? [el] : [...el.querySelectorAll('.q-stage-q, .scene-head-q, .beat-head, h2, h3')];
        const head = heads.find(drawn) ?? heads[0] ?? el;
        const r = head.getBoundingClientRect();
        const beat = el.closest('.story-beat');
        return { head: head.className, top: Math.round(r.top), bottom: Math.round(r.bottom), bars: Math.round(bars), V: innerHeight, active: step ? step.classList.contains('is-active') : null, ba: beat ? getComputedStyle(beat).getPropertyValue('--ba').trim() : null };
      }, id);
    const a1 = await read();
    await page.waitForTimeout(400);
    const a2 = await read();
    const where = `${hrefs[i]} at ${w}x${h}`;
    if (a1.top < a1.bars - 1 || a1.bottom > a1.V) out.push(`${where}: header not in view below the bars (top ${a1.top}, bars ${a1.bars}, bottom ${a1.bottom}, V ${a1.V})`);
    if (Math.abs(a1.top - a2.top) > 1) out.push(`${where}: still moving (${a1.top} then ${a2.top})`);
    if (a1.active === false) out.push(`${where}: the step is not the active step`);
    if (a1.ba != null && a1.ba !== '' && Math.abs(Number(a1.ba) - 1) > 0.001) out.push(`${where}: the beat is not settled (--ba ${a1.ba})`);
    console.log(`  lens link ${where}: ${a1.head} top ${a1.top}, bars ${a1.bars}${a1.active != null ? `, active ${a1.active}` : ''}${a1.ba ? `, --ba ${a1.ba}` : ''}`);
  }
  say(`story ${w}x${h} Two lenses links (${hrefs.length})`, out);
  await page.close();
}
for (const [w, h] of SIZES) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' })).newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const r = await page.evaluate(audit, { story: true });
  console.log(`story ${w}x${h}: ${r.figures} figures, ${r.buttons} sources buttons, ${r.links} visible links, ${r.underlined} visible underlined links`);
  say(`story ${w}x${h} at rest`, r.out);
  const o = await openAll(page);
  say(`story ${w}x${h} opened ${o.opened}/${o.n}`, o.out);
  await page.close();
}
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })).newPage();
  for (const [name, path] of Object.entries(OTHER)) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    const r = await page.evaluate(audit, { story: false });
    say(`${name}: ${r.figures} figures, ${r.buttons} sources buttons`, r.out);
    const o = await openAll(page);
    say(`${name} opened ${o.opened}/${o.n}`, o.out);
  }
}
await browser.close();
console.log(fails ? `FAIL: ${fails}` : 'PASS');
process.exit(fails ? 1 : 0);
