// Round metrics for the Story tab (overnight rounds): page height, boxes
// (elements with a visible border or a filled background that is not the
// page's), icons (svg), words, distinct font sizes, text colours and
// background colours, links, folds (<details>), numbered badges. Reduced
// motion, so every state is drawn; all <details> opened for the counts.
//
//   bun scripts/measure_story.mjs http://localhost:4360 [width] [height]
//   (MOTION=1: motion on, the question screens in the page)
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4360';
const W = Number(process.argv[3] ?? 1280);
const H = Number(process.argv[4] ?? 800);
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await (await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: process.env.MOTION === '1' ? 'no-preference' : 'reduce' })).newPage();
await page.goto(base + '/', { waitUntil: 'networkidle' });
const m = await page.evaluate(() => {
  const panel = document.querySelector('.tab-panel:not([hidden])');
  const pageBg = getComputedStyle(document.body).backgroundColor;
  const height = document.documentElement.scrollHeight;
  panel.querySelectorAll('details').forEach((d) => (d.open = true));
  const visible = (el) => {
    if (el.closest('[aria-hidden="true"], [hidden], .visually-hidden')) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  let boxes = 0;
  const fonts = new Set(), colors = new Set(), bgs = new Set();
  for (const el of panel.querySelectorAll('*')) {
    if (el.closest('svg') || !visible(el)) continue;
    const s = getComputedStyle(el);
    const bg = s.backgroundColor;
    const filled = bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg) && bg !== pageBg;
    const bordered = ['Top', 'Right', 'Bottom', 'Left'].filter((k) => parseFloat(s[`border${k}Width`]) > 0 && s[`border${k}Style`] !== 'none').length >= 3;
    const r = el.getBoundingClientRect();
    if ((filled || bordered) && r.width > 40 && r.height > 24) boxes++;
    if (filled) bgs.add(bg);
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      fonts.add(s.fontSize);
      colors.add(s.color);
    }
  }
  // icons: Lucide glyphs (aria-hidden by design, so checked for display only)
  const shown = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && s.visibility !== 'hidden' && !el.closest('[hidden]'); };
  const icons = [...panel.querySelectorAll('svg.lucide')].filter(shown).length;
  const words = panel.innerText.split(/\s+/).filter(Boolean).length;
  const links = [...panel.querySelectorAll('a')].filter(visible).length;
  const folds = panel.querySelectorAll('details').length;
  const badges = [...panel.querySelectorAll('[class*="num-badge"], [class*="NumMark"], .hl-num, [data-num]')].filter(visible).length;
  return { height, boxes, icons, words, links, folds, badges, fontSizes: fonts.size, textColours: colors.size, backgrounds: bgs.size };
});
await browser.close();
console.log(`${W}x${H}${process.env.MOTION === '1' ? ' motion' : ''}: ${JSON.stringify(m)}`);
