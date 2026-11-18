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
// Opener probe (round 2 sign-off #1; 18 Nov: it selected the retired
// in-frame QFrame, found none and passed testing nothing): motion on, at
// 1280x800 and 390x844 (OPENER_SIZES), the scroll through every question
// moment (.q-stage[data-q], in a Scrolly or a TopicHead) in 10px steps,
// both ways. At every sample with the stage on screen, the question (card
// opacity >= 0.15, on screen) or its header copy (on screen, its block no
// longer asking) must be visible. During the hold (--qm 0, the card still
// since the last sample) the question's centre must sit within 4% of the
// screen below the rail of its optical centre (3% of that height below
// the middle); a stage never held is a miss. Finding no question moment
// is a miss, and so is a question header with no moment (not inline).
// OPENERS=0 skips it.
//
// Boundary probe (18 Nov, Vahid: closing lines ran over the next part's
// opener): motion on, at 1280x800, 1024x768, 768x1024 and 390x844
// (BOUNDARY_SIZES), a slow scroll (20px steps) from two screens above every
// part opener, the Part 3 closing block's head and the close's head to half
// a screen past it. At every sample no visible closing line
// ([data-closing]) or step text may intersect a part opener, its kicker,
// the closing block or another scene's box; and no figure frame at least
// half on screen may stay without a drawn mark once settled (800ms).
// BOUNDARY=0 skips it.
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
for (const [W, H] of JUMP === 'only' ? [] : sizes) {
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
// the held question's centre: 3% of the screen below the rail under its middle (QStage qMid), within 4%
const Q_OPT = 0.03;
const Q_TOL = 0.04;
for (const [W, H] of process.env.OPENERS === '0' || JUMP === 'only' ? [] : osizes) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  // every question moment, in a Scrolly or a TopicHead (both are .q-stage
  // since QFrame was retired), and every question header with none
  const { stages, orphans } = await page.evaluate(() => ({
    stages: [...document.querySelectorAll('.q-stage[data-q]')].map((s) => {
      const r = s.getBoundingClientRect();
      return { id: s.dataset.q, top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) };
    }),
    orphans: [...document.querySelectorAll('.scene-head.has-q[id^="q-"]')]
      .filter((h) => !h.closest('.scrolly.is-inline') && !document.querySelector(`.q-stage[data-q="${h.id.slice(2)}"]`))
      .map((h) => h.id),
  }));
  if (!stages.length) {
    omiss++;
    olines.push(`  MISS ${W}x${H}: no question moment (.q-stage) found: the probe would test nothing`);
  }
  for (const o of orphans) {
    omiss++;
    olines.push(`  MISS ${W}x${H} ${o}: a question header with no question moment`);
  }
  const at = (t) => page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), t);
  const probe = (id) =>
    page.evaluate((id) => {
      const s = document.querySelector(`.q-stage[data-q="${id}"]`);
      const railEl = document.querySelector('.story-rail');
      const R = railEl?.getBoundingClientRect().bottom ?? 0;
      const V = innerHeight;
      const r = s.getBoundingClientRect();
      if (r.bottom < R + 40 || r.top > V - 40) return { off: true };
      const card = s.querySelector('.q-stage-card');
      const c = card.getBoundingClientRect();
      const op = Number(getComputedStyle(card).opacity);
      // the stage's edge on screen but its card not yet (or no longer): the
      // moment is not showing, nothing to check
      if (c.bottom < R + 8 || c.top > V - 8) return { off: true };
      const cardOn = op >= 0.15;
      // the header's copy of the question: shown once its block stops asking
      // (opacity follows on a 400ms timer; the state is what counts)
      const head = document.getElementById(`q-${id}`);
      const h = head?.getBoundingClientRect();
      const headOn = Boolean(h && h.bottom > R && h.top < V && !head.closest('.scrolly.is-asking'));
      const v = s.querySelector('.q-visual').getBoundingClientRect();
      return { ok: cardOn || headOn, op, qm: Number(getComputedStyle(s).getPropertyValue('--qm')) || 0, phase: s.dataset.phase, mid: (v.top + v.bottom) / 2, R, V };
    }, id);
  for (const st of stages) {
    const blank = [];
    const offs = [];
    const y0 = Math.max(0, st.top - H);
    const y1 = st.bottom + 200;
    await at(Math.max(0, y0 - H));
    await page.waitForTimeout(250);
    // down, then back up (the phase follows the scroll both ways)
    for (const dir of ['down', 'up']) {
      let prev = null;
      for (let k = 0; k <= (y1 - y0) / 10; k++) {
        const y = dir === 'down' ? y0 + 10 * k : y1 - 10 * k;
        await at(y);
        await page.waitForTimeout(25);
        const r = await probe(st.id);
        if (!r.off && !r.ok) blank.push(`${dir} ${y} (q ${r.op.toFixed(2)})`);
        // the hold: no move yet and the card still since the last sample
        if (!r.off && r.qm === 0 && r.phase === 'in' && prev && Math.abs(r.mid - prev.mid) < 0.5) {
          const fh = r.V - r.R;
          offs.push((r.mid - (r.R + fh * (0.5 + Q_OPT))) / fh);
        }
        prev = r.off ? null : r;
      }
    }
    const lo = offs.length ? Math.min(...offs) : NaN;
    const hi = offs.length ? Math.max(...offs) : NaN;
    const offBad = !offs.length || lo < -Q_TOL || hi > Q_TOL;
    const bad = blank.length > 0 || offBad;
    if (bad) omiss++;
    const pos = offs.length ? `held ${offs.length} samples, centre ${(100 * lo).toFixed(1)}% to ${(100 * hi).toFixed(1)}% from target` : 'never held';
    olines.push(`  ${bad ? 'MISS' : 'ok  '} ${W}x${H} ${st.id}: ${pos}${blank.length ? `; blank at ${blank.length} samples, e.g. ${blank.slice(0, 3).join('; ')}` : ''}`);
  }
  olines.push(`  ${W}x${H}: ${stages.length} question moments checked`);
  await ctx.close();
}
if (olines.length) {
  console.log(`openers (question or its header always visible; held centre within ${100 * Q_TOL}% of the optical centre):`);
  for (const l of olines) console.log(l);
}

// ---- boundary probe ----
const blines = [];
let bmiss = 0;
const bsizes = (process.env.BOUNDARY_SIZES ?? '1280,800 1024,768 768,1024 390,844').split(/\s+/).map((x) => x.split(',').map(Number));
for (const [W, H] of process.env.BOUNDARY === '0' || JUMP === 'only' ? [] : bsizes) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  // every part opener, the Part 3 closing block's head and the close's head
  const heads = await page.evaluate(() =>
    [...document.querySelectorAll('.part-opener, .p3-close-head, .story-part-head')].map((h) => ({
      name: h.closest('[id]')?.id ?? h.className.split(' ')[0],
      top: Math.round(h.getBoundingClientRect().top + scrollY),
    })),
  );
  if (!heads.length) {
    bmiss++;
    blines.push(`  MISS ${W}x${H}: no part boundary found`);
  }
  const sample = () =>
    page.evaluate(() => {
      const out = [];
      const eff = (e, stop) => {
        let o = 1;
        for (let n = e; n && n !== stop; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
          o *= Number(cs.opacity);
        }
        return o;
      };
      const hit = (a, c) => Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 2 && Math.min(a.right, c.right) - Math.max(a.left, c.left) > 2;
      const on = (a) => a.bottom > 0 && a.top < innerHeight && a.height > 0;
      const guards = [...document.querySelectorAll('.part-opener, .part-opener-meta, .story-part-head, .p3-close-head, .p3-close-card')];
      const scenes = [...document.querySelectorAll('.scrolly')];
      for (const t of document.querySelectorAll('.story [data-closing], .scrolly-takeaway, .scrolly-step .scrolly-body')) {
        if (eff(t, document.body) < 0.05) continue;
        const a = t.getBoundingClientRect();
        if (!on(a)) continue;
        const own = t.closest('.scrolly');
        for (const g of guards) if (!g.contains(t) && hit(a, g.getBoundingClientRect())) out.push(`${own?.id ?? t.closest('[id]')?.id} text over ${g.className.split(' ')[0]}`);
        for (const s of scenes) if (s !== own && !s.contains(t) && hit(a, s.getBoundingClientRect())) out.push(`${own?.id ?? t.closest('[id]')?.id} text over scene ${s.id}`);
      }
      // a figure frame at least half on screen with no drawn mark
      const blank = [];
      for (const s of scenes) {
        const gr = s.querySelector('.scrolly-graphic');
        const g = gr?.querySelector(':scope > .scrolly-graphic-inner');
        if (!g || gr.hidden) continue;
        const a = g.getBoundingClientRect();
        if ((Math.min(a.bottom, innerHeight) - Math.max(a.top, 0)) / (a.height || 1) < 0.5 || eff(g, document.body) < 0.3) continue;
        let n = 0;
        for (const el of g.querySelectorAll('svg rect, svg path, svg circle, svg polyline, svg polygon, svg line, [data-mark]:not(svg *)')) {
          if (el.closest('button, .lucide, .plain-icon') || /axis|grid|zero|tick|guide/.test(el.getAttribute('class') ?? '') || el.closest('g[class*="axis"], g[class*="grid"], g[class*="tick"]')) continue;
          const r = el.getBoundingClientRect();
          if (r.width + r.height < 3 || eff(el, gr) < 0.4) continue;
          n++;
          break;
        }
        if (!n) blank.push(s.id);
      }
      return { out, blank };
    });
  for (const hd of heads) {
    const hits = new Map();
    const blanks = new Map();
    // a slow scroll from two screens above the boundary to half a screen past it
    for (let y = Math.max(0, hd.top - 2 * H); y <= hd.top + H / 2; y += 20) {
      await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y);
      await page.waitForTimeout(40);
      let r = await sample();
      // a frame blank in passing (a layer swap) is fine; blank at rest is not
      if (r.blank.length) {
        await page.waitForTimeout(800);
        const again = await sample();
        r = { out: r.out, blank: r.blank.filter((id) => again.blank.includes(id)) };
      }
      for (const k of r.out) hits.set(k, [...(hits.get(k) ?? []), y]);
      for (const k of r.blank) blanks.set(k, [...(blanks.get(k) ?? []), y]);
    }
    const bad = hits.size + blanks.size > 0;
    if (bad) bmiss++;
    const what = [...[...hits].map(([k, v]) => `${k} at ${v.length} samples (y ${v[0]})`), ...[...blanks].map(([k, v]) => `${k} frame blank at rest (y ${v[0]})`)];
    blines.push(`  ${bad ? 'MISS' : 'ok  '} ${W}x${H} into ${hd.name}${bad ? `: ${what.slice(0, 4).join('; ')}` : ''}`);
  }
  await ctx.close();
}
if (blines.length) {
  console.log('boundaries (no closing line or step text over a part opener, the closing block or another scene; no frame blank at rest):');
  for (const l of blines) console.log(l);
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
for (const [W, H] of JUMP === '0' ? [] : jsizes) {
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
await browser.close();
const msg = [misses ? `${misses} blocks hold a state for under ${HOLD}px or let the closing line overlap a step` : null, omiss ? `${omiss} openers leave the frame blank` : null, bmiss ? `${bmiss} part boundaries let text escape its scene or leave a frame blank` : null, jmiss ? `${jmiss} landings show an empty or half-drawn figure` : null].filter(Boolean);
console.log(msg.length ? `FAIL: ${msg.join('; ')}` : 'PASS');
process.exit(msg.length ? 1 : 0);
