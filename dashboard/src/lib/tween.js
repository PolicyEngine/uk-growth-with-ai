// Pure helpers for JS tweens of SVG geometry (components/story/Tween.jsx).
// WebKit cannot transition the CSS `d` property (nor x/y/width/height on SVG
// shapes), so path morphs are interpolated in JS, number by number, on the
// page's one rAF (lib/scrollLoop.js animate). Timing stays in the CSS: an
// element lists the custom property `--morph` in its transition, with the
// duration, easing and delay its `d` used to have; every override (reduced
// motion's `transition: none`, the landing snap's 0s) applies to it as it did
// to `d`.

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

const fmt = (x) => String(Math.round(x * 1000) / 1000);

// An interpolator between two strings of the same shape (the same commands,
// the same count of numbers, as the morphing charts draw them): t in [0, 1]
// to the string between. Null when the shapes differ (then the value snaps,
// as a CSS transition of `d` does for paths it cannot match).
export function lerpString(a, b) {
  const as = String(a).match(NUM) ?? [];
  const bs = String(b).match(NUM) ?? [];
  const skel = String(b).split(NUM);
  if (as.length !== bs.length || String(a).split(NUM).join('\u0000') !== skel.join('\u0000')) return null;
  const an = as.map(Number);
  const bn = bs.map(Number);
  return (t) => {
    if (t >= 1) return String(b);
    let out = skel[0];
    for (let i = 0; i < bn.length; i++) out += fmt(an[i] + (bn[i] - an[i]) * t) + skel[i + 1];
    return out;
  };
}

// cubic-bezier(x1, y1, x2, y2) as a function of progress (Newton, then
// bisection), as CSS evaluates it.
export function cubicBezier(x1, y1, x2, y2) {
  const bx = (t) => ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t;
  const by = (t) => ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t;
  const dx = (t) => 3 * (1 - 3 * x2 + 3 * x1) * t * t + 2 * (3 * x2 - 6 * x1) * t + 3 * x1;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = bx(t) - x;
      if (Math.abs(e) < 1e-6) return by(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const v = bx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return by(t);
  };
}

const NAMED = {
  linear: (x) => x,
  ease: cubicBezier(0.25, 0.1, 0.25, 1),
  'ease-in': cubicBezier(0.42, 0, 1, 1),
  'ease-out': cubicBezier(0, 0, 0.58, 1),
  'ease-in-out': cubicBezier(0.42, 0, 0.58, 1),
};

// A computed transition-timing-function to an easing function.
export function easing(css) {
  const s = String(css ?? '').trim();
  if (NAMED[s]) return NAMED[s];
  const m = s.match(/^cubic-bezier\(([^)]+)\)$/);
  if (m) {
    const [a, b, c, d] = m[1].split(',').map(Number);
    if ([a, b, c, d].every(Number.isFinite)) return cubicBezier(a, b, c, d);
  }
  return NAMED.ease;
}

// Split a computed list ("a, cubic-bezier(1, 2, 3, 4), b") on top-level commas.
const list = (s) => String(s ?? '').split(/,(?![^(]*\))/).map((x) => x.trim());
const ms = (s) => (s.endsWith('ms') ? parseFloat(s) : parseFloat(s) * 1000) || 0;

// The `--morph` entry of a computed style's transition lists: { duration,
// delay, ease } in ms, or null when it is not transitioned (no entry, or a
// zero duration).
export function morphTiming(cs) {
  const props = list(cs.transitionProperty);
  const i = props.indexOf('--morph');
  if (i < 0) return null;
  const at = (l) => {
    const a = list(l);
    return a[i % a.length];
  };
  const duration = ms(at(cs.transitionDuration));
  if (duration <= 0) return null;
  return { duration, delay: ms(at(cs.transitionDelay)), ease: easing(at(cs.transitionTimingFunction)) };
}
