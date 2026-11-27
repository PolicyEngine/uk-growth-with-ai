// Scroll smoothness: a visible (headed) Chrome window wheel-scrolls the whole
// Story continuously, top to bottom, while the page records every frame's
// duration (rAF deltas), long tasks (PerformanceObserver 'longtask') and the
// layout-shift total. Prints p50/p95/max frame time, long tasks over 50ms and
// CLS, per viewport. Usage: bun check_scroll_perf.mjs <url> [w h ...]
// Env: CHROMIUM (browser path), HEADLESS=1 to run hidden (numbers less real),
// SPEED px per wheel tick (default 100), P95_MAX (default 20) to fail above,
// CLS_MAX (default 0.02) to fail above: the layout shifts during the walk,
// each kept with its sources (tag, id, class), the five largest printed,
// THROTTLE CPU slowdown via CDP (default 4: a mid-range laptop, not this one).
// BROWSER=webkit runs Playwright's WebKit (an approximation of Safari),
// unthrottled (CPU throttling is CDP, Chromium only); CHROMIUM is ignored.
import { chromium, webkit } from 'playwright';

const [base = 'http://localhost:4360', ...rest] = process.argv.slice(2);
const sizes = rest.length >= 2 ? Array.from({ length: rest.length >> 1 }, (_, i) => [+rest[2 * i], +rest[2 * i + 1]]) : [[1280, 800], [390, 844]];
const SPEED = Number(process.env.SPEED ?? 100);
const P95_MAX = Number(process.env.P95_MAX ?? 20);
const CLS_MAX = Number(process.env.CLS_MAX ?? 0.02);
const WEBKIT = process.env.BROWSER === 'webkit';
const THROTTLE = WEBKIT ? 1 : Number(process.env.THROTTLE ?? 4);
const q = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];

let fail = false;
for (const [W, H] of sizes) {
  const browser = WEBKIT ? await webkit.launch({ headless: process.env.HEADLESS === '1' }) : await chromium.launch({ executablePath: process.env.CHROMIUM, headless: process.env.HEADLESS === '1', args: [`--window-size=${W},${H + 120}`] });
  // mobile WebKit has no mouse wheel: WebKit runs phone widths as a desktop page
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: !WEBKIT && W < 600, hasTouch: !WEBKIT && W < 600 });
  const cdp = WEBKIT ? null : await page.context().newCDPSession(page);
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  if (cdp && THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    window.__perf = { frames: [], long: [], cls: 0, shifts: [], run: true };
    const name = (n) => (n ? `${n.nodeName.toLowerCase()}${n.id ? '#' + n.id : ''}${typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\s+/).join('.') : ''}` : '(gone)');
    // WebKit has neither entry type (no long tasks or CLS reported there)
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__perf.long.push(e.duration))).observe({ type: 'longtask', buffered: false }); } catch { /* unsupported */ }
    try {
      new PerformanceObserver((l) =>
        l.getEntries().forEach((e) => {
          if (e.hadRecentInput) return;
          window.__perf.cls += e.value;
          window.__perf.shifts.push({ value: e.value, y: Math.round(scrollY), sources: (e.sources ?? []).map((s) => name(s.node)) });
        }),
      ).observe({ type: 'layout-shift', buffered: false });
    } catch { /* unsupported */ }
    let last = performance.now();
    const tick = (t) => { window.__perf.frames.push(t - last); last = t; if (window.__perf.run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await page.mouse.move(W / 2, H / 2);
  let y = 0;
  while (y < total - 4) {
    await page.mouse.wheel(0, SPEED);
    await page.waitForTimeout(16);
    y = await page.evaluate(() => scrollY);
  }
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => { window.__perf.run = false; return window.__perf; });
  const f = r.frames.slice(2).sort((a, b) => a - b);
  const longs = r.long.filter((d) => d > 50);
  const p95 = q(f, 0.95);
  console.log(`${W}x${H} (${WEBKIT ? 'webkit, unthrottled' : `cpu ×${THROTTLE}`}): frames ${f.length}, p50 ${q(f, 0.5).toFixed(1)}ms, p95 ${p95.toFixed(1)}ms, p99 ${q(f, 0.99).toFixed(1)}ms, max ${f.at(-1).toFixed(1)}ms, >33ms ${f.filter((d) => d > 33.4).length}, long tasks >50ms ${longs.length} (max ${longs.length ? Math.max(...longs).toFixed(0) : 0}ms), CLS ${r.cls.toFixed(3)}`);
  for (const sh of [...r.shifts].sort((a, b) => b.value - a.value).slice(0, 5)) console.log(`  shift ${sh.value.toFixed(4)} at y=${sh.y}: ${sh.sources.join(', ') || '(no sources)'}`);
  if (p95 > P95_MAX || longs.length || r.cls > CLS_MAX) fail = true;
  await browser.close();
}
console.log(fail ? `FAIL: p95 over ${P95_MAX}ms, long tasks over 50ms or CLS over ${CLS_MAX}` : 'PASS');
