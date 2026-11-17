// Floating text (typography spec, 17 Nov; story-structure item 11): every
// text block on the Story belongs visibly to one object. Can a first-time
// reader tell which chart, card or header a sentence belongs to?
//
// Rule 1: every visible leaf text block in .story (p, li, dd, dt,
//   figcaption, summary, blockquote, h2-h6) of 12 characters or more has
//   one of these ancestors:
//     a header:  .part-opener, .scene-head, .story-rail, a beat (.story-beat);
//     a step:    .scrolly-step;
//     a frame:   .scrolly-graphic, figure, .story-frame (the shared card);
//     links:     .part-links, .lens-deeper.
//   The hero is stricter (item 11): its text is the question (.hero-q),
//   the scroll cue, or inside its figure frame; nothing on the plain page.
// Rule 2: every .scrolly-takeaway shares its nearest frame
//   (.scrolly-graphic-inner, figure, .story-frame) with an svg or a
//   [data-mark].
//
// Exempt for now, pending the quiet-sources merge (perf/sources replaces
// these with one "Sources and notes" icon inside each frame and reworks the
// vitals into a framed panel): .p1-vitals, .scrolly-foot, .p2-src-phone,
// .scrolly-notes, .p3-key, .fig-notes, .story-source. The integrator should
// drop these exemptions after that merge.
//
// Runs at 1280x800 and 390x844, under reduced motion and with motion (the
// page scrolled through so every scene has settled). Prints each failure's
// text and page y; exits 1 if there are any.
//
//   bun scripts/check_orphans.mjs http://localhost:4360   (CHROMIUM may
//   name a Chrome binary)
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const SIZES = (process.env.SIZES ?? '1280,800 390,844').split(/\s+/).map((s) => s.split(',').map(Number));
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let fails = 0;
for (const [W, H] of SIZES) {
  for (const motion of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: motion ? 'no-preference' : 'reduce' });
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    if (motion) {
      // scroll through so each scene settles, then back to the top
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += Math.round(H * 0.8)) {
        await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y);
        await page.waitForTimeout(60);
      }
      await page.waitForTimeout(400);
    }
    const out = await page.evaluate(() => {
      const story = document.querySelector('.tab-panel:not([hidden]) .story') ?? document.querySelector('.story');
      if (!story) return ['no .story on the page'];
      const skip = 'svg, [aria-hidden="true"], .visually-hidden, [hidden], .scrolly-sizers, .q-stage, .q-frame, .tip-box';
      const exempt = '.p1-vitals, .scrolly-foot, .p2-src-phone, .scrolly-notes, .p3-key, .fig-notes, .story-source';
      const owner = '.part-opener, .scene-head, .story-rail, .story-beat, .scrolly-step, .scrolly-graphic, figure, .story-frame, .part-links, .lens-deeper';
      const heroOwner = '.hero-q, .story-scroll-cue, figure, .story-frame';
      const frame = '.scrolly-graphic-inner, figure, .story-frame';
      const leaf = 'p, li, dd, dt, figcaption, summary, blockquote, h2, h3, h4, h5, h6';
      const shown = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
      };
      const y = (el) => Math.round(el.getBoundingClientRect().top + window.scrollY);
      const text = (el) => el.innerText.replace(/\s+/g, ' ').trim();
      const res = [];
      for (const el of story.querySelectorAll(leaf)) {
        if (el.closest(skip) || el.closest(exempt) || !shown(el)) continue;
        if (el.querySelector(leaf)) continue; // leaf blocks only
        const t = text(el);
        if (t.length < 12) continue;
        const hero = el.closest('.story-hero');
        const ok = hero ? !!el.closest(heroOwner) : !!el.closest(owner);
        if (!ok) res.push(`rule 1, y=${y(el)} <${el.tagName.toLowerCase()}>: ${t.slice(0, 90)}`);
      }
      for (const el of story.querySelectorAll('.scrolly-takeaway')) {
        if (el.closest(skip) || !shown(el)) continue;
        const f = el.closest(frame);
        const ok = f && f.querySelector('svg, [data-mark]');
        if (!ok) res.push(`rule 2, y=${y(el)} takeaway not in a chart's frame: ${text(el).slice(0, 90)}`);
      }
      return res;
    });
    fails += out.length;
    console.log(`${W}x${H}${motion ? ' (motion, settled)' : ''}: ${out.length}`);
    for (const l of out) console.log(`  ${l}`);
    await ctx.close();
  }
}
await browser.close();
console.log(fails ? `FAIL: ${fails} floating text blocks` : 'PASS');
process.exit(fails ? 1 : 0);
