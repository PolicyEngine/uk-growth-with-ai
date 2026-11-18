// Sticky and fixed elements on the Story (Vahid: "why stick?"; item 15).
// The only things that may stick are the site header and its tab row
// (with a settings chip's popover while open), the progress rail, and each
// scene's pinned chart (.scrolly-graphic) inside its own scene, with its
// step sentences held beside it (desktop) or under it (tablets). No topic
// row, label, question or beat sticks. Lists every element whose computed
// position is sticky or fixed, at 1280x800 and 390x844 (reduced motion and
// with motion, scrolled through the page), and fails on any outside the
// allowlist.
//
//   bun scripts/check_sticky.mjs http://localhost:4360   (CHROMIUM may name
//   a Chrome binary)
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const SIZES = (process.env.SIZES ?? '1280,800 390,844').split(/\s+/).map((s) => s.split(',').map(Number));
// allowed (matched with closest(), so their own children are covered):
//   the site header, tab row and settings (perf/header's slim header too),
//   an open popover or dialog, the rail, a scene's pinned chart, and at
//   768-900px a sticky scene's step sentence held under its stuck chart,
//   and on desktop a pinned scene's step items, held beside its stuck chart
//   inside their own step column (polish round E: pinned by the browser,
//   not a per-frame transform)
const ALLOW = [
  'header.band',
  '.sticky-stack',
  '.tabs-bar',
  'header.site-header',
  '.site-header',
  '.app-header',
  '.tab-row',
  '.tabs',
  '[role="tablist"]',
  '.settings-chip',
  '.settings-pop',
  '[role="dialog"]',
  '[popover]',
  '.story-rail',
  '.scrolly-graphic',
  '.scrolly.is-scene.has-foot .scrolly-card',
  '.scrolly.is-anchored > .scrolly-steps.is-pinned > .scrolly-step',
];
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let bad = 0;
for (const [W, H] of SIZES) {
  for (const motion of [false, true]) {
    const page = await (await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: motion ? 'no-preference' : 'reduce' })).newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    const seen = new Map();
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += Math.round(H * 0.9)) {
      await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y);
      await page.waitForTimeout(40);
      const found = await page.evaluate((ALLOW) => {
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.position !== 'sticky' && cs.position !== 'fixed') continue;
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          const ok = ALLOW.some((s) => el.closest(s));
          const name = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''}`;
          out.push({ name, pos: cs.position, ok });
        }
        return out;
      }, ALLOW);
      for (const f of found) seen.set(f.name, f);
    }
    const list = [...seen.values()];
    const fails = list.filter((f) => !f.ok);
    bad += fails.length;
    console.log(`${W}x${H}${motion ? ' (motion)' : ''}: ${list.length} sticky or fixed, ${fails.length} outside the allowlist`);
    for (const f of list) console.log(`  ${f.ok ? 'ok  ' : 'FAIL'} ${f.pos.padEnd(6)} ${f.name}`);
    await page.close();
  }
}
await browser.close();
console.log(bad ? `FAIL: ${bad} sticky or fixed elements outside the allowlist` : 'PASS');
process.exit(bad ? 1 : 0);
