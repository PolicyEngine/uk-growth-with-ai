// Step text jitter (polish round E, Vahid: "why when scrolling slowly, these
// texts are shaking?"): a slow scroll, 1.5px a frame (fractional, at device
// scale 2, so rounding shows), through every multi-card Scrolly block, while
// each visible step sentence's box is sampled every frame, after the page's
// scroll loop has written (a ResizeObserver callback: after the frame's
// rAF callbacks and layout, before paint, so what is sampled is what is
// painted). Scrolling down, a sentence's top must never move down (a
// back-and-forth of 1px or more) and its left edge must never move. A
// sentence counts while its card's opacity is at least 0.3 in both frames.
// And nothing may rewrite the step list's inline styles per frame: a style
// write under .scrolly-steps in a frame where the active step did not
// change is a miss (a per-frame counter-scroll shakes on a real trackpad,
// where the compositor scrolls ahead of the page, even when the page's own
// frames look still).
// The question holds: while a question moment is held (--qa 1, --qm 0)
// no style may be written under its .q-stage, and its held card must not
// move against the scroll (the browser holds it: position sticky).
// The walk covers WIN px around every step change and the middle of every
// hold (the whole block when FULL=1).
//
//   bun scripts/check_jitter.mjs http://localhost:4360 [width height ...]
//   Motion on (REDUCE=1: reduced motion). BROWSER=webkit runs Playwright's WebKit. Exits 1 on any jitter.
import { chromium, webkit } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const rest = process.argv.slice(3).map(Number);
const sizes = rest.length >= 2 ? Array.from({ length: rest.length >> 1 }, (_, i) => [rest[2 * i], rest[2 * i + 1]]) : [[1280, 800], [390, 844]];
const STEP = Number(process.env.STEP ?? 1.5);
const WIN = Number(process.env.WIN ?? 240);
const WK = process.env.BROWSER === 'webkit';
const browser = WK ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let bad = 0;
for (const [W, H] of sizes) {
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, reducedMotion: process.env.REDUCE === '1' ? 'reduce' : 'no-preference' })).newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  // the stretches to walk: per block, WIN px around each card's top crossing
  // the middle of the screen, plus the block's figure entering
  const blocks = await page.evaluate(({ WIN, FULL }) => {
    const out = [];
    for (const s of document.querySelectorAll('.scrolly')) {
      if (/is-single|is-once|is-inline/.test(s.className)) continue;
      const cards = [...s.querySelectorAll('.scrolly-step:not(.is-spacer)')];
      if (cards.length < 2) continue;
      const top = s.getBoundingClientRect().top + scrollY;
      const bottom = s.getBoundingClientRect().bottom + scrollY;
      const V = innerHeight;
      const spans = [];
      if (FULL) spans.push([top - V, bottom]);
      else {
        // the block's own scroll split into card shares (desktop) or card
        // crossings (phones): sample a window at each fifth of the block
        const len = bottom - top + V;
        for (let k = 0; k <= 8; k++) {
          const c = top - V + (len * k) / 8;
          spans.push([c - WIN / 2, c + WIN / 2]);
        }
      }
      out.push({ id: s.id, spans });
    }
    return out;
  }, { WIN, FULL: process.env.FULL === '1' });
  const misses = [];
  for (const b of blocks) {
    for (const [a, z] of b.spans) {
      const res = await page.evaluate(async ({ id, a, z, STEP }) => {
        const blk = document.getElementById(id);
        window.scrollTo({ top: Math.max(0, a), behavior: 'instant' });
        // settle after the jump (render-on-landing, transitions)
        await new Promise((r) => setTimeout(r, 700));
        const eff = (el) => {
          let o = 1;
          for (let n = el; n && n !== blk; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
          return o;
        };
        const samples = [];
        const probe = document.createElement('div');
        probe.style.cssText = 'position:fixed;left:0;top:0;height:1px;width:1px;pointer-events:none;visibility:hidden';
        document.body.appendChild(probe);
        let k = 0;
        let writes = 0;
        const mo = new MutationObserver((ms) => {
          writes += ms.length;
        });
        mo.observe(blk.querySelector('.scrolly-steps'), { attributes: true, subtree: true, attributeFilter: ['style'] });
        const sample = () => {
          const rows = {};
          for (const li of blk.querySelectorAll('.scrolly-step:not(.is-spacer)')) {
            const body = li.querySelector('.scrolly-body');
            const card = li.querySelector('.scrolly-card');
            if (!body || !card) continue;
            const r = body.getBoundingClientRect();
            if (r.bottom < 0 || r.top > innerHeight || r.height === 0) continue;
            rows[li.id] = { y: r.top, x: r.left, o: eff(card) };
          }
          const act = blk.querySelector('.scrolly-step.is-active')?.id ?? '';
          samples.push({ sy: scrollY, rows, act, writes });
        };
        const ro = new ResizeObserver(sample);
        ro.observe(probe);
        await new Promise((done) => {
          const tick = () => {
            if (scrollY >= z || scrollY + innerHeight >= document.documentElement.scrollHeight - 1) {
              done();
              return;
            }
            window.scrollBy({ top: STEP, behavior: 'instant' });
            probe.style.width = `${1 + (k++ % 2)}px`;
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        ro.disconnect();
        mo.disconnect();
        probe.remove();
        const out = [];
        for (let i = 1; i < samples.length; i++) {
          const p = samples[i - 1];
          const c = samples[i];
          const dy = c.sy - p.sy;
          if (dy <= 0) continue;
          if (c.writes > p.writes && c.act === p.act && i > 2) out.push({ card: c.act, at: Math.round(c.sy), down: 0, dx: 0, writes: c.writes - p.writes });
          for (const key of Object.keys(c.rows)) {
            const r0 = p.rows[key];
            const r1 = c.rows[key];
            if (!r0 || r0.o < 0.3 || r1.o < 0.3) continue;
            const down = r1.y - r0.y;
            const dx = Math.abs(r1.x - r0.x);
            if (down >= 1 || dx >= 1) out.push({ card: key, at: Math.round(c.sy), down: +down.toFixed(2), dx: +dx.toFixed(2) });
          }
        }
        return { n: samples.length, out };
      }, { id: b.id, a, z, STEP });
      for (const m of res.out) misses.push({ block: b.id, ...m });
    }
  }
  // the question holds (sign-off r3 major 2): the browser holds the card
  // (sticky), so while a question is held (arrived, --qa 1, and not yet
  // moving, --qm 0) nothing may write a style under its stage, and its card
  // must not move. REDUCE=1 has no stages.
  const stages = await page.evaluate(() => [...document.querySelectorAll('.q-stage[data-q]')].map((s) => ({ id: s.dataset.q, top: s.getBoundingClientRect().top + scrollY, h: s.offsetHeight })));
  for (const st of stages) {
    const res = await page.evaluate(async ({ st, STEP }) => {
      const s = document.querySelector(`.q-stage[data-q="${st.id}"]`);
      const card = s.querySelector('.q-stage-card');
      window.scrollTo({ top: Math.max(0, st.top - 0.45 * innerHeight), behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 700));
      const v = (k) => Number(getComputedStyle(s).getPropertyValue(k)) || 0;
      let writes = 0;
      const mo = new MutationObserver((ms) => {
        writes += ms.length;
      });
      mo.observe(s, { attributes: true, subtree: true, attributeFilter: ['style'] });
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:0;top:0;height:1px;width:1px;pointer-events:none;visibility:hidden';
      document.body.appendChild(probe);
      const samples = [];
      const ro = new ResizeObserver(() => samples.push({ qa: v('--qa'), qm: v('--qm'), y: card.getBoundingClientRect().top, writes }));
      ro.observe(probe);
      let k = 0;
      await new Promise((done) => {
        const tick = () => {
          const last = samples.at(-1);
          if ((last && last.qm > 0) || scrollY >= st.top + st.h || samples.length > 2000) {
            done();
            return;
          }
          window.scrollBy({ top: STEP, behavior: 'instant' });
          probe.style.width = `${1 + (k++ % 2)}px`;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      ro.disconnect();
      mo.disconnect();
      probe.remove();
      let held = 0;
      const out = [];
      for (let i = 1; i < samples.length; i++) {
        const p = samples[i - 1];
        const c = samples[i];
        if (!(p.qa >= 1 && c.qa >= 1 && p.qm === 0 && c.qm === 0)) continue;
        held++;
        if (c.writes > p.writes) out.push(`${c.writes - p.writes} style writes`);
        else if (Math.abs(c.y - p.y) >= 1 && Math.abs(c.y - p.y) < STEP - 0.25) out.push(`card moved ${(c.y - p.y).toFixed(2)}px`);
      }
      return { held, out };
    }, { st, STEP });
    for (const m of res.out) misses.push({ block: `q-stage ${st.id}`, card: 'hold', at: 0, writes: 0, down: m, dx: '' });
    if (!res.held) misses.push({ block: `q-stage ${st.id}`, card: 'hold', at: 0, writes: 0, down: 'never held', dx: '' });
  }
  const byBlock = {};
  for (const m of misses) (byBlock[m.block] ??= []).push(m);
  console.log(`${W}x${H} ${WK ? 'webkit' : 'chromium'}: ${blocks.length} blocks, ${misses.length} jitter frames`);
  for (const [id, ms] of Object.entries(byBlock)) console.log(`  MISS ${id}: ${ms.length} frames, e.g. ${ms.slice(0, 3).map((m) => `${m.card}@${m.at} ${m.writes ? `${m.writes} style writes` : `down ${m.down} dx ${m.dx}`}`).join('; ')}`);
  bad += misses.length;
}
await browser.close();
console.log(bad ? `FAIL: ${bad} jitter frames` : 'PASS: no step text moved against the scroll');
process.exit(bad ? 1 : 0);
