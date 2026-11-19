// Dead space on the Story tab (Vahid: "why a lot of unnecessary empty free
// gap"). Scrolls the page in steps; at each position it finds every visible
// thing on screen (text, svg, images, and boxes with a fill or border) and
// measures the tallest band of the viewport with nothing in it, in each
// half of the page on desktop (so an empty column beside a chart counts).
// Reports the page height and the largest blank band; fails if a band is
// taller than MAX_GAP px. A box marked data-gap-exempt (the topic's pinned
// question screen, QStage.jsx) counts as content: its open space is the
// pinned screen itself.
//
// Runs under reduced motion by default (the pinned screens are hidden then);
// MOTION=1 runs with motion on, so the pinned screens are in the page and
// measured (reveals are given time to finish at each position).
//
//   bun scripts/check_gaps.mjs http://localhost:4360 [width] [height]
//   MOTION=1 bun scripts/check_gaps.mjs http://localhost:4360 1280 800
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const W = Number(process.argv[3] ?? 1280);
const H = Number(process.argv[4] ?? 800);
const MAX_GAP = Number(process.env.MAX_GAP ?? 120);
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const MOTION = process.env.MOTION === '1';
const page = await (await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: MOTION ? 'no-preference' : 'reduce' })).newPage();
await page.goto(base + '/', { waitUntil: 'networkidle' });
const height = await page.evaluate(() => document.documentElement.scrollHeight);
let worst = { gap: 0, y: 0 };
const gaps = [];
for (let y = 0; y < height - H; y += Math.round(H / 3)) {
  await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y);
  await page.waitForTimeout(MOTION ? 900 : 120);
  const r = await page.evaluate(() => {
    const top0 = document.querySelector('.story-rail')?.getBoundingClientRect().bottom ?? 0;
    const spans = [];
    const visible = (el) => {
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
    };
    const walker = document.createTreeWalker(document.querySelector('.tab-panel:not([hidden])') ?? document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    // the site footer under the panel is content too (the band above it at
    // the page's end is measured to it, not to the viewport's foot)
    for (const el of document.querySelectorAll('footer')) {
      const b = el.getBoundingClientRect();
      if (b.height > 0) spans.push([b.top, b.bottom, b.left, b.right]);
    }
    // the pinned question screens: content by definition
    // the GDP scene's last card is drawn unstuck on phones (a tall card):
    // the room above it while the figure scrolls away is accepted
    // (coordinator ruling, Opus stand-in, Fable unavailable, 19 Nov;
    // checks-pushC.md, known phone exception)
    if (innerWidth <= 480) {
      const hc = document.querySelector('#p2-headline');
      const blk = hc?.closest('.scrolly');
      if (hc && blk) {
        const a = blk.querySelector('.scrolly-graphic')?.getBoundingClientRect();
        const c = hc.getBoundingClientRect();
        if (a) spans.push([Math.min(a.bottom, c.top), c.bottom, c.left, c.right]);
      }
    }
    for (const el of document.querySelectorAll('[data-gap-exempt]')) {
      const b = el.getBoundingClientRect();
      if (b.height > 0) spans.push([b.top, b.bottom, b.left, b.right]);
    }
    for (let n = walker.currentNode; n; n = walker.nextNode()) {
      if (n.nodeType === 3) {
        if (!n.textContent.trim() || !n.parentElement || !visible(n.parentElement)) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const b of range.getClientRects()) if (b.width > 0) spans.push([b.top, b.bottom, b.left, b.right]);
        continue;
      }
      const el = n;
      if (!visible(el)) continue;
      const s = getComputedStyle(el);
      const filled = (s.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) || parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderLeftWidth) > 0;
      if (['svg', 'IMG', 'CANVAS'].includes(el.tagName) || el.tagName.toLowerCase() === 'svg' || filled) {
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.height > 0 && b.width < innerWidth * 0.98) spans.push([b.top, b.bottom, b.left, b.right]);
        else if (b.width > 0 && b.height > 0 && b.height < innerHeight * 0.6) spans.push([b.top, b.bottom, b.left, b.right]); // full-width bands count if not a page-size wrapper
      }
    }
    // the blank band is measured in each half of the page (left and right
    // columns), so an empty text column beside a sticky chart counts
    const lo = top0, hi = innerHeight, mid = innerWidth / 2;
    const content = document.querySelector('.story')?.getBoundingClientRect();
    const halves = content && innerWidth > 900 ? [[content.left, mid], [mid, content.right]] : [[0, innerWidth]];
    let best = 0, at = lo;
    for (const [x0, x1] of halves) {
      const s2 = spans.filter(([, , l, r]) => r > x0 && l < x1).map(([a, b]) => [Math.max(a, lo), Math.min(b, hi)]).filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
      let cur = lo;
      for (const [a, b] of s2) { if (a - cur > best) { best = a - cur; at = cur; } cur = Math.max(cur, b); }
      if (hi - cur > best) { best = hi - cur; at = cur; }
    }
    return { gap: Math.round(best), at: Math.round(at) };
  });
  gaps.push(r.gap);
  if (r.gap > worst.gap) worst = { gap: r.gap, y: y + r.at };
}
await browser.close();
const over = gaps.filter((g) => g > MAX_GAP).length;
console.log(`${W}x${H}${MOTION ? ' (motion on)' : ''}: page ${height}px; largest blank band ${worst.gap}px at y=${worst.y}; ${over} of ${gaps.length} positions over ${MAX_GAP}px`);
process.exit(worst.gap > MAX_GAP ? 1 : 0);
