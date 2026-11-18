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
// Opener probe (round 2 sign-off #1): motion on, at 1280x800 and 390x844
// (OPENER_SIZES), the scroll through every in-frame question (QFrame) in
// 10px steps, both ways: at every sample with the frame on screen, the
// question (card opacity >= 0.15) or the chart (cover opacity <= 0.85, or
// the frame done) must be visible; a blank frame is a miss. OPENERS=0
// skips it.
//
// Landing probe (round 2): every sticky scene must draw its current step on
// arrival, not only when a step changes. For every card of every sticky
// block, at 1280x800, 1024x768 and 390x844 (JUMP_SIZES="w,h w,h" to change), motion
// on: load fresh, scrollTo the card's middle at the trigger line in one
// instant jump, wait JWAIT ms (600), and count the figure's drawn marks
// (svg rect/path/circle/line/polygon and [data-mark] boxes, not axes, grid,
// ticks, icons or step dots; nonzero size, effective opacity >= 0.4); then
// wait JSETTLE ms (2400) and count again. A miss: no marks, fewer marks on
// arrival than once settled, or the step changing with no scroll. The same
// after a reload at that position ("reload"), and after a fast scroll of a
// few under-half-screen moves from one screen above ("fast": marks on
// arrival must be at least half the settled count, as entry moves may still
// be playing). A size with no sticky scene at all is a miss. JUMP=0 skips
// this probe; JUMP=only runs it alone.
//
//   bun scripts/check_states.mjs http://localhost:4360 [width height ...]
//   (needs Playwright; CHROMIUM may name a Chrome binary). Exits 1 on a miss.
import { chromium, webkit } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const rest = process.argv.slice(3).map(Number);
const sizes = rest.length >= 2 ? Array.from({ length: rest.length >> 1 }, (_, i) => [rest[2 * i], rest[2 * i + 1]]) : [[1280, 800], [1366, 650], [807, 933], [390, 844]];
const HOLD = Number(process.env.HOLD ?? 180);
const TICK = 40;
// BROWSER=webkit runs Playwright's WebKit (an approximation of Safari)
const browser = process.env.BROWSER === 'webkit' ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let misses = 0;
const JUMP = process.env.JUMP ?? '1';
for (const [W, H] of JUMP === 'only' || process.env.SANKEY === 'only' ? [] : sizes) {
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
    const overlaps = new Set();
    for (let y = Math.max(0, b.top - H); y <= b.bottom; y += TICK) {
      await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y);
      await page.waitForTimeout(30);
      const r = await page.evaluate((id) => {
        const s = document.getElementById(id);
        const g = s.querySelector('.scrolly-graphic > .scrolly-graphic-inner');
        const top0 = document.querySelector('.story-rail')?.getBoundingClientRect().bottom ?? 0;
        const gr = g.getBoundingClientRect();
        const vis = Math.max(0, Math.min(gr.bottom, innerHeight) - Math.max(gr.top, top0)) / (gr.height || 1);
        // the closing caption (in the figure frame) must never sit over a
        // step's text (review 3, B1)
        const close = s.querySelector('.scrolly-takeaway');
        let hit = null;
        // its effective opacity: in the last card (desktop, pinned) it is
        // hidden with its card while another card is shown
        let eff = 1;
        for (let n = close; n && n !== s; n = n.parentElement) eff *= Number(getComputedStyle(n).opacity);
        if (close && eff > 0.05) {
          const c = close.getBoundingClientRect();
          for (const card of s.querySelectorAll('.scrolly-step .scrolly-card')) {
            const k = (card.querySelector('.scrolly-body') ?? card).getBoundingClientRect();
            if (Number(getComputedStyle(card).opacity) < 0.05 || !k.height) continue;
            const ov = Math.min(c.bottom, k.bottom) - Math.max(c.top, k.top);
            const ox = Math.min(c.right, k.right) - Math.max(c.left, k.left);
            if (ov > 2 && ox > 2) hit = Math.round(ov);
          }
        }
        return { step: Number(g.dataset.step), vis, hit };
      }, b.id);
      if (r.vis >= 0.9) held[r.step] = (held[r.step] ?? 0) + TICK;
      if (r.hit) overlaps.add(`${y}:${r.hit}px`);
    }
    const per = b.cards.map((i) => held[i] ?? 0);
    const bad = per.some((v) => v < HOLD) || overlaps.size > 0;
    if (bad) misses++;
    lines.push(`  ${bad ? 'MISS' : 'ok  '} ${b.id}: ${per.join(', ')}px${overlaps.size ? `; closing line over a step at ${[...overlaps].slice(0, 3).join(', ')}` : ''}`);
  }
  console.log(`${W}x${H}: ${blocks.length} sticky blocks`);
  for (const l of lines) console.log(l);
  await page.close();
}

// ---- opener probe ----
const olines = [];
let omiss = 0;
const osizes = (process.env.OPENER_SIZES ?? '1280,800 390,844').split(/\s+/).map((x) => x.split(',').map(Number));
for (const [W, H] of process.env.OPENERS === '0' || JUMP === 'only' || process.env.SANKEY === 'only' ? [] : osizes) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const frames = await page.evaluate(() =>
    [...document.querySelectorAll('.scrolly .q-frame')].map((f) => {
      const r = f.getBoundingClientRect();
      return { id: f.closest('.scrolly').id, top: Math.round(r.top + scrollY) };
    }),
  );
  const at = (t) => page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), t);
  const probe = (id) =>
    page.evaluate((id) => {
      const f = document.querySelector(`#${id} .q-frame`);
      const r = f.getBoundingClientRect();
      const rail = document.querySelector('.story-rail')?.getBoundingClientRect().bottom ?? 0;
      if (r.bottom < rail + 40 || r.top > innerHeight - 40) return { off: true };
      if (f.classList.contains('is-done') || getComputedStyle(f).display === 'none') return { ok: true };
      const card = Number(getComputedStyle(f.querySelector('.q-frame-card')).opacity);
      const tint = Number(getComputedStyle(f.querySelector('.q-frame-tint')).opacity);
      return { ok: card >= 0.15 || tint <= 0.85, card, tint };
    }, id);
  for (const fr of frames) {
    const blank = [];
    const y0 = Math.max(0, fr.top - H);
    const y1 = fr.top + 200;
    // down, then back up (the phase follows the scroll both ways)
    await at(Math.max(0, y0 - H));
    await page.waitForTimeout(250);
    for (const dir of ['down', 'up']) {
      for (let k = 0; k <= (y1 - y0) / 10; k++) {
        const y = dir === 'down' ? y0 + 10 * k : y1 - 10 * k;
        await at(y);
        await page.waitForTimeout(25);
        const r = await probe(fr.id);
        if (!r.off && !r.ok) blank.push(`${dir} ${y} (q ${r.card.toFixed(2)}, cover ${r.tint.toFixed(2)})`);
      }
    }
    if (blank.length) omiss++;
    olines.push(`  ${blank.length ? 'MISS' : 'ok  '} ${W}x${H} ${fr.id}${blank.length ? `: blank at ${blank.length} samples, e.g. ${blank.slice(0, 3).join('; ')}` : ''}`);
  }
  await ctx.close();
}
if (olines.length) {
  console.log('openers (question or chart always visible):');
  for (const l of olines) console.log(l);
}

// ---- landing probe ----
const JWAIT = Number(process.env.JWAIT ?? 600);
const JSETTLE = Number(process.env.JSETTLE ?? 2400);
const jsizes = (process.env.JUMP_SIZES ?? '1280,800 1024,768 390,844').split(/\s+/).map((x) => x.split(',').map(Number));
// the figure's drawn marks, counted in the page
const drawn = (id) => {
  const s = document.getElementById(id);
  const g = s?.querySelector('.scrolly-graphic > .scrolly-graphic-inner');
  if (!g) return { step: -1, n: 0 };
  const skip = /axis|grid|zero|tick|guide/;
  const eff = (el) => {
    let o = 1;
    for (let e = el; e && e !== g.parentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
      o *= Number(cs.opacity);
    }
    return o;
  };
  let n = 0;
  for (const el of g.querySelectorAll('svg rect, svg path, svg circle, svg polyline, svg polygon, svg line, [data-mark]:not(svg *)')) {
    if (el.closest('button, .scrolly-dots, .lucide, .plain-icon')) continue;
    if (skip.test(el.getAttribute('class') ?? '') || el.closest('g[class*="axis"], g[class*="grid"], g[class*="tick"]')) continue;
    const r = el.getBoundingClientRect();
    const thin = /^(line|path|polyline)$/.test(el.tagName);
    if (r.width + r.height < 3 || (!thin && r.width * r.height === 0)) continue;
    if (eff(el) < 0.4) continue;
    n++;
  }
  return { step: Number(g.dataset.step), n };
};
const jlines = [];
let jmiss = 0;
for (const [W, H] of JUMP === '0' || process.env.SANKEY === 'only' ? [] : jsizes) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll('.scrolly')]
      .filter((s) => !/is-single|is-once|is-inline/.test(s.className))
      .map((s) => ({
        id: s.id,
        cards: [...s.querySelectorAll('.scrolly-step')]
          .filter((li) => !li.classList.contains('is-spacer'))
          .map((li) => {
            const r = li.getBoundingClientRect();
            return Math.round(r.top + scrollY + r.height / 2);
          }),
      })),
  );
  if (!blocks.length) {
    jmiss++;
    jlines.push(`  MISS ${W}x${H}: no sticky scene at this size (every block drawn once)`);
  }
  const to = (t) => page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), t);
  for (const b of blocks) {
    for (let k = 0; k < b.cards.length; k++) {
      const y = Math.max(0, b.cards[k] - Math.round(H * 0.55));
      for (const mode of ['jump', 'reload', 'fast']) {
        if (mode === 'jump') {
          await page.goto(base + '/', { waitUntil: 'networkidle' });
          await to(y);
        } else if (mode === 'reload') {
          await page.reload({ waitUntil: 'load' });
          if (Math.abs((await page.evaluate(() => scrollY)) - y) > 4) await to(y);
        } else {
          await page.goto(base + '/', { waitUntil: 'networkidle' });
          await to(Math.max(0, y - H));
          await page.waitForTimeout(300);
          for (let i = 1; i <= 4; i++) {
            await to(Math.max(0, y - H + (H * i) / 4));
            await page.waitForTimeout(20);
          }
        }
        await page.waitForTimeout(JWAIT);
        const a = await page.evaluate(drawn, b.id);
        await page.waitForTimeout(JSETTLE);
        const z = await page.evaluate(drawn, b.id);
        const need = mode === 'fast' ? Math.ceil(z.n / 2) : z.n;
        const bad = a.n === 0 || z.n === 0 || a.n < need || a.step !== z.step;
        if (bad) jmiss++;
        jlines.push(`  ${bad ? 'MISS' : 'ok  '} ${W}x${H} ${mode.padEnd(6)} ${b.id} card ${k + 1}: step ${a.step}->${z.step}, marks ${a.n} on arrival, ${z.n} settled`);
      }
    }
  }
  await ctx.close();
}
if (jlines.length) {
  console.log('landing (jump, reload, fast scroll):');
  for (const l of jlines) console.log(l);
}
// Sankey probe (polish round blocker: the lost-pound Sankey stayed blank
// in about half of ordinary wheel-scroll arrivals). SANKEY=1 adds it,
// SANKEY=only runs it alone. Every Sankey on the Story and on Explore >
// Households, at SANKEY_SIZES (1280,800 390,844), motion on: SANKEY_RUNS
// (20) arrivals each, from 1.6 screens above it, the wheel paced by the
// wall clock at a reading speed (450 to 600px/s, cycling), until the
// figure's top is at 25% of the screen; 2s later at least 90% of its
// ribbons must be drawn (effective opacity >= 0.2 and no clip-path
// hiding more than 10% of its width). Prints the drawn runs per Sankey.
const SANKEY = process.env.SANKEY ?? '0';
let smiss = 0;
if (SANKEY !== '0') {
  const RUNS = Number(process.env.SANKEY_RUNS ?? 20);
  const ssizes = (process.env.SANKEY_SIZES ?? '1280,800 390,844').split(/\s+/).map((x) => x.split(',').map(Number));
  const pages = [['story', '/'], ['explore', '/?tab=explore&sub=households']];
  console.log('sankey arrivals (paced wheel scroll, 450-600px/s):');
  for (const [W, H] of ssizes) {
    for (const [pname, path] of pages) {
      const probe = await (await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'no-preference' })).newPage();
      await probe.goto(base + path, { waitUntil: 'networkidle' });
      const n = await probe.evaluate(() => document.querySelectorAll('.tab-panel:not([hidden]) svg.sankey').length);
      await probe.context().close();
      if (!n) console.log(`  --   ${W}x${H} ${pname}: no Sankey on this page`);
      for (let si = 0; si < n; si++) {
        let ok = 0;
        let name = '';
        for (let r = 0; r < RUNS; r++) {
          const speed = [450, 500, 550, 600][r % 4];
          const page = await (await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'no-preference' })).newPage();
          await page.goto(base + path, { waitUntil: 'networkidle' });
          await page.waitForTimeout(500);
          await page.mouse.move(3, H - 3);
          const g = await page.evaluate((si) => {
            const sk = document.querySelectorAll('.tab-panel:not([hidden]) svg.sankey')[si];
            const host = sk.closest('.scrolly, figure, section') ?? sk;
            const r = sk.getBoundingClientRect();
            return { id: host.id || sk.closest('[id]')?.id || `sankey-${si}`, ty: r.top + scrollY - innerHeight * 0.25, y0: Math.max(0, r.top + scrollY - innerHeight * 1.6) };
          }, si);
          name = name.includes('(no ribbon') ? name : g.id;
          await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), g.y0);
          await page.waitForTimeout(1200);
          let y = g.y0;
          const dt = 40;
          const t0 = Date.now();
          let k = 0;
          while (y < g.ty) {
            const d = Math.min((speed * dt) / 1000, g.ty - y);
            await page.mouse.wheel(0, d);
            y += d;
            k++;
            const due = t0 + k * dt - Date.now();
            if (due > 0) await page.waitForTimeout(due);
          }
          await page.waitForTimeout(2000);
          const share = await page.evaluate((si) => {
            const sk = document.querySelectorAll('.tab-panel:not([hidden]) svg.sankey')[si];
            // the ribbons this state should show: every poured one; of a
            // step-driven wipe (the output scene), those its step has revealed
            const links = [...sk.querySelectorAll('.sankey-link')].filter((l) => Number(l.style.opacity || 1) > 0 && (!l.classList.contains('is-wipe') || l.classList.contains('is-on')));
            if (!links.length) return null;
            const eff = (el) => {
              let o = 1;
              for (let e = el; e && e !== document.body; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
              return o;
            };
            const hidden = (l) => {
              const c = getComputedStyle(l).clipPath;
              const m = c.match(/^inset\((.*)\)$/);
              if (!m) return 0;
              const v = m[1].split(/\s+/);
              const right = v.length === 1 ? v[0] : v.length === 2 ? v[1] : v[1];
              const left = v.length === 4 ? v[3] : right;
              const pc = (x) => (x.endsWith('%') ? parseFloat(x) / 100 : 0);
              return pc(right) + pc(left === right && v.length < 4 ? '0' : left);
            };
            const drawn = links.filter((l) => eff(l) >= 0.2 && hidden(l) <= 0.1).length;
            return links.length ? drawn / links.length : 0;
          }, si);
          if (share == null || share >= 0.9) ok++;
          if (share == null) name += ' (no ribbon revealed at this step)';
          await page.context().close();
        }
        const bad = ok < RUNS;
        if (bad) smiss++;
        console.log(`  ${bad ? 'MISS' : 'ok  '} ${W}x${H} ${pname} ${name}: drawn in ${ok} of ${RUNS} arrivals`);
      }
    }
  }
}
await browser.close();
const msg = [misses ? `${misses} blocks hold a state for under ${HOLD}px or let the closing line overlap a step` : null, omiss ? `${omiss} openers leave the frame blank` : null, jmiss ? `${jmiss} landings show an empty or half-drawn figure` : null, smiss ? `${smiss} Sankeys left blank or half drawn on a reading-speed arrival` : null].filter(Boolean);
console.log(msg.length ? `FAIL: ${msg.join('; ')}` : 'PASS');
process.exit(msg.length ? 1 : 0);
