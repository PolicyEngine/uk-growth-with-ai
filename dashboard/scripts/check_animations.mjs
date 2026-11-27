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
// Text probe (TEXT=1 after the checks above, TEXT=only alone; Fable 5.2
// final calls, fix 5): see the block at the end. Off by default, so the
// output above is unchanged without it.
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

const TEXT = process.env.TEXT ?? '';
// the hero, from load: its first frame is the final one (round 1, 696d773:
// "no count-up, no draw-in or fade"), so it must not move
if (TEXT !== 'only') {
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
const picked = TARGETS.filter(([n, b]) => !ONLY || ONLY.some((o) => n.includes(o) || b.includes(o)));
for (const [name, block, fig] of TEXT === 'only' ? [] : picked) {
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
for (const sel of TEXT === 'only' ? [] : ['#p3-pound', '#p2-output']) {
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
      const links = [...document.querySelectorAll(`${sel} svg.sankey .sankey-link`)].filter((l) => Number(l.style.opacity || 1) > 0);
      // the ribbons its state has poured or revealed; none at all is the blank
      const on = links.filter((l) => !/is-(pour|wipe)/.test(l.getAttribute('class')) || l.classList.contains('is-on'));
      if (!on.length) return 0;
      const drawn = on.filter((l) => {
        const m = getComputedStyle(l).clipPath.match(/^inset\((.*)\)$/);
        const v = m ? m[1].split(/\s+/) : [];
        const right = v.length >= 2 ? v[1] : v[0] ?? '0';
        return !(right.endsWith('%') && parseFloat(right) > 10);
      }).length;
      return drawn / on.length;
    }, sel);
    await page.close();
    if (share == null) console.log(`skip ${sel} paced ${speed}px/s: no ribbon revealed at the arrival step`);
    else report(share >= 0.9, `${sel} paced ${speed}px/s`, `${Math.round(share * 100)}% of ribbons drawn 3s after arrival`);
  }
}
// ---- Text probe (Fable 5.2 final calls, fix 5; pushE-rulings.md) ----
// Words and values in a figure are at full opacity within 600ms of their
// trigger (delay 300ms, fade 300ms at most); marks keep their pace.
//  - motion on: for each target, the entry (the first class change on
//    the figure or its scene once the figure is on screen and its question
//    moment has moved aside: the figure coming into view as the page
//    decides it) and each later step (the next card made active by a
//    wheel at SPEED px a frame; a scene drawn once is stepped by its
//    scrolly-go event). From each trigger the figure is sampled every
//    50ms for 3s in the page. Every text element (an element with its own
//    text; not in [inert], .scrolly-sizers or a [data-axis] tick) must
//    have, 700ms after the trigger, the effective opacity it has once
//    settled (3s): so text a step hides stays out of the count. 1000ms
//    for #p1-output's third step (the zoom to quarters) and the morph
//    axes (.p2-mo-axis, .p2-mo-x, .p2-mo-fade). A run cut by the next
//    trigger inside its 3s is skipped and named. Fewer runs than the
//    entry plus each later card is a miss, as is a motion-on entry where
//    neither text nor marks changed.
//  - reduced motion: nothing may animate, so the same at 100ms.
//  - lead (not a miss, for Vahid's eye): a run whose marks settle more
//    than 1s after its text prints LEAD; with SHOT=dir it also saves a
//    screenshot 700ms after the trigger.
//  - Part 1 with no JavaScript, and in print media with JavaScript on:
//    the vitals' values at opacity 1 and the sparklines drawn; the board's
//    focus line and end dot; both AI lines drawn, every AI dot, the area
//    and both end labels (the tiles layer hidden with no JavaScript);
//    every step card in Parts 1 to 3 at opacity 1.
// Written unrun (light-work rule): the browser run is its first.
async function textProbe() {
  const say = (ok, name, msg) => {
    if (!ok) misses++;
    console.log(`${ok ? 'ok  ' : 'MISS'} text ${name}: ${msg}`);
  };
  // installed in the page: trigger tracking and the 50ms sampler
  const INSTALL = ({ block, fig }) => {
    const blk = document.querySelector(block);
    const root = blk?.querySelector(fig) ?? blk;
    if (!root) return null;
    const sc = blk.closest('.scrolly');
    const cards = sc ? [...sc.querySelectorAll('.scrolly-step:not(.is-spacer)')] : [];
    const active = () => cards.findIndex((li) => li.classList.contains('is-active'));
    const inView = () => {
      if (sc?.classList.contains('is-asking')) return false;
      const r = root.getBoundingClientRect();
      return r.top < innerHeight * 0.95 && r.bottom > 0;
    };
    const eff = (el) => {
      if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return 0;
      let o = 1;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return o;
    };
    const own = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    const all = [...root.querySelectorAll('*')];
    const texts = all.filter((el) => own(el) && !el.closest('[inert], .scrolly-sizers, [data-axis]'));
    const marks = all.filter((el) => !own(el) && el.matches('rect, path, circle, line, polygon, [data-mark]') && !el.closest('[inert], .scrolly-sizers, [data-axis]'));
    const tp = { runs: [], step: active(), seen: false, cards: cards.length, once: /is-once/.test(sc?.className ?? '') };
    const sample = () => ({
      text: texts.map((el) => eff(el).toFixed(2)),
      marks: marks.map((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return `${eff(el).toFixed(2)}|${s.transform}|${s.strokeDashoffset}|${s.clipPath}|${Math.round(r.width)}x${Math.round(r.height)}`;
      }),
    });
    const start = (kind) => {
      const t0 = performance.now();
      const prev = tp.runs.at(-1);
      if (prev && t0 - prev.t0 < 3000) prev.cut = true;
      const run = { kind, t0, samples: [] };
      tp.runs.push(run);
      const tick = () => {
        const t = performance.now() - t0;
        run.samples.push({ t, ...sample() });
        if (t < 3000) setTimeout(tick, 50);
        else run.done = true;
      };
      tick();
    };
    const check = () => {
      const a = active();
      if (!tp.seen) {
        if (inView()) {
          tp.seen = true;
          tp.step = a;
          start('entry');
        }
        return;
      }
      if (a !== tp.step && a >= 0) {
        tp.step = a;
        start(`step ${a + 1}`);
      }
    };
    const mo = new MutationObserver(check);
    mo.observe(sc ?? root, { attributes: true, attributeFilter: ['class'], subtree: true });
    if (sc && !sc.contains(root)) mo.observe(root, { attributes: true, attributeFilter: ['class'], subtree: true });
    tp.desc = (i) => {
      const el = texts[i];
      return `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${el.textContent.trim().slice(0, 30)}"`;
    };
    tp.slow = (i) => Boolean(texts[i].closest('.p2-mo-axis, .p2-mo-x, .p2-mo-fade'));
    window.__tp = tp;
    return { cards: tp.cards, once: tp.once };
  };
  // the analysis of one run, in the page (it names elements)
  const ANALYSE = ({ i, early, block }) => {
    const tp = window.__tp;
    const run = tp.runs[i];
    const fin = run.samples.at(-1);
    const at = (ms) => run.samples.find((s) => s.t >= ms) ?? fin;
    const bad = [];
    fin.text.forEach((v, j) => {
      const allow = early ?? (tp.slow(j) || (block === '#p1-output' && run.kind === 'step 3') ? 1000 : 700);
      if (Math.abs(Number(at(allow).text[j]) - Number(v)) > 0.05) bad.push(`${tp.desc(j)} ${at(allow).text[j]} -> ${v} at ${allow}ms`);
    });
    // when each part last changed
    const settle = (key) => {
      let last = 0;
      for (let k = 1; k < run.samples.length; k++) if (run.samples[k][key].some((v, j) => v !== run.samples[k - 1][key][j])) last = run.samples[k].t;
      return Math.round(last);
    };
    const moved = run.samples.some((s, k) => k > 0 && ['text', 'marks'].some((key) => s[key].some((v, j) => v !== run.samples[k - 1][key][j])));
    return { kind: run.kind, cut: Boolean(run.cut), done: Boolean(run.done), moved, bad, text: settle('text'), marks: settle('marks') };
  };
  for (const rm of ['no-preference', 'reduce']) {
    const c = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: rm });
    const tag = rm === 'reduce' ? 'reduced' : 'motion';
    for (const [name, block, fig] of picked) {
      const page = await c.newPage();
      await page.goto(base + '/', { waitUntil: 'networkidle' });
      // past the scroll-restoration window (lib/scrollLoop.js RESTORE), so
      // every move reads as a reader's scroll, not a landing
      await page.waitForTimeout(2600);
      const info = await page.evaluate(INSTALL, { block, fig });
      if (!info) {
        if (W <= 900 && block === '#p2-output') console.log(`skip text ${name}: static on phones`);
        else say(false, `${name} (${tag})`, `${block} not on the page`);
        await page.close();
        continue;
      }
      const geo = await page.evaluate(({ block, fig }) => {
        const b = document.querySelector(block);
        const f = b.querySelector(fig) ?? b;
        return { blockTop: b.getBoundingClientRect().top + scrollY, figTop: f.getBoundingClientRect().top + scrollY };
      }, { block, fig });
      await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y), behavior: 'instant' }), geo.blockTop - H);
      await page.waitForTimeout(1500);
      // a jump above the figure must not count as its entry
      await page.evaluate(() => {
        window.__tp.runs.length = 0;
        window.__tp.seen = false;
      });
      await page.mouse.move(W / 2, H / 2);
      const wheelUntil = async (done, arg) => {
        for (let k = 0; k < 4000; k++) {
          if (await page.evaluate(done, arg)) return true;
          await page.mouse.wheel(0, SPEED);
          await page.waitForTimeout(16);
        }
        return false;
      };
      const stopAt = geo.figTop - 0.3 * H;
      // on to the entry probe's stop (the figure's top at 30% of the screen),
      // so the entry run sees the draw, not only the first class change
      await wheelUntil((y) => scrollY >= y, stopAt);
      const shoot = async (label) => {
        if (!process.env.SHOT) return;
        const t0 = await page.evaluate(() => window.__tp.runs.at(-1)?.t0 ?? performance.now());
        const now = await page.evaluate(() => performance.now());
        await page.waitForTimeout(Math.max(0, t0 + 700 - now));
        await page.screenshot({ path: `${process.env.SHOT}/text-${name.replace(/\W+/g, '-')}-${label}-${tag}-${W}.png` });
      };
      await shoot('entry');
      await page.waitForTimeout(3200);
      for (let k = 1; k < info.cards; k++) {
        if (info.once) {
          await page.evaluate(({ block, k }) => document.querySelector(block).closest('.scrolly').dispatchEvent(new CustomEvent('scrolly-go', { detail: { k } })), { block, k });
        } else {
          const ok = await wheelUntil((k) => window.__tp.step >= k, k);
          if (!ok) {
            say(false, `${name} (${tag})`, `card ${k + 1} never became active`);
            break;
          }
        }
        await shoot(`step${k + 1}`);
        await page.waitForTimeout(3200);
      }
      const n = await page.evaluate(() => window.__tp.runs.length);
      // the entry and one run per later card: a step that never triggers
      // must not pass by printing nothing
      const want = 1 + Math.max(0, info.cards - 1);
      if (n < want) say(false, `${name} (${tag})`, `${n} trigger(s) seen of ${want} (the entry and each later card)`);
      for (let i = 0; i < n; i++) {
        const r = await page.evaluate(ANALYSE, { i, early: rm === 'reduce' ? 100 : null, block });
        const label = `${name} ${r.kind} (${tag})`;
        if (r.cut || !r.done) {
          console.log(`skip text ${label}: ${r.cut ? 'cut by the next trigger' : 'not settled'}`);
          continue;
        }
        say(!r.bad.length, label, r.bad.length ? `${r.bad.length} text element(s) not settled: ${r.bad.slice(0, 3).join('; ')}` : `text settled by ${r.text}ms, marks by ${r.marks}ms`);
        // an entry with motion on where nothing changed: drawn before its
        // trigger, or never drawn; the 700ms check above would pass it
        if (rm !== 'reduce' && r.kind === 'entry' && !r.moved) say(false, label, 'neither text nor marks changed after the trigger');
        if (rm !== 'reduce' && r.marks - r.text > 1000) console.log(`LEAD text ${label}: text settled at ${r.text}ms, marks at ${r.marks}ms`);
      }
      await page.close();
    }
    await c.close();
  }
  // Part 1 drawn with no JavaScript, and in print media with JavaScript on
  const DRAWN = (nojs) => {
    const eff = (el) => {
      if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return 0;
      let o = 1;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return o;
    };
    const out = [];
    const need = (label, sel, test) => {
      const els = [...document.querySelectorAll(sel)].filter((el) => !el.closest('.scrolly-sizers'));
      if (!els.length) out.push(`${label}: none on the page`);
      const bad = els.filter((el) => !test(el));
      if (bad.length) out.push(`${label}: ${bad.length} of ${els.length}`);
    };
    const full = (el) => eff(el) > 0.99;
    const dash0 = (el) => Math.abs(parseFloat(getComputedStyle(el).strokeDashoffset) || 0) < 1e-3;
    need('vitals values', '.p1-vital-value', full);
    need('sparklines', '.p1-spark-line', dash0);
    need('board focus line and end', '.p1-board-series.is-focus :is(.p1-board-line, .p1-board-end)', full);
    need('AI lines', '.p1-ai-svg .p1-ai-line', (el) => dash0(el) && full(el));
    need('AI dots, area, end labels', '.p1-ai-svg :is(.p1-ai-dot, .p1-ai-area, .p1-end-label)', full);
    // the card's opacity times its ancestors' up to the scene, so a dimmed
    // step item is caught too
    const upTo = (el) => {
      let o = 1;
      for (let n = el; n; n = n.parentElement) {
        o *= Number(getComputedStyle(n).opacity);
        if (n.classList.contains('scrolly')) break;
      }
      return o;
    };
    need('step cards', '.scrolly .scrolly-steps .scrolly-step .scrolly-card', (el) => upTo(el) > 0.99);
    if (nojs) {
      const tiles = [...document.querySelectorAll('.p1-swap-layer')].filter((l) => l.querySelector('.p1-tiles, .p1-exposure'));
      if (tiles.some((l) => eff(l) > 0.01)) out.push('tiles layer shown with no JavaScript');
    }
    return out;
  };
  for (const mode of ['no JavaScript', 'print']) {
    const nojs = mode === 'no JavaScript';
    const c = await browser.newContext({ viewport: { width: W, height: H }, javaScriptEnabled: !nojs, reducedMotion: 'no-preference' });
    const page = await c.newPage();
    await page.goto(base + '/', { waitUntil: nojs ? 'load' : 'networkidle' });
    if (!nojs) {
      await page.emulateMedia({ media: 'print' });
      await page.waitForTimeout(400);
    }
    const bad = await page.evaluate(DRAWN, nojs);
    say(!bad.length, `Part 1 (${mode})`, bad.length ? bad.join('; ') : 'every mark of the state drawn, every step card at opacity 1');
    await c.close();
  }
}

const animMisses = misses;
if (TEXT) await textProbe();
await browser.close();
if (TEXT !== 'only') console.log(animMisses ? `FAIL: ${animMisses} figure(s) static on entry or moving on landing` : 'PASS: every figure animates on entry and lands in its final state');
if (TEXT) console.log(misses > animMisses ? `FAIL: ${misses - animMisses} text miss(es)` : `PASS: every figure's text is at its settled opacity in time, and Part 1 is drawn with no JavaScript and in print`);
process.exit(misses ? 1 : 0);
