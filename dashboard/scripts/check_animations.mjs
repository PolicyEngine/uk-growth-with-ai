// Entry animations (polish round F, Vahid: "bring back animation of this"):
// every figure that animates on entry must still do so, and a landing must
// show its final state.
//
//  - entry: motion on, load fresh, start one screen above the figure's block
//    (above its question moment), and wheel down at a reading speed (SPEED px
//    a frame, under the fast-scroll threshold) until the figure's top is at
//    30% of the screen; sample the figure's marks every 80ms from the start
//    until 3s after the stop (a staggered entry starts late). The marks' drawn state (opacity, transform,
//    stroke-dashoffset, clip-path, width and height of their boxes; only once the
//    figure is on screen and its question moment has moved aside): at least one mark
//    must take 3 or more values (from, between, to); a figure already drawn
//    when it comes into view is a miss.
//  - landing: load fresh, jump there in one instant scroll, and the marks
//    150ms after must match the marks 2.5s after (the final state at once).
//  - the hero is the exception: its first frame is the final one (round 1
//    ruling), so it must stay still from load.
//
// Under reduced motion nothing is checked here (check_states draws every
// state there). Looping decorations (an infinite animation) are ignored.
//
//   bun scripts/check_animations.mjs http://localhost:4360 [width height]
//   (default 1280 800). ONLY=a,b runs the figures whose name or block
//   contains a or b. Exits 1 on a miss.
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
  ['output (part 2)', '#p2-output', '.scrolly-graphic-inner'],
  ['two lenses', '.lens-fig', '.lens-fig'],
  ['closing tiles', '.p3-close-card', '.p3-close-card'],
];

// the figure's marks, one value string each (in document order), leaving
// out anything in an inert layer (a swapped-out state)
const SIG = (sel) => {
  const blk = document.querySelector(sel.block);
  const root = blk?.querySelector(sel.fig) ?? blk;
  if (!root) return null;
  // while the scene's question moment is up, the figure is not yet shown:
  // a draw that runs then is unseen (polish round F), so those samples are
  // left out
  if (blk.closest('.scrolly')?.classList.contains('is-asking')) return null;
  const fr = root.getBoundingClientRect();
  if (fr.top > innerHeight * 0.95 || fr.bottom < 0) return null;
  const els = root.querySelectorAll('*');
  const parts = [];
  for (const el of els) {
    if (el.closest('.scrolly-sizers, [inert]')) {
      parts.push('');
      continue;
    }
    if (el.getAnimations?.().some((a) => a.effect?.getTiming?.().iterations === Infinity)) {
      parts.push('');
      continue;
    }
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    parts.push(`${(+s.opacity).toFixed(2)}|${s.transform}|${s.strokeDashoffset}|${s.clipPath}|${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return parts;
};
// animated on entry: some mark took 3 or more values (from, between, to)
const moving = (samples) => {
  const per = new Map();
  for (const sg of samples) sg.forEach((v, i) => v && (per.get(i) ?? per.set(i, new Set()).get(i)).add(v));
  return Math.max(0, ...[...per.values()].map((x) => x.size));
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

// the hero, from load: its first frame is the final one (round 1, 696d773:
// "no count-up, no draw-in or fade"), so it must not move
{
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  const sigs = [];
  for (let t = 0; t < 22; t++) {
    const s = await page.evaluate(SIG, { block: '#story-hero', fig: '.hf-art' }).catch(() => null);
    if (s) sigs.push(s);
    await page.waitForTimeout(80);
  }
  const m = moving(sigs);
  report(m <= 2, 'hero fan (static by design)', `a mark took ${m} values over 1.8s from load`);
  await page.close();
}

const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const [name, block, fig] of TARGETS.filter(([n, b]) => !ONLY || ONLY.some((o) => n.includes(o) || b.includes(o)))) {
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
    // the output scene is a static figure at 900px and below (no #p2-output)
    if (W <= 900 && block === '#p2-output') console.log(`skip ${name}: static on phones`);
    else report(false, name, `${block} not on the page`);
    await page.close();
    continue;
  }
  await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y), behavior: 'instant' }), geo.blockTop - H);
  await page.waitForTimeout(1500);
  const stopAt = geo.figTop - 0.3 * H;
  await page.mouse.move(W / 2, H / 2);
  const sigs = [];
  for (let k = 0; k < 2000; k++) {
    const y = await page.evaluate(() => scrollY);
    if (y >= stopAt) break;
    await page.mouse.wheel(0, Math.min(SPEED, stopAt - y + 1));
    await page.waitForTimeout(16);
    if (k % 5 === 0) {
      const s = await page.evaluate(SIG, sel);
      if (s) sigs.push(s);
    }
  }
  for (let t = 0; t < 38; t++) {
    const s = await page.evaluate(SIG, sel);
    if (s) sigs.push(s);
    await page.waitForTimeout(80);
  }
  const entered = moving(sigs);
  await page.close();
  // landing
  page = await fresh();
  await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y), behavior: 'instant' }), stopAt);
  await page.waitForTimeout(150);
  const s0 = await page.evaluate(SIG, sel);
  await page.waitForTimeout(2350);
  const s1 = await page.evaluate(SIG, sel);
  await page.close();
  const diff = s0 && s1 ? s1.filter((v, i) => v !== s0[i]).length : -1;
  const landed = diff === 0;
  report(entered >= 3 && landed, name, `entry: a mark took ${entered} values; landing: ${landed ? 'final at once' : `${diff} marks still moving after 150ms`}`);
}
// paced arrivals (polish round blocker: the lost-pound Sankey stayed blank
// in about half of ordinary wheel-scroll arrivals, which the fast entry
// above never hit): the wheel paced by the wall clock at 450, 600 and
// 1,100px/s from 1.6 screens above each Sankey on the Story until its top is
// at 25% of the screen; 3s later at least 90% of its ribbons must be drawn
for (const sel of ['#p3-pound', '#p2-output']) {
  for (const speed of [450, 600, 1100]) {
    const page = await fresh();
    const g = await page.evaluate((sel) => {
      const sk = document.querySelector(`${sel} svg.sankey`);
      if (!sk) return null;
      const r = sk.getBoundingClientRect();
      return { ty: r.top + scrollY - innerHeight * 0.25, y0: Math.max(0, r.top + scrollY - innerHeight * 1.6) };
    }, sel);
    if (!g) {
      await page.close();
      continue;
    }
    await page.mouse.move(3, H - 3);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), g.y0);
    await page.waitForTimeout(1200);
    let y = g.y0;
    const t0 = Date.now();
    let k = 0;
    while (y < g.ty) {
      const d = Math.min((speed * 40) / 1000, g.ty - y);
      await page.mouse.wheel(0, d);
      y += d;
      k++;
      const due = t0 + k * 40 - Date.now();
      if (due > 0) await page.waitForTimeout(due);
    }
    await page.waitForTimeout(3000);
    const share = await page.evaluate((sel) => {
      // poured ribbons, and of a step-driven wipe those its step has revealed
      const links = [...document.querySelectorAll(`${sel} svg.sankey .sankey-link`)].filter((l) => Number(l.style.opacity || 1) > 0 && (!l.classList.contains('is-wipe') || l.classList.contains('is-on')));
      if (!links.length) return null;
      const drawn = links.filter((l) => {
        const m = getComputedStyle(l).clipPath.match(/^inset\((.*)\)$/);
        const v = m ? m[1].split(/\s+/) : [];
        const right = v.length >= 2 ? v[1] : v[0] ?? '0';
        return !(right.endsWith('%') && parseFloat(right) > 10);
      }).length;
      return links.length ? drawn / links.length : 0;
    }, sel);
    await page.close();
    if (share == null) console.log(`skip ${sel} paced ${speed}px/s: no ribbon revealed at the arrival step`);
    else report(share >= 0.9, `${sel} paced ${speed}px/s`, `${Math.round(share * 100)}% of ribbons drawn 3s after arrival`);
  }
}
await browser.close();
console.log(misses ? `FAIL: ${misses} figure(s) static on entry or moving on landing` : 'PASS: every figure animates on entry and lands in its final state');
process.exit(misses ? 1 : 0);
