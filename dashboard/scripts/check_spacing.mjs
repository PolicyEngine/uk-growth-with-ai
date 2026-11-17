// Story spacing (polish round, Vahid: "the output closing line sits too
// tight against its chart"; "the next question arrives too close to the
// previous scene"; "check others as well"). Reduced motion (every state
// settled; MOTION=1 for motion on), at 1280x800 and 390x844 by default.
//
//  - between topics: from the bottom of the last thing drawn in one topic
//    block (scene, vitals, output, beat, close) to the top of the first
//    thing drawn in the next (its question moment, header, or beat). A miss
//    under --gap-topic (64px; 48px at 900px and below) minus 4px.
//  - answer lines: every closing or answer line (.scrolly-takeaway) that
//    sits under a chart (the plot above it overlaps it across) must be at
//    least 24px below the plot's last drawn mark or label.
//
// Prints every measured gap, per scene.
//
//   bun scripts/check_spacing.mjs http://localhost:4360 [width height ...]
//   Exits 1 on a miss.
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const rest = process.argv.slice(3).map(Number);
const sizes = rest.length >= 2 ? Array.from({ length: rest.length >> 1 }, (_, i) => [rest[2 * i], rest[2 * i + 1]]) : [[1280, 800], [390, 844]];
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let misses = 0;
for (const [W, H] of sizes) {
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: process.env.MOTION === '1' ? 'no-preference' : 'reduce' })).newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll('.story-part > :is(.scrolly.has-sub, .p1-vitals, .p2-output, .p3-close, .story-beat, .scrolly)')].map((el, i) => {
      el.dataset.spacingIdx = String(i);
      return { i, id: el.id || el.className.split(' ')[0], top: el.getBoundingClientRect().top + scrollY, part: el.closest('.story-part')?.id ?? '' };
    }),
  );
  const target = Number((await page.evaluate(() => getComputedStyle(document.querySelector('.story')).getPropertyValue('--gap-topic'))).trim().replace('px', '')) || (W <= 900 ? 48 : 64);
  console.log(`${W}x${H} (${process.env.MOTION === '1' ? 'motion' : 'reduced motion'}), --gap-topic ${target}px`);
  for (let k = 0; k < blocks.length; k++) {
    const a = blocks[k];
    const b = blocks[k + 1];
    // the boundary at the middle of the screen: sticky figures sit at their
    // block's end, settled
    const res = await page.evaluate(
      async ({ a, b }) => {
        const A = document.querySelector(`[data-spacing-idx="${a.i}"]`);
        const B = b && b.part === a.part ? document.querySelector(`[data-spacing-idx="${b.i}"]`) : null;
        const drawn = (root) => {
          const out = [];
          for (const el of root.querySelectorAll('*')) {
            if (el.closest('[hidden], .visually-hidden, .scrolly-sizers, [inert]')) continue;
            const s = getComputedStyle(el);
            if (s.display === 'none' || s.visibility === 'hidden') continue;
            let o = 1;
            for (let n = el; n && n !== root.parentElement; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
            if (o < 0.05) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) continue;
            const leaf = !el.children.length || el instanceof SVGElement || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            const ink = s.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(s.borderTopWidth) + parseFloat(s.borderBottomWidth) > 0;
            if (leaf || ink) out.push({ el, r });
          }
          return out;
        };
        const end = A.getBoundingClientRect().bottom;
        window.scrollTo({ top: end + scrollY - innerHeight / 2, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 450));
        const res = { gap: null, answers: [] };
        const inA = drawn(A);
        if (B) {
          const lastBottom = Math.max(...inA.map((d) => d.r.bottom));
          const inB = drawn(B).filter((d) => !d.el.closest('.q-stage') || getComputedStyle(B.querySelector('.q-stage')).display !== 'none');
          // the first thing in the next topic: its question card (motion),
          // else its first drawn element
          const qs = B.querySelector('.q-stage');
          const qTop = qs && getComputedStyle(qs).display !== 'none' ? qs.getBoundingClientRect().top : Infinity;
          const firstTop = Math.min(qTop, ...inB.map((d) => d.r.top));
          res.gap = Math.round(firstTop - lastBottom);
        }
        // answer lines under a chart
        for (const cap of A.querySelectorAll('.scrolly-takeaway, .topic-head-answer .scrolly-takeaway')) {
          const c = cap.getBoundingClientRect();
          if (c.height < 1 || Number(getComputedStyle(cap).opacity) < 0.05) continue;
          // the chart: marks and labels in a figure (never in the step text)
          const plots = inA.filter((d) => d.el.closest('.scrolly-graphic, .p2-output-fig, .story-frame, figure') && !d.el.closest('.scrolly-steps, .scrolly-takeaway, .story-source, .fig-notes') && d.r.bottom <= c.top + 2 && d.r.right > c.left + 4 && d.r.left < c.right - 4);
          // drawn inside its figure's box (a mark parked outside it is clipped)
          const inside = plots.filter((d) => {
            const f = d.el.closest('.scrolly-graphic-inner, .p2-output-fig, .story-frame, figure')?.getBoundingClientRect();
            const x = (d.r.left + d.r.right) / 2;
            return f && x >= f.left && x <= f.right && !['g', 'svg', 'defs', 'clipPath'].includes(d.el.tagName);
          });
          plots.length = 0;
          plots.push(...inside);
          if (!plots.length) continue;
          const plotBottom = Math.max(...plots.map((d) => d.r.bottom));
          if (c.top - plotBottom > 200) continue;
          res.answers.push(Math.round(c.top - plotBottom));
        }
        return res;
      },
      { a, b },
    );
    const msgs = [];
    if (res.gap != null) {
      const bad = res.gap < target - 4;
      if (bad) misses++;
      msgs.push(`${bad ? 'MISS ' : ''}to next topic ${res.gap}px`);
    }
    for (const g of res.answers) {
      const bad = g < 24;
      if (bad) misses++;
      msgs.push(`${bad ? 'MISS ' : ''}answer line ${g}px under its chart`);
    }
    console.log(`  ${a.id}: ${msgs.join('; ') || '(last in its part, no answer line under a chart)'}`);
  }
  await page.close();
}
await browser.close();
console.log(misses ? `FAIL: ${misses} gap(s) too tight` : 'PASS: topics and answer lines clear');
process.exit(misses ? 1 : 0);
