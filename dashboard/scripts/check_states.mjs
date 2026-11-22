// State hold probe (scene plan addendum A5.3; headline-tiles ruling, Fix
// A and B): scrolling at TICK px (20) a tick through each sticky
// multi-card Scrolly block, a state counts as held for a tick only while it
// is the active one, at least 90% of the figure is in view, the figure has
// not moved since the last tick (stuck) and neither has the active
// sentence (together; desktop and sticky phone scenes alike). Vahid's
// floors (18 Nov): the first state needs 0.6 of the screen height of
// scroll, every other state 0.4 (FIRST and NEXT override). Printed beside
// it: the old in-view count. Blocks drawn once (phones) are skipped:
// their states are set by buttons.
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
// the middle); a stage never held is a miss. The card is fixed in its box
// (Vahid, 21 Nov: no zoom): at every sample on screen it is full size (its
// box height its layout height, computed transform none), and between
// samples it moves in the page's direction by 0 to 10px (the step), never
// sideways. Signed (Fable 5.2, fix list 8): a sample is flagged
// "sideways" (x moved), "against the page", "more than the step", or
// "drift" (a partial move, 0.5 to 9.5px, twice in a row: one partial step
// is the card pinning or unpinning between samples, two are not). Every
// flagged sample is printed. Finding no question moment
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
// Hold probe (item 35, after the boundary probe): scripts/check_hold.mjs.
// STICKY=0 skips it.
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
import { holdProbe } from './check_hold.mjs';

const base = process.argv[2] ?? 'http://localhost:4360';
const rest = process.argv.slice(3).map(Number);
const sizes = rest.length >= 2 ? Array.from({ length: rest.length >> 1 }, (_, i) => [rest[2 * i], rest[2 * i + 1]]) : [[1280, 800], [1366, 650], [807, 933], [390, 844]];
// Cards whose hold is not required, each with its ruling. #p2-headline (the
// GDP scene's last card, the headline figures) is taller than the room under
// the stuck figure on phones and is drawn unstuck there: accepted as a tall
// card at widths <= 480px (coordinator ruling, Opus stand-in, Fable
// unavailable, 19 Nov; checks-pushC.md, known phone exception).
const HOLD_EXEMPT = [{ step: 'p2-headline', maxW: 480 }];
const exempt = (id, W) => HOLD_EXEMPT.some((e) => e.step === id && W <= e.maxW);
const FIRST = Number(process.env.FIRST ?? 0.6);
const NEXT = Number(process.env.NEXT ?? 0.4);
const TICK = Number(process.env.TICK ?? 20);
// BROWSER=webkit runs Playwright's WebKit (an approximation of Safari)
const browser = process.env.BROWSER === 'webkit' ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let misses = 0;
const JUMP = process.env.JUMP ?? '1';
for (const [W, H] of JUMP === 'only' || process.env.SANKEY === 'only' || process.env.HOLDS === '0' ? [] : sizes) {
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
        const ids = [...s.querySelectorAll('.scrolly-step')].map((li) => li.id);
        return { id: s.id, top: r.top + scrollY, bottom: r.bottom + scrollY, cards, ids };
      }),
  );
  const lines = [];
  for (const b of blocks) {
    const held = {};
    const inView = {};
    let prev = null;
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
        // the active step's sentence (desktop: pinned with the chart)
        const act = s.querySelector('.scrolly-step.is-active .scrolly-body');
        const at = act ? act.getBoundingClientRect().top : null;
        return { step: Number(g.dataset.step), vis, hit, gt: gr.top, at, anchored: s.classList.contains('is-anchored') };
      }, b.id);
      if (r.vis >= 0.9) inView[r.step] = (inView[r.step] ?? 0) + TICK;
      // stuck and together: the same state as the last sample, the chart
      // where it was, and (desktop) the active sentence where it was
      if (prev && prev.step === r.step && r.vis >= 0.9 && Math.abs(r.gt - prev.gt) < 0.5 && r.at != null && prev.at != null && Math.abs(r.at - prev.at) < 0.5) held[r.step] = (held[r.step] ?? 0) + TICK;
      prev = r;
      if (r.hit) overlaps.add(`${y}:${r.hit}px`);
    }
    const per = b.cards.map((i) => held[i] ?? 0);
    const view = b.cards.map((i) => inView[i] ?? 0);
    const need = b.cards.map((i, k) => (exempt(b.ids[i], W) ? 0 : Math.round((k === 0 ? FIRST : NEXT) * H)));
    const bad = per.some((v, k) => v < need[k]) || overlaps.size > 0;
    if (bad) misses++;
    lines.push(`  ${bad ? 'MISS' : 'ok  '} ${b.id}: stuck ${per.join(', ')}px (need ${need[0]}, then ${need[1] ?? '-'}; in view ${view.join(', ')}px)${overlaps.size ? `; closing line over a step at ${[...overlaps].slice(0, 3).join(', ')}` : ''}`);
  }
  console.log(`${W}x${H}: ${blocks.length} sticky blocks`);
  for (const l of lines) console.log(l);
  await page.close();
}

// ---- opener probe ----
const olines = [];
let omiss = 0;
const osizes = (process.env.OPENER_SIZES ?? '1280,800 390,844').split(/\s+/).map((x) => x.split(',').map(Number));
// the held question's centre: 6% of the screen below the rail under its
// middle (QStage qMid; 18 Nov, Vahid: lower; it was 3%), within 4%
const Q_OPT = 0.06;
const Q_TOL = 0.04;
for (const [W, H] of process.env.OPENERS === '0' || JUMP === 'only' || process.env.SANKEY === 'only' ? [] : osizes) {
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
      // (hidden visually while the stage plays the question: not shown)
      const hq = head?.querySelector('.scene-head-q');
      const headOn = Boolean(h && h.bottom > R && h.top < V && !head.closest('.scrolly.is-asking') && hq && hq.getBoundingClientRect().width > 1);
      const v = s.querySelector('.q-visual').getBoundingClientRect();
      // the rendered scale of the card (its box against its layout height)
      const sc = card.offsetHeight ? c.height / card.offsetHeight : 0;
      return { ok: cardOn || headOn, op, sc, tf: getComputedStyle(card).transform, cx: (c.left + c.right) / 2, cy: (c.top + c.bottom) / 2, qm: Number(getComputedStyle(s).getPropertyValue('--qm')) || 0, phase: s.dataset.phase, mid: (v.top + v.bottom) / 2, R, V };
    }, id);
  for (const st of stages) {
    const blank = [];
    const moved = [];
    const scaled = [];
    const offs = [];
    const y0 = Math.max(0, st.top - H);
    const y1 = st.bottom + 200;
    await at(Math.max(0, y0 - H));
    await page.waitForTimeout(250);
    // down, then back up (the phase follows the scroll both ways)
    for (const dir of ['down', 'up']) {
      let prev = null;
      // the last sample's move was partial (a pin or an unpin)
      let partial = false;
      for (let k = 0; k <= (y1 - y0) / 10; k++) {
        const y = dir === 'down' ? y0 + 10 * k : y1 - 10 * k;
        await at(y);
        await page.waitForTimeout(25);
        const r = await probe(st.id);
        if (!r.off && !r.ok) blank.push(`${dir} ${y} (q ${r.op.toFixed(2)})`);
        // full size, untransformed, at every sample on screen
        if (!r.off && (Math.abs(r.sc - 1) > 0.01 || r.tf !== 'none')) scaled.push(`${dir} ${y} (scale ${r.sc.toFixed(2)}, ${r.tf})`);
        // since the last sample: in the page's direction, 0 to 10px (the
        // step), never sideways; one partial move is a pin or an unpin
        if (!r.off && prev) {
          const d = r.cy - prev.cy;
          // the move in the page's direction (content goes up as the page scrolls down)
          const m = dir === 'down' ? -d : d;
          const cls = [];
          if (Math.abs(r.cx - prev.cx) > 0.5) cls.push('sideways');
          if (m < -0.5) cls.push('against the page');
          if (m > 10.5) cls.push('more than the step');
          const part = m > 0.5 && m < 9.5;
          if (part && partial) cls.push('drift');
          partial = part;
          if (cls.length) moved.push(`${dir} ${y} (${d.toFixed(1)}px, ${cls.join(', ')})`);
        } else partial = false;
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
    const bad = blank.length > 0 || offBad || moved.length > 0 || scaled.length > 0;
    if (bad) omiss++;
    const pos = offs.length ? `held ${offs.length} samples, centre ${(100 * lo).toFixed(1)}% to ${(100 * hi).toFixed(1)}% from target` : 'never held';
    olines.push(`  ${bad ? 'MISS' : 'ok  '} ${W}x${H} ${st.id}: ${pos}${blank.length ? `; blank at ${blank.length} samples, e.g. ${blank.slice(0, 3).join('; ')}` : ''}${moved.length ? `; moved off the page at ${moved.length} samples: ${moved.join('; ')}` : ''}${scaled.length ? `; not at full size at ${scaled.length} samples, e.g. ${scaled.slice(0, 3).join('; ')}` : ''}`);
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
for (const [W, H] of process.env.BOUNDARY === '0' || JUMP === 'only' || process.env.SANKEY === 'only' ? [] : bsizes) {
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

// ---- hold probe ---- (item 35; scripts/check_hold.mjs, which replaces
// check_sticky.mjs): no element sticks or holds outside a declared hold
// ([data-hold]: chrome, scene, opener), and through the close every figure
// and heading moves with the page. STICKY=0 skips it; HOLD_* tune it.
let kmiss = 0;
if (process.env.STICKY !== '0' && JUMP !== 'only' && process.env.SANKEY !== 'only') {
  console.log('hold probe:');
  kmiss = await holdProbe(browser, base, process.env, (l) => console.log(`  ${l}`));
}

// ---- header probe ---- (HOLDS=0 skips the hold walk above)
// Every scene's header stays in view while its scene runs (18 Nov, Vahid:
// "why this disappearing when scroll": it scrolled away under the rail
// while the chart was held). Motion on, at HEADER_SIZES (1280,800
// 1024,768 390,844): for every card of every sticky scene, go to the card
// (scrolly-go, instant), let it settle (700ms), then the scene's header
// (its own .scene-head, or its host's for the output scene), unless it is
// hidden visually because its stage plays the question, must have
// effective opacity >= 0.95, be visible, lie inside the screen below the
// rail, and be the element at its centre (or contain it). Then through
// each scene's tail its text may meet no other text (below). HEADERS=0 skips.
const hlines = [];
let hmiss = 0;
const hsizes = (process.env.HEADER_SIZES ?? '1280,800 1024,768 390,844').split(/\s+/).map((x) => x.split(',').map(Number));
for (const [W, H] of process.env.HEADERS === '0' || JUMP === 'only' || process.env.SANKEY === 'only' ? [] : hsizes) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  // item 31: every scene question (all of them, sticky or not) is centred
  // on its content column (the header's parent), measured on its ink (a
  // Range over .scene-head-q), within 4px; Part 4's heading on .story
  const off = await page.evaluate(() => {
    const out = [];
    const ink = (el) => {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      const rs = [...rg.getClientRects()].filter((r) => r.width > 0);
      if (!rs.length) return null;
      return (Math.min(...rs.map((r) => r.left)) + Math.max(...rs.map((r) => r.right))) / 2;
    };
    const items = [...document.querySelectorAll('.scene-head')].map((h) => [h.id || h.parentElement.id, h.querySelector('.scene-head-q') ?? h, h.parentElement]);
    const two = document.getElementById('story-close-h');
    if (two) items.push(['story-close-h', two, document.querySelector('.story')]);
    for (const [id, q, col] of items) {
      // hidden visually (its question is on the stage): nothing to centre
      if (!q.getClientRects().length || q.getBoundingClientRect().width <= 1) continue;
      const c = ink(q);
      const r = col.getBoundingClientRect();
      if (c == null) continue;
      out.push({ id, d: Math.round((c - (r.left + r.right) / 2) * 10) / 10 });
    }
    return out;
  });
  const offBad = off.filter((o) => Math.abs(o.d) > 4);
  if (offBad.length) hmiss++;
  hlines.push(`  ${offBad.length ? 'MISS' : 'ok  '} ${W}x${H} ${off.length} scene questions centred on their column${offBad.length ? `: ${offBad.map((o) => `${o.id} ${o.d}px`).join(', ')}` : ` (largest ${Math.max(0, ...off.map((o) => Math.abs(o.d)))}px)`}`);
  // item dc-A (Vahid, "these text in middle"): every part bridge
  // (NextPart, nav.story-next) is centred on its part's column, measured on
  // the ink of its words (the kicker's and the title's text nodes, every
  // wrapped line; not the link's or the row's box), within 4px; its link at
  // least 44px tall at 900px and below. Fewer than three bridges is a miss.
  // Item dc-B: the Part 3 leaves-out block too (missing is a miss).
  // HEADERS=centre runs only these centring checks.
  const br = await page.evaluate(() => {
    const textInk = (root) => {
      const rs = [];
      const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (!n.nodeValue.trim() || n.parentElement.closest('.visually-hidden')) continue;
        const rg = document.createRange();
        rg.selectNodeContents(n);
        rs.push(...[...rg.getClientRects()].filter((r) => r.width > 0));
      }
      return rs.length ? (Math.min(...rs.map((r) => r.left)) + Math.max(...rs.map((r) => r.right))) / 2 : null;
    };
    const mid = (el) => {
      const r = el.getBoundingClientRect();
      return (r.left + r.right) / 2;
    };
    const out = [];
    for (const nav of document.querySelectorAll('nav.story-next')) {
      const a = nav.querySelector('.part-links-next');
      if (!a?.getClientRects().length) continue;
      const c = textInk(a);
      if (c == null) continue;
      out.push({ id: `bridge "${a.querySelector('.part-links-kicker')?.textContent ?? '?'}"`, d: Math.round((c - mid(nav.closest('.story-part, .story-leaves'))) * 10) / 10, h: Math.round(a.getBoundingClientRect().height) });
    }
    // item dc-B: the Part 3 "leaves out" block (box and its lead's and
    // foot's words) on the same column centre
    const card = document.querySelector('.p3-close-card');
    if (card?.getClientRects().length) {
      const col = mid(card.closest('.story-part, .story-leaves'));
      out.push({ id: 'leaves-out block', d: Math.round((mid(card) - col) * 10) / 10 });
      for (const sel of ['.p3-close-lead', '.p3-close-foot']) {
        const c = textInk(card.querySelector(sel));
        if (c != null) out.push({ id: sel, d: Math.round((c - col) * 10) / 10 });
      }
    }
    return out;
  });
  const brBad = br.filter((o) => Math.abs(o.d) > 4 || (W <= 900 && o.h != null && o.h < 44));
  const nBridge = br.filter((o) => o.id.startsWith('bridge')).length;
  const brMiss = brBad.length > 0 || nBridge < 3 || !br.some((o) => o.id === 'leaves-out block');
  if (brMiss) hmiss++;
  hlines.push(`  ${brMiss ? 'MISS' : 'ok  '} ${W}x${H} ${nBridge} part bridges and the leaves-out block centred on their column: ${br.map((o) => `${o.id} ${o.d}px${o.h != null ? ` (link ${o.h}px tall)` : ''}`).join(', ')}`);
  if (process.env.HEADERS === 'centre') {
    await ctx.close();
    continue;
  }
  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll('.scrolly')]
      .filter((s) => !/is-single|is-once|is-inline/.test(s.className))
      .map((s) => ({ id: s.id || s.closest('[id]')?.id, n: s.querySelectorAll('.scrolly-step:not(.is-spacer)').length })),
  );
  for (const b of blocks) {
    const bad = [];
    for (let k = 0; k < b.n; k++) {
      await page.evaluate(({ id, k }) => document.getElementById(id)?.dispatchEvent(new CustomEvent('scrolly-go', { detail: { k, instant: true } })), { id: b.id, k });
      await page.waitForTimeout(700);
      const r = await page.evaluate((id) => {
        const s = document.getElementById(id);
        const host = s.parentElement?.classList.contains('p2-output') ? s.parentElement : null;
        const h = s.querySelector(':scope > .scene-head') ?? host?.querySelector(':scope > .scene-head');
        if (!h) return { none: true };
        let op = 1;
        for (let e = h; e && e !== document.body; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.visibility === 'hidden' || cs.display === 'none') op = 0;
          op *= Number(cs.opacity);
        }
        const q = h.querySelector('.scene-head-q') ?? h;
        // hidden visually where the stage plays the question (story-bands.css
        // section 5): the question is shown once, on the stage
        if (q.getBoundingClientRect().width <= 1) return { none: true };
        for (let e = q; e && e !== h; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
        const R = document.querySelector('.story-rail')?.getBoundingClientRect().bottom ?? 0;
        const a = q.getBoundingClientRect();
        const inView = a.height > 0 && a.top >= R - 1 && a.bottom <= innerHeight + 1;
        const at = inView ? document.elementFromPoint((a.left + Math.min(a.right, a.left + 120)) / 2, (a.top + a.bottom) / 2) : null;
        const top = Boolean(at && (h === at || h.contains(at)));
        return { op: +op.toFixed(2), inView, top, y: Math.round(a.top), R: Math.round(R) };
      }, b.id);
      if (r.none) continue;
      if (r.op < 0.95 || !r.inView || !r.top) bad.push(`card ${k + 1}: opacity ${r.op}, ${r.inView ? 'in view' : `out of view (top ${r.y}, rail ${r.R})`}${r.inView && !r.top ? ', covered' : ''}`);
    }
    if (bad.length) hmiss++;
    hlines.push(`  ${bad.length ? 'MISS' : 'ok  '} ${W}x${H} ${b.id}${bad.length ? `: ${bad.slice(0, 3).join('; ')}` : ''}`);
  }
  if (!blocks.length) hlines.push(`  --   ${W}x${H}: no sticky scene`);
  // the scene's tail (sign-off r3: the stuck header stayed while the last
  // card and chart scrolled up under it and printed over it): 20px steps
  // from 1.5 screens above the block's foot to half a screen past it; while
  // the header is on screen (clear of the rail) no other text may be
  // painted where it meets the header's text, and the element at the
  // header's centre must be the header
  for (const b of blocks) {
    const foot = await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().bottom + scrollY, b.id);
    const bad = [];
    for (let y = Math.max(0, Math.round(foot - 1.5 * H)); y <= foot + H / 2; y += 20) {
      await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y);
      await page.waitForTimeout(30);
      const r = await page.evaluate((id) => {
        const s = document.getElementById(id);
        const host = s.parentElement?.classList.contains('p2-output') ? s.parentElement : null;
        const h = s.querySelector(':scope > .scene-head') ?? host?.querySelector(':scope > .scene-head');
        if (!h) return null;
        const q = h.querySelector('.scene-head-q') ?? h;
        const a = q.getBoundingClientRect();
        if (a.width <= 1) return null; // hidden visually: no text to meet
        const R = document.querySelector('.story-rail')?.getBoundingClientRect().bottom ?? 0;
        // on screen and clear of the rail (as it lets go it slides under
        // the rail, which is meant to cover it)
        if (a.top < R - 1 || a.top >= innerHeight) return null;
        const eff = (e) => {
          let o = 1;
          for (let n = e; n && n !== document.body; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (cs.visibility === 'hidden' || cs.display === 'none') return 0;
            o *= Number(cs.opacity);
          }
          return o;
        };
        const hits = [];
        const w = document.createTreeWalker(document.querySelector('.tab-panel:not([hidden])'), NodeFilter.SHOW_TEXT);
        for (let t = w.nextNode(); t; t = w.nextNode()) {
          if (!t.nodeValue.trim()) continue;
          const el = t.parentElement;
          if (!el || h.contains(el) || el.closest('.story-rail, .visually-hidden, [aria-hidden="true"] .q-visual, .scrolly-sizers')) continue;
          const rg = document.createRange();
          rg.selectNodeContents(t);
          for (const c of rg.getClientRects()) {
            if (c.width < 1 || c.height < 1) continue;
            const oy = Math.min(c.bottom, a.bottom) - Math.max(c.top, a.top);
            const ox = Math.min(c.right, a.right) - Math.max(c.left, a.left);
            if (oy > 2 && ox > 2 && eff(el) > 0.05) {
              // text under the opaque header is hidden, not printed over
              // it: a hit is text painted where the two meet
              // (a header with no opaque fill shows it through: a hit too)
              const bg = getComputedStyle(h).backgroundColor;
              const opaque = !/rgba\(.*, 0\)|transparent/.test(bg) && !/rgba\(.*, 0\.\d+\)/.test(bg);
              const p = document.elementFromPoint(Math.max(c.left, a.left) + ox / 2, Math.max(c.top, a.top) + oy / 2);
              if (!opaque || (p && !(h === p || h.contains(p)))) {
                hits.push(t.nodeValue.trim().slice(0, 24));
                break;
              }
            }
          }
          if (hits.length) break;
        }
        const at = document.elementFromPoint((a.left + Math.min(a.right, a.left + 120)) / 2, (a.top + a.bottom) / 2);
        return { hit: hits[0] ?? null, top: Boolean(at && (h === at || h.contains(at))) };
      }, b.id);
      if (r && (r.hit || !r.top)) bad.push(`y ${y}: ${r.hit ? `meets "${r.hit}"` : 'covered'}`);
    }
    if (bad.length) hmiss++;
    hlines.push(`  ${bad.length ? 'MISS' : 'ok  '} ${W}x${H} ${b.id} tail${bad.length ? `: ${bad.length} samples, e.g. ${bad.slice(0, 3).join('; ')}` : ''}`);
  }
  await ctx.close();
}
if (hlines.length) {
  console.log('headers (every scene header visible, in view and on top at every card):');
  for (const l of hlines) console.log(l);
}

// ---- edge probe ----
// No text is clipped at the screen's edges (item 30: a cut "ral" of "UK
// central" at the far left of the GDP scene on a phone). Motion on, at
// EDGE_SIZES (1280,800 390,844): at every card of every scene (and with
// each drawn-once figure in view), every visible text box (HTML and svg
// text, effective opacity >= 0.3, not in the rail, a hidden or
// aria-hidden copy) must lie inside the screen's width (1px slack) and
// inside every clipping ancestor (overflow hidden or clip). EDGES=0 skips.
const elines = [];
let emiss = 0;
const esizes = (process.env.EDGE_SIZES ?? '1280,800 390,844').split(/\s+/).map((x) => x.split(',').map(Number));
for (const [W, H] of process.env.EDGES === '0' || JUMP === 'only' || process.env.SANKEY === 'only' ? [] : esizes) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const scenes = await page.evaluate(() => [...document.querySelectorAll('.tab-panel:not([hidden]) .scrolly[id]')].map((s) => ({ id: s.id, n: s.querySelectorAll('.scrolly-step:not(.is-spacer)').length, once: /is-once|is-single/.test(s.className) })));
  const found = new Map();
  for (const sc of scenes) {
    for (let k = 0; k < Math.max(1, sc.n); k++) {
      await page.evaluate(({ id, k, once }) => {
        const el = document.getElementById(id);
        el.dispatchEvent(new CustomEvent('scrolly-go', { detail: { k, instant: true } }));
        if (once) el.querySelector('.scrolly-graphic')?.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, { id: sc.id, k, once: sc.once });
      await page.waitForTimeout(900);
      const hits = await page.evaluate((id) => {
        const out = [];
        const root = document.getElementById(id);
        const vis = (el) => {
          let o = 1;
          for (let n = el; n && n !== document.body; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (cs.visibility === 'hidden' || cs.display === 'none') return 0;
            o *= Number(cs.opacity);
          }
          return o;
        };
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let t = w.nextNode(); t; t = w.nextNode()) {
          const txt = t.nodeValue.trim();
          if (!txt) continue;
          const el = t.parentElement;
          if (!el || el.closest('.visually-hidden, [aria-hidden="true"], .scrolly-sizers, [hidden], .story-rail')) continue;
          const rg = document.createRange();
          rg.selectNodeContents(t);
          const r = rg.getBoundingClientRect();
          if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight || vis(el) < 0.3) continue;
          let clipped = r.left < -1 || r.right > innerWidth + 1;
          for (let a = el.parentElement; a && !clipped && a !== document.body; a = a.parentElement) {
            const cs = getComputedStyle(a);
            if (!/hidden|clip/.test(cs.overflowX + cs.overflow)) continue;
            const b = a.getBoundingClientRect();
            if (r.left < b.left - 1 || r.right > b.right + 1) clipped = true;
          }
          if (clipped) out.push(`"${txt.slice(0, 24)}" at x ${Math.round(r.left)} to ${Math.round(r.right)}`);
        }
        return out;
      }, sc.id);
      for (const h of hits) found.set(`${sc.id}: ${h}`, k + 1);
    }
  }
  if (found.size) emiss++;
  elines.push(`  ${found.size ? 'MISS' : 'ok  '} ${W}x${H}: ${scenes.length} scenes${found.size ? `, ${found.size} clipped texts, e.g. ${[...found.keys()].slice(0, 4).join('; ')}` : ', no text clipped at the edges'}`);
  await ctx.close();
}
if (elines.length) {
  console.log('edges (no text clipped at the screen or a clipping box):');
  for (const l of elines) console.log(l);
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
            const links = [...sk.querySelectorAll('.sankey-link')].filter((l) => Number(l.style.opacity || 1) > 0);
            // the ribbons its state has poured or revealed (a step-driven pour,
            // the output scene, pours one column a step); none at all is the
            // blank this probe exists for
            const on = links.filter((l) => !/is-(pour|wipe)/.test(l.getAttribute('class')) || l.classList.contains('is-on'));
            if (!on.length) return 0;
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
            const drawn = on.filter((l) => eff(l) >= 0.2 && hidden(l) <= 0.1).length;
            return drawn / on.length;
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
const msg = [misses ? `${misses} blocks hold a state for under ${FIRST} (first) or ${NEXT} of the screen or let the closing line overlap a step` : null, omiss ? `${omiss} openers leave the frame blank` : null, bmiss ? `${bmiss} part boundaries let text escape its scene or leave a frame blank` : null, jmiss ? `${jmiss} landings show an empty or half-drawn figure` : null, hmiss ? `${hmiss} scenes let their header go out of view or fade` : null, emiss ? `${emiss} sizes clip text at the edges` : null, smiss ? `${smiss} Sankeys left blank or half drawn on a reading-speed arrival` : null, kmiss ? `${kmiss} holds outside a declared hold` : null].filter(Boolean);
console.log(msg.length ? `FAIL: ${msg.join('; ')}` : 'PASS');
process.exit(msg.length ? 1 : 0);
