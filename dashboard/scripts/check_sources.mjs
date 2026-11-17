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
//     old inline foot), beyond one optional essential line (.src-essential,
//     12 words or fewer);
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
import { chromium } from 'playwright';

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
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
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
  for (const e of panel.querySelectorAll('.src-essential')) {
    const w = e.innerText.trim().split(/\s+/).length;
    if (visible(e) && w > 12) out.push(`${where(e)}: essential caveat of ${w} words (at most 12)`);
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
