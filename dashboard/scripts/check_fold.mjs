// The zeta_K 0.5 card's "More info" fold (checks-words2.md, item 14): on
// Explore, at 1280x800 and 390x844, it starts closed; it opens and closes
// by mouse click, by keyboard (Tab focus, Enter, then Space) and by tap
// (a touch context); the toggle shows a focus ring; and opening it moves
// nothing outside it: the page's scroll position, the card's head and the
// toggle itself stay put, and no layout shift is recorded above it (only
// what follows the fold moves down, by the fold's own height).
//
//   bun scripts/check_fold.mjs http://localhost:4360   (needs Playwright;
//   CHROMIUM may name a Chrome binary; BROWSER=webkit runs WebKit).
import { chromium, webkit } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const browser = process.env.BROWSER === 'webkit' ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const SEL = '#sens-more .disclosure-toggle';
let fails = 0;
const say = (name, out) => {
  console.log(`${name}: ${out.length}`);
  for (const o of out) console.log(`  ${o}`);
  fails += out.length;
};
const state = (page) =>
  page.evaluate((SEL) => {
    const b = document.querySelector(SEL);
    const body = document.getElementById(b.getAttribute('aria-controls'));
    const card = document.getElementById('closure-sensitivity');
    const r = (el) => Math.round(el.getBoundingClientRect().top * 10) / 10;
    return { open: b.getAttribute('aria-expanded') === 'true' && !body.hidden, y: Math.round(scrollY), head: r(card.querySelector('.card-head')), grid: r(card.querySelector('.ex-sg-wrap')), toggle: r(b), h: Math.round(body.getBoundingClientRect().height) };
  }, SEL);
for (const [w, h, touch] of [
  [1280, 800, false],
  [390, 844, true],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && process.env.BROWSER !== 'webkit' ? true : undefined });
  const page = await ctx.newPage();
  await page.goto(base + '/?tab=explore', { waitUntil: 'networkidle' });
  await page.locator(SEL).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const out = [];
  const s0 = await state(page);
  if (s0.open) out.push('open at load (must be closed)');
  // layout shifts above the fold, from here on (Chromium only)
  await page.evaluate(() => {
    window.__ls = [];
    try {
      // a shifted node before the fold (not an ancestor of it) is a shift
      // outside it; what follows the fold moving down is the opening itself
      const fold = document.getElementById('sens-more');
      const where = (n) => (!n || n.contains?.(fold) || fold.contains(n) ? 'in' : n.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING ? 'above' : 'below');
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__ls.push(...(e.sources ?? []).map((s) => where(s.node))))).observe({ type: 'layout-shift' });
    } catch {}
  });
  const check = async (how, want) => {
    await page.waitForTimeout(300);
    const s = await state(page);
    if (s.open !== want) out.push(`${how}: ${want ? 'did not open' : 'did not close'}`);
    if (s.y !== s0.y) out.push(`${how}: the page scrolled (${s0.y} to ${s.y})`);
    if (Math.abs(s.head - s0.head) > 0.5 || Math.abs(s.toggle - s0.toggle) > 0.5 || Math.abs(s.grid - s0.grid) > 0.5) out.push(`${how}: something above the fold moved (head ${s0.head} to ${s.head}, grid ${s0.grid} to ${s.grid}, toggle ${s0.toggle} to ${s.toggle})`);
    return s;
  };
  // mouse
  await page.click(SEL);
  const o1 = await check('click open', true);
  console.log(`  ${w}x${h}: open fold ${o1.h}px tall`);
  await page.click(SEL);
  await check('click close', false);
  // keyboard: focus by Tab from the element before it, then Enter and Space
  await page.locator(SEL).focus();
  // WebKit on macOS moves focus to buttons with Option+Tab, as Safari does
  const tab = process.env.BROWSER === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.keyboard.press(`Shift+${tab}`);
  await page.keyboard.press(tab);
  const ring = await page.evaluate((SEL) => {
    const a = document.activeElement;
    const cs = getComputedStyle(a);
    return a.matches(SEL) && cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
  }, SEL);
  if (!ring) out.push('keyboard: the toggle is not reached by Tab with a visible focus ring');
  await page.keyboard.press('Enter');
  await check('Enter open', true);
  await page.keyboard.press('Space');
  await check('Space close', false);
  // tap
  if (touch) {
    await page.tap(SEL);
    await check('tap open', true);
    await page.tap(SEL);
    await check('tap close', false);
  }
  const ls = await page.evaluate(() => window.__ls ?? []);
  if (ls.includes('above')) out.push(`layout shift above the fold: ${ls.filter((x) => x === 'above').length} sources`);
  console.log(`  ${w}x${h}: layout-shift sources: ${ls.filter((x) => x === 'below').length} below the fold (expected), ${ls.filter((x) => x === 'above').length} above`);
  say(`${process.env.BROWSER ?? 'chromium'} ${w}x${h} More info fold`, out);
  await ctx.close();
}
await browser.close();
console.log(fails ? `FAIL: ${fails}` : 'PASS');
process.exit(fails ? 1 : 0);
