// The sticky header (Vahid, on Explore at ~1000px: "better, why stick that
// much"; then "should be subtab header"). For the Story, each Explore
// sub-tab and each Method sub-tab, at each viewport: load, scroll down
// 1200px, then
//   (1) height: the stack of position:sticky/fixed elements stuck at the
//       top, as one chain from y=0 (an element joins when its top is at or
//       above the chain's bottom + 1px); its bottom must be at most MAX px
//       (88 at 1024 and 1280, 84 at phone widths). The elements counted are
//       printed. A pinned story scene (QStage/Scrolly) is not part of the
//       header and is left out.
//   (2) clipping: no tab or control label inside the stack is cut: its
//       scrollWidth is not above its clientWidth, its text-overflow is not
//       ellipsis with overflow hidden, and its box does not run past an
//       ancestor that clips (overflow hidden/clip, or a scroller without
//       fade edges) or the viewport. Below 1024px a horizontal scroller
//       with fade edges (overflow-x auto/scroll and a mask) is allowed: the
//       label is only scrolled out of view, not cut. From 1024px up the
//       rows must fit (Vahid saw "Househo…" cut by the fade at ~1000px).
//   (3) anchors: on Explore > Economy and Method, follow a jump link (a
//       hash link to an id on the page) and check its target's top lands
//       at or below the stack's bottom.
//
//   bun scripts/check_header.mjs http://localhost:4394 [width height]
//   (no size: 1024x768, 1280x800 and 390x844). CHROMIUM may name a Chrome
//   binary; BROWSER=webkit runs Playwright's WebKit. Exits 1 on a failure.
import { chromium, webkit } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4394';
const SIZES = process.argv[3] ? [[Number(process.argv[3]), Number(process.argv[4] ?? 800)]] : [[1024, 768], [1280, 800], [390, 844]];
const maxFor = (w) => (w <= 600 ? 84 : 88);
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
  data: '/?tab=method&sub=code',
};
// households: a strip tile or a section pill jumps below the stack (Households redesign)
const ANCHORS = new Set(['economy', 'method', 'households']);

const browser = process.env.BROWSER === 'webkit' ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let fails = 0;
for (const [W, H] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  for (const [name, path] of Object.entries(PAGES)) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const desc = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList.length ? `.${[...el.classList].slice(0, 2).join('.')}` : ''}`;
      const shown = (el) => {
        const s = getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05;
      };
      // a pinned story scene is page content, not header
      const notHeader = (el) => el.closest('.qstage, .q-stage, .scrolly, [data-gap-exempt], .story-part, .tab-panel .card, figure');
      const stuck = [];
      for (const el of document.querySelectorAll('body *')) {
        const s = getComputedStyle(el);
        if (s.position !== 'sticky' && s.position !== 'fixed') continue;
        if (!shown(el) || notHeader(el)) continue;
        const b = el.getBoundingClientRect();
        if (b.height <= 0 || b.width < window.innerWidth * 0.5) continue;
        stuck.push({ el, top: b.top, bottom: b.bottom });
      }
      stuck.sort((a, b) => a.top - b.top);
      let bottom = 0;
      const chain = [];
      for (const s of stuck) {
        if (s.top <= bottom + 1 && s.bottom > bottom) {
          bottom = s.bottom;
          chain.push(s);
        } else if (s.top <= bottom + 1 && s.top >= -1) chain.push(s);
      }
      // labels inside the stack
      const LABELS = '.view-tab-label, .settings-chip-text, .settings-chip-seg, .copy-link-text, .story-rail-t, .story-rail-n';
      const clipped = [];
      for (const s of chain) {
        for (const l of s.el.querySelectorAll(LABELS)) {
          if (!shown(l) || l.closest('[aria-hidden="true"]')) continue;
          const lb = l.getBoundingClientRect();
          if (lb.width === 0 && lb.height === 0) continue;
          const ls = getComputedStyle(l);
          // an off-screen copy kept for screen readers (visually hidden)
          if (lb.width <= 1 && lb.height <= 1) continue;
          const text = l.textContent.trim().slice(0, 40);
          if (l.scrollWidth > l.clientWidth + 1 && ls.overflow !== 'visible') {
            clipped.push(`${text} (scrollWidth ${l.scrollWidth} > ${l.clientWidth})`);
            continue;
          }
          if (ls.textOverflow === 'ellipsis' && ls.overflow !== 'visible' && l.scrollWidth > l.clientWidth) {
            clipped.push(`${text} (ellipsis)`);
            continue;
          }
          let scroller = false;
          for (let a = l.parentElement; a && a !== document.body; a = a.parentElement) {
            const as = getComputedStyle(a);
            const scrolls = as.overflowX === 'auto' || as.overflowX === 'scroll';
            // a scroller with fade edges (a mask) only scrolls a label out of
            // view; on desktop (1024px and up) even that counts: the row
            // must fit. A scroller without fade edges clips like hidden.
            const faded = scrolls && ((as.maskImage && as.maskImage !== 'none') || (as.webkitMaskImage && as.webkitMaskImage !== 'none') || a.scrollWidth <= a.clientWidth + 1);
            if (faded && window.innerWidth < 1024) {
              scroller = true;
              break;
            }
            if (scrolls || as.overflowX === 'hidden' || as.overflowX === 'clip') {
              const ab = a.getBoundingClientRect();
              if (lb.left < ab.left - 1 || lb.right > ab.right + 1) {
                clipped.push(`${text} (cut by ${desc(a)})`);
                break;
              }
            }
          }
          if (scroller) continue;
          if (lb.left < -1 || lb.right > window.innerWidth + 1) clipped.push(`${text} (past the viewport)`);
        }
      }
      return { height: Math.round(bottom), chain: chain.map((s) => `${desc(s.el)} ${Math.round(s.top)}-${Math.round(s.bottom)}`), clipped };
    });
    const max = maxFor(W);
    const bad = r.height > max || r.clipped.length > 0;
    let anchorNote = '';
    if (ANCHORS.has(name)) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(200);
      const a = await page.evaluate(() => {
        const link = [...document.querySelectorAll('.tab-panel:not([hidden]) a[href*="#"]')].find((x) => {
          const id = x.getAttribute('href').split('#')[1];
          const t = id && document.getElementById(id);
          return t && t.offsetHeight > 0 && x.offsetHeight > 0;
        });
        if (!link) return null;
        const id = link.getAttribute('href').split('#')[1];
        link.scrollIntoView({ block: 'center', behavior: 'instant' });
        link.click();
        return id;
      });
      if (a) {
        await page.waitForTimeout(900);
        const land = await page.evaluate((id) => {
          let bottom = 0;
          for (const el of document.querySelectorAll('[data-sticky-bar]')) {
            const s = getComputedStyle(el);
            if (s.position !== 'sticky') continue;
            const b = el.getBoundingClientRect();
            if (b.height > 0 && b.top <= bottom + 1) bottom = Math.max(bottom, b.bottom);
          }
          return { top: Math.round(document.getElementById(id).getBoundingClientRect().top), bottom: Math.round(bottom) };
        }, a);
        const ok = land.top >= land.bottom - 1;
        anchorNote = ` · anchor #${a} at ${land.top}px, stack ${land.bottom}px${ok ? '' : ' UNDER THE HEADER'}`;
        if (!ok) fails++;
      } else anchorNote = ' · no jump link found';
    }
    if (bad) fails++;
    console.log(`${bad ? 'FAIL' : 'ok  '} ${W}x${H} ${name}: stuck ${r.height}px (max ${max})${anchorNote}`);
    if (bad || process.env.VERBOSE) {
      console.log(`       stack: ${r.chain.join(' | ') || '(none)'}`);
      for (const c of r.clipped) console.log(`       clipped: ${c}`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log(fails ? `${fails} failure(s)` : 'all ok');
process.exit(fails ? 1 : 0);
