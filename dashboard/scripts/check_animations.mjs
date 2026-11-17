// Entry animations (polish round F, Vahid: "bring back animation of this"):
// every figure that animates on entry must still do so, and a landing must
// show its final state.
//
//  - entry: motion on, load fresh, start one screen above the figure's block
//    (above its question moment), and wheel down at a reading speed (SPEED px
//    a frame, under the fast-scroll threshold) until the figure's top is at
//    30% of the screen; sample the figure's marks every 80ms from the start
//    until 1.5s after the stop. The marks' drawn state (opacity, transform,
//    stroke-dashoffset, width and height of their boxes) must take at least 3
//    different values: a static figure is a miss.
//  - landing: load fresh, jump there in one instant scroll, and the marks
//    150ms after must match the marks 2.5s after (the final state at once).
//  - the hero plays on load (it is the top of the page): sampled from load.
//
// Under reduced motion nothing is checked here (check_states draws every
// state there). Looping decorations (an infinite animation) are ignored.
//
//   bun scripts/check_animations.mjs http://localhost:4360 [width height]
//   (default 1280 800). Exits 1 on a miss.
import { chromium, webkit } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const W = Number(process.argv[3] ?? 1280);
const H = Number(process.argv[4] ?? 800);
const SPEED = Number(process.env.SPEED ?? 24);
const browser = process.env.BROWSER === 'webkit' ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'no-preference' });

// figure roots: [name, selector of the block to scroll to, selector of the
// figure inside it whose marks are sampled]
const TARGETS = [
  ['vitals sparklines', '#p1-vitals', '#p1-vitals'],
  ['GDP bars', '#p1-output', '.scrolly-graphic-inner'],
  ['labour board', '#p1-work', '.scrolly-graphic-inner'],
  ['AI use (p1-ai)', '#p1-ai', '.scrolly-graphic-inner'],
  ['shock tiles', '#p2-shock', '.scrolly-graphic-inner'],
  ['output split', '#p2-morph', '.scrolly-graphic-inner'],
  ['who gains', '#p2-who', '.scrolly-graphic-inner'],
  ['central', '#p3-central', '.scrolly-graphic-inner'],
  ['channels', '#p3-channels', '.scrolly-graphic-inner'],
  ['deciles', '#p3-deciles', '.scrolly-graphic-inner'],
  ['lost pound (Sankey)', '#p3-pound', '.scrolly-graphic-inner'],
  ['rules plane', '#p3-changes', '.scrolly-graphic-inner'],
  ['two lenses', '.lens-fig', '.lens-fig'],
  ['closing tiles', '.p3-close-card', '.p3-close-card'],
];

// one signature of the figure's drawn state
const SIG = (sel) => {
  const root = document.querySelector(sel.block)?.querySelector(sel.fig) ?? document.querySelector(sel.block);
  if (!root) return null;
  const els = root.querySelectorAll('path, rect, circle, line, polygon, polyline, text, g, [data-mark], .tile, .p1-spark-line, .p1-spark-dot');
  const parts = [];
  for (const el of els) {
    if (el.closest('.scrolly-sizers, [aria-hidden="true"].scrolly-sizers')) continue;
    if (el.getAnimations?.().some((a) => a.effect?.getTiming?.().iterations === Infinity)) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    parts.push(`${(+s.opacity).toFixed(2)}|${s.transform}|${s.strokeDashoffset}|${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return parts.join(';');
};

const fresh = async () => {
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  return page;
};

let misses = 0;
const report = (ok, name, msg) => {
  if (!ok) misses++;
  console.log(`${ok ? 'ok  ' : 'MISS'} ${name}: ${msg}`);
};

// the hero, from load
{
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  const sigs = new Set();
  for (let t = 0; t < 22; t++) {
    const s = await page.evaluate(SIG, { block: '#story-hero', fig: '.hf-art' }).catch(() => null);
    if (s) sigs.add(s);
    await page.waitForTimeout(80);
  }
  report(sigs.size >= 3, 'hero fan', `${sigs.size} distinct states over 1.8s from load`);
  await page.close();
}

for (const [name, block, fig] of TARGETS) {
  const sel = { block, fig };
  // entry by scrolling
  let page = await fresh();
  const geo = await page.evaluate(({ block, fig }) => {
    const b = document.querySelector(block);
    if (!b) return null;
    const f = b.querySelector(fig) ?? b;
    const blockTop = b.getBoundingClientRect().top + scrollY;
    // the figure's place in the flow (it is below the screen: not stuck)
    const figTop = f.getBoundingClientRect().top + scrollY;
    return { blockTop, figTop };
  }, sel);
  if (!geo) {
    report(false, name, `${block} not on the page`);
    await page.close();
    continue;
  }
  await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y), behavior: 'instant' }), geo.blockTop - H);
  await page.waitForTimeout(1500);
  const stopAt = geo.figTop - 0.3 * H;
  await page.mouse.move(W / 2, H / 2);
  const sigs = new Set();
  for (let k = 0; k < 2000; k++) {
    const y = await page.evaluate(() => scrollY);
    if (y >= stopAt) break;
    await page.mouse.wheel(0, Math.min(SPEED, stopAt - y + 1));
    await page.waitForTimeout(16);
    if (k % 5 === 0) {
      const s = await page.evaluate(SIG, sel);
      if (s) sigs.add(s);
    }
  }
  for (let t = 0; t < 19; t++) {
    const s = await page.evaluate(SIG, sel);
    if (s) sigs.add(s);
    await page.waitForTimeout(80);
  }
  const entered = sigs.size;
  await page.close();
  // landing
  page = await fresh();
  await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y), behavior: 'instant' }), stopAt);
  await page.waitForTimeout(150);
  const s0 = await page.evaluate(SIG, sel);
  await page.waitForTimeout(2350);
  const s1 = await page.evaluate(SIG, sel);
  await page.close();
  const landed = s0 === s1;
  report(entered >= 3 && landed, name, `entry ${entered} distinct states; landing ${landed ? 'final at once' : 'still moving after 150ms'}`);
}
await browser.close();
console.log(misses ? `FAIL: ${misses} figure(s) static on entry or moving on landing` : 'PASS: every figure animates on entry and lands in its final state');
process.exit(misses ? 1 : 0);
