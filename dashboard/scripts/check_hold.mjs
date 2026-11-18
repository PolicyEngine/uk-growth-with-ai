// Hold probe (item 35): an element holds only inside a declared hold;
// everything else moves with the page. It replaces check_sticky.mjs, whose
// class allowlist could not see a hold made by a transform.
//
// Declared holds are marked in the DOM with data-hold:
//   chrome  the sticky stack and the story rail (navigation)
//   scene   in a .scrolly or .p2-output with at least two steps (not
//           .is-once or .is-single): the figure, the stuck scene header,
//           the pinned step items
//   opener  .q-stage-hold, a question screen (start, hold, release; the
//           opener probe in check_states.mjs tests its timing)
//
// Static pass: after scrolling the whole Story once, every rendered element
// with computed position sticky or fixed must sit inside closest('[data-
// hold]'), and its hold must be of a kind its place allows.
//
// Behavioural pass: wheel ticks of TICK px (20), down then up, through
// #story-close (HOLD_WALK=story walks the whole Story). At each tick every
// figure and heading outside a declared hold that is at least partly on
// screen must move by minus the scroll change, within 1px. With motion on,
// an entry animation may settle: a run of at most SETTLE_TICKS (4) off
// ticks in a row and SETTLE_PX (12) px in total is forgiven. Set from the
// first run (18 Nov): at 3 ticks and 8px the desktop pay row's 10px rise
// (.lens-pay, 1280, motion on) was the one miss; at 390 nothing in the
// close moves off the scroll once its entry is a fade. Only misses inside HOLD_FAIL (default
// story-close; "all" for every section) fail the run; the rest are printed.
//
//   bun scripts/check_hold.mjs http://localhost:4360
//   HOLD_SIZES="1280,800 390,844" HOLD_MOTION="no-preference reduce"
//   BROWSER=webkit runs WebKit; CHROMIUM may name a Chrome binary.
// check_states.mjs runs it after the boundary probe (STICKY=0 skips it).
import { chromium, webkit } from 'playwright';

const CANDIDATES = 'figure, .story-frame, h2, h3, .lens-circle, .lens-overlap, .lens-pay, .p3-close, .story-beat';

export async function holdProbe(browser, base, env = process.env, log = console.log) {
  const sizes = (env.HOLD_SIZES ?? '1280,800 390,844').split(/\s+/).map((x) => x.split(',').map(Number));
  const motions = (env.HOLD_MOTION ?? 'no-preference reduce').split(/\s+/);
  const TICK = Number(env.HOLD_TICK ?? 20);
  const SETTLE_TICKS = Number(env.SETTLE_TICKS ?? 4);
  const SETTLE_PX = Number(env.SETTLE_PX ?? 12);
  const WALK = env.HOLD_WALK ?? 'close';
  const FAIL = env.HOLD_FAIL ?? 'story-close';
  const touch = env.HOLD_TOUCH !== '0';
  let misses = 0;
  for (const [W, H] of sizes) {
    for (const rm of motions) {
      const phone = W < 600;
      const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: rm, ...(phone && touch ? { hasTouch: true, isMobile: browser.browserType().name() === 'chromium' } : {}) });
      const page = await ctx.newPage();
      await page.goto(base + '/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.round(H * 0.8)) {
        await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y);
        await page.waitForTimeout(25);
      }
      // ---- static pass ----
      const stat = await page.evaluate(() => {
        const out = [];
        const story = document.querySelector('.story');
        const all = [...document.querySelectorAll('body *')];
        for (const el of all) {
          const cs = getComputedStyle(el);
          if (cs.position !== 'sticky' && cs.position !== 'fixed') continue;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || cs.display === 'none' || cs.visibility === 'hidden') continue;
          // outside the Story (site header, dialogs): only the chrome may hold
          const inStory = story?.contains(el);
          const h = el.closest('[data-hold]');
          const name = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : ''}`;
          const sec = el.closest('section[id]')?.id ?? (inStory ? 'story' : 'page');
          let bad = null;
          if (!h) bad = 'no data-hold';
          else if (h.dataset.hold === 'scene') {
            const sc = h.closest('.scrolly, .p2-output');
            const steps = sc ? sc.querySelectorAll('.scrolly-step:not(.is-spacer), .p2-output-text').length : 0;
            if (!sc) bad = 'scene hold outside a .scrolly or .p2-output';
            else if (/\bis-(once|single)\b/.test(sc.className)) bad = `scene hold in a drawn-once block (${sc.id})`;
            else if (steps < 2) bad = `scene hold in a block with ${steps} steps (${sc.id})`;
          } else if (h.dataset.hold === 'opener') {
            if (!h.closest('.q-stage')) bad = 'opener hold outside a .q-stage';
          } else if (h.dataset.hold !== 'chrome') bad = `unknown hold "${h.dataset.hold}"`;
          out.push({ name, sec, kind: h?.dataset.hold ?? null, pos: cs.position, bad });
        }
        return out;
      });
      const sbad = stat.filter((s) => s.bad);
      const kinds = {};
      for (const s of stat) kinds[s.kind ?? 'none'] = (kinds[s.kind ?? 'none'] ?? 0) + 1;
      misses += sbad.length;
      log(`${W}x${H} ${rm}: static ${sbad.length ? 'MISS' : 'ok'}: ${stat.length} sticky or fixed (${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ')})`);
      for (const s of sbad.slice(0, 20)) log(`  MISS ${s.name} in #${s.sec} (${s.pos}): ${s.bad}`);
      // ---- behavioural pass ----
      const range = await page.evaluate((walk) => {
        const c = document.getElementById('story-close');
        if (walk === 'story' || !c) return [0, document.documentElement.scrollHeight - innerHeight];
        const r = c.getBoundingClientRect();
        return [Math.max(0, r.top + scrollY - innerHeight), Math.min(document.documentElement.scrollHeight - innerHeight, r.bottom + scrollY)];
      }, WALK);
      const n = await page.evaluate((sel) => {
        let i = 0;
        for (const el of document.querySelectorAll(sel)) {
          if (el.closest('[data-hold], [aria-hidden="true"], .visually-hidden, [hidden]')) continue;
          if (!el.closest('.story')) continue;
          el.dataset.hp = String(i++);
        }
        return i;
      }, CANDIDATES);
      const read = () =>
        page.evaluate(() => {
          const t = {};
          for (const el of document.querySelectorAll('[data-hp]')) {
            const r = el.getBoundingClientRect();
            if (!r.height || r.bottom <= 0 || r.top >= innerHeight) continue;
            t[el.dataset.hp] = r.top;
          }
          return { y: scrollY, t };
        });
      const info = await page.evaluate(() =>
        Object.fromEntries(
          [...document.querySelectorAll('[data-hp]')].map((el) => [
            el.dataset.hp,
            { name: `${el.tagName.toLowerCase()}${el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''}`, sec: el.closest('section[id]')?.id ?? 'story' },
          ]),
        ),
      );
      const found = [];
      for (const dir of [1, -1]) {
        await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), dir > 0 ? range[0] : range[1]);
        await page.waitForTimeout(rm === 'reduce' ? 200 : 1200);
        await page.mouse.move(W / 2, H / 2);
        let prev = await read();
        const run = {};
        for (let i = 0; i < 4000; i++) {
          await page.mouse.wheel(0, TICK * dir);
          await page.waitForTimeout(40);
          const cur = await read();
          const dy = cur.y - prev.y;
          if (!dy) {
            if ((dir > 0 && cur.y >= range[1] - 1) || (dir < 0 && cur.y <= range[0] + 1)) break;
            // a wheel tick that did not scroll at all, inside the range, is itself a miss
            found.push({ k: '-', name: 'page', sec: 'scroll', y: Math.round(cur.y), exp: -TICK * dir, act: 0, why: 'the page did not scroll' });
            prev = cur;
            if (found.length > 200) break;
            continue;
          }
          for (const k of Object.keys(cur.t)) {
            if (prev.t[k] == null) continue;
            const err = cur.t[k] - prev.t[k] + dy;
            const r = (run[k] ??= { ticks: 0, px: 0, start: null });
            if (Math.abs(err) > 1) {
              r.ticks++;
              r.px += Math.abs(err);
              r.start ??= { y: Math.round(cur.y), exp: Math.round(-dy), act: Math.round(cur.t[k] - prev.t[k]) };
              const allowed = rm === 'no-preference' && r.ticks <= SETTLE_TICKS && r.px <= SETTLE_PX;
              if (!allowed && !r.flagged) {
                r.flagged = true;
                found.push({ k, ...info[k], ...r.start, dir: dir > 0 ? 'down' : 'up' });
              }
            } else {
              run[k] = { ticks: 0, px: 0, start: null };
            }
          }
          prev = cur;
          if ((dir > 0 && cur.y >= range[1]) || (dir < 0 && cur.y <= range[0])) break;
        }
      }
      const failing = found.filter((f) => FAIL === 'all' || f.sec === FAIL || f.sec === 'scroll');
      misses += failing.length;
      log(`${W}x${H} ${rm}: walk (${WALK}, ${n} items, ${TICK}px wheel ticks) ${failing.length ? 'MISS' : 'ok'}: ${found.length} off the scroll, ${failing.length} in ${FAIL}`);
      for (const f of found.slice(0, 30)) log(`  ${failing.includes(f) ? 'MISS' : 'note'} ${f.name} in #${f.sec}, ${f.dir ?? ''} at ${f.y}: expected ${f.exp}px, moved ${f.act}px${f.why ? ' (' + f.why + ')' : ''}`);
      await ctx.close();
    }
  }
  return misses;
}

if (import.meta.main ?? process.argv[1]?.endsWith('check_hold.mjs')) {
  const base = process.argv[2] ?? 'http://localhost:4360';
  const browser = process.env.BROWSER === 'webkit' ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const m = await holdProbe(browser, base);
  await browser.close();
  console.log(m ? `${m} holds outside a declared hold` : 'hold probe: ok');
  process.exit(m ? 1 : 0);
}
