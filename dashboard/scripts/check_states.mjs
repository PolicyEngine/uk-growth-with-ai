// State hold probe (scene plan addendum A5.3): scrolling at 40px a tick
// through each sticky multi-card Scrolly block, every state must be the
// active one for at least 180px of scroll while at least 90% of the figure
// is in view (below the sticky rail). Blocks drawn once (phones) are
// skipped: their states are set by buttons, not scroll.
//
// The topic's pinned question screen (QStage) sits above the block's figure;
// the walk starts one screen above the block's figure (not the block), so
// states are measured after the opener. MOTION=1 runs with motion on (the
// pinned screens in the page).
//
//   bun scripts/check_states.mjs http://localhost:4360 [width height ...]
//   (needs Playwright; CHROMIUM may name a Chrome binary). Exits 1 on a miss.
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const rest = process.argv.slice(3).map(Number);
const sizes = rest.length >= 2 ? Array.from({ length: rest.length >> 1 }, (_, i) => [rest[2 * i], rest[2 * i + 1]]) : [[1280, 800], [1366, 650], [807, 933]];
const HOLD = Number(process.env.HOLD ?? 180);
const TICK = 40;
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let misses = 0;
for (const [W, H] of sizes) {
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: process.env.MOTION === '1' ? 'no-preference' : 'reduce' })).newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll('.scrolly')]
      .filter((s) => !/is-single|is-once|is-inline/.test(s.className))
      .map((s) => {
        // measured from the figure: the pinned question screen above it is not a state
        const r0 = s.getBoundingClientRect();
        const g = s.querySelector('.scrolly-graphic');
        const r = { top: Math.max(r0.top, (g ?? s).getBoundingClientRect().top), bottom: r0.bottom };
        const cards = [...s.querySelectorAll('.scrolly-step')].map((li, i) => (li.classList.contains('is-spacer') ? -1 : i)).filter((i) => i >= 0);
        return { id: s.id, top: r.top + scrollY, bottom: r.bottom + scrollY, cards };
      }),
  );
  const lines = [];
  for (const b of blocks) {
    const held = {};
    for (let y = Math.max(0, b.top - H); y <= b.bottom; y += TICK) {
      await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y);
      await page.waitForTimeout(30);
      const r = await page.evaluate((id) => {
        const s = document.getElementById(id);
        const g = s.querySelector('.scrolly-graphic > .scrolly-graphic-inner');
        const top0 = document.querySelector('.story-rail')?.getBoundingClientRect().bottom ?? 0;
        const gr = g.getBoundingClientRect();
        const vis = Math.max(0, Math.min(gr.bottom, innerHeight) - Math.max(gr.top, top0)) / (gr.height || 1);
        return { step: Number(g.dataset.step), vis };
      }, b.id);
      if (r.vis >= 0.9) held[r.step] = (held[r.step] ?? 0) + TICK;
    }
    const per = b.cards.map((i) => held[i] ?? 0);
    const bad = per.some((v) => v < HOLD);
    if (bad) misses++;
    lines.push(`  ${bad ? 'MISS' : 'ok  '} ${b.id}: ${per.join(', ')}px`);
  }
  console.log(`${W}x${H}: ${blocks.length} sticky blocks`);
  for (const l of lines) console.log(l);
  await page.close();
}
await browser.close();
console.log(misses ? `FAIL: ${misses} blocks hold a state for under ${HOLD}px` : 'PASS');
process.exit(misses ? 1 : 0);
