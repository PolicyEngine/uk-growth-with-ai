// One scroll/resize loop for the whole page. Every scroll-driven piece of the
// story subscribes here instead of adding its own listener and rAF: one
// passive scroll listener, one resize listener, one requestAnimationFrame per
// frame, and inside it every subscriber's read() first (getBoundingClientRect,
// offsetHeight, computed style: layout is clean, so at most one layout per
// frame), then every write() (styles, classes, setState). Reads and writes
// never interleave across components, so no forced synchronous layout.
//
//   const off = subscribe({ el, read(f) { return data }, write(data, f) {} });
//
// f = { y, dy, V, jumped, up, rail() }: the page's scroll position, the move
// since the last frame, the viewport height, `jumped` (the first run of a
// subscriber, a move of more than half a screen in one frame, a nav link in
// the last 1.5s, or a fast scroll: more than half a screen within 150ms),
// `up` (scrolled up by hand, not a jump) and rail() (the story rail's
// bottom, read once per frame).
//
// `el` (optional): the subscriber only works while el is within a screen of
// the viewport (an IntersectionObserver gate). It also runs once on each
// change of that (so resets on leaving still happen), on every frame that is
// a jump or follows a resize, and synchronously when it subscribes.
// off.invalidate() asks for one run on the next frame (a ResizeObserver).

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// a nav link (lib/scroll revealAnchor fires a 'reveal' event) marks the next
// 1.5s as a jump
let navAt = -1e9;
export const navRecent = () => now() - navAt < 1500;

// recent scroll positions (one per frame of the loop), for fastRecent
const SPAN = 150;
let marks = [];
export function fastRecent(V) {
  const t = now();
  const y = typeof window !== 'undefined' ? window.scrollY : 0;
  return marks.some((m) => t - m[0] <= SPAN && Math.abs(y - m[1]) > 0.5 * V);
}

const subs = new Set();
let started = false;
let raf = 0;
let lastY = 0;
let resized = false;
let io = null;
const byEl = new Map();
// scroll work is due (a scroll, a resize, a nav link, an observer); frames
// asked for by animations alone skip the subscribers
let pending = false;
const anims = new Set();

// one subscriber's error never stops the others (nor the loop): its write
// is skipped, an animation stops
const ERR = Symbol('error');
function guard(fn, ...args) {
  try {
    return fn(...args);
  } catch (e) {
    console.error(e);
    return ERR;
  }
}

function schedule(work = true) {
  if (work) pending = true;
  if (raf || typeof window === 'undefined') return;
  if (typeof window.requestAnimationFrame !== 'function') return;
  raf = window.requestAnimationFrame(frame);
}

function railReader() {
  let v;
  return () => {
    if (v === undefined) v = document.querySelector('.story-rail')?.getBoundingClientRect().bottom ?? 0;
    return v;
  };
}

// The browser's own scroll restoration on a reload (WebKit restores after
// first paint, and in steps as the page grows, so no single step is a jump):
// any move in the first RESTORE ms after the loop starts, before the reader
// has touched the wheel, a key, a pointer or the screen, is a landing.
const RESTORE = 2500;
let startedAt = 0;
let touched = false;
export const restoring = () => !touched && now() - startedAt < RESTORE;

function frameInfo(first) {
  const y = window.scrollY;
  const V = window.innerHeight;
  const dy = y - lastY;
  const jumped = first || Math.abs(dy) > 0.5 * V || navRecent() || fastRecent(V) || (dy !== 0 && restoring());
  return { y, dy, V, jumped, up: dy < 0 && !jumped, rail: railReader() };
}

function frame(time) {
  raf = 0;
  if (pending) {
    pending = false;
    scrollWork();
  }
  // animations (Tween.jsx): writes only, after the scroll work
  for (const a of anims) {
    const r = guard(a, time ?? now());
    if (r === false || r === ERR) anims.delete(a);
  }
  if (anims.size) schedule(false);
}

function scrollWork() {
  const f = frameInfo(false);
  lastY = f.y;
  // the recent positions (fastRecent), one per frame
  const t = now();
  marks.push([t, f.y]);
  marks = marks.filter((m) => t - m[0] <= SPAN + 50);
  // a hard jump (or a resize): every subscriber, near or not
  const all = resized || Math.abs(f.dy) > 0.5 * f.V || navRecent();
  resized = false;
  // on those frames the gate is set from the boxes too (reads only): an
  // observer callback that arrives late never leaves a block idle
  if (all && io) {
    const V = f.V;
    for (const [el, set] of byEl) {
      const r = el.getBoundingClientRect();
      const near = r.bottom > -V && r.top < 2 * V && (r.width > 0 || r.height > 0);
      for (const s of set) s.near = near;
    }
  }
  const run = [];
  for (const s of subs) {
    if (all || s.near || s.dirty) run.push(s);
    s.dirty = false;
  }
  const data = new Array(run.length);
  for (let i = 0; i < run.length; i++) data[i] = run[i].read ? guard(run[i].read, f) : undefined;
  for (let i = 0; i < run.length; i++) if (subs.has(run[i]) && run[i].write && data[i] !== ERR) guard(run[i].write, data[i], f);
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  lastY = window.scrollY;
  startedAt = now();
  const touch = () => {
    touched = true;
  };
  for (const ev of ['wheel', 'keydown', 'pointerdown', 'touchstart']) window.addEventListener(ev, touch, { passive: true, once: true, capture: true });
  window.addEventListener(
    'scroll',
    // no scrollY read here: in a scroll event it can force a layout
    schedule,
    { passive: true },
  );
  window.addEventListener('resize', () => {
    resized = true;
    schedule();
  });
  document.addEventListener('reveal', () => {
    navAt = now();
    schedule();
  });
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          for (const s of byEl.get(e.target) ?? []) {
            if (s.near !== e.isIntersecting) s.dirty = true;
            s.near = e.isIntersecting;
          }
        }
        schedule();
      },
      { rootMargin: '100% 0px 100% 0px', threshold: 0 },
    );
  }
}

export function subscribe({ el = null, read, write }) {
  if (typeof window === 'undefined') return Object.assign(() => {}, { invalidate() {} });
  start();
  const s = { read, write, near: true, dirty: false };
  subs.add(s);
  if (el && io) {
    let set = byEl.get(el);
    if (!set) {
      set = new Set();
      byEl.set(el, set);
      io.observe(el);
    } else {
      // already observed: no new callback comes, so take a sibling's gate
      for (const o of set) s.near = o.near;
    }
    set.add(s);
  }
  // the first run, now (render on landing reads it as a jump)
  const f = frameInfo(true);
  const d = read ? read(f) : undefined;
  write?.(d, f);
  const off = () => {
    subs.delete(s);
    if (el && io) {
      const set = byEl.get(el);
      set?.delete(s);
      if (set && !set.size) {
        byEl.delete(el);
        io.unobserve(el);
      }
    }
  };
  off.invalidate = () => {
    s.dirty = true;
    schedule();
  };
  return off;
}

// Run `step(time)` once per frame (after the scroll work) until it returns
// false; returns a stop function. For JS tweens (Tween.jsx) that share the
// page's one rAF.
export function animate(step) {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    step(Infinity);
    return () => {};
  }
  anims.add(step);
  schedule(false);
  return () => anims.delete(step);
}

// Write a style property only when it changes (no style invalidation for a
// value that is already there).
export function setStyle(el, prop, value) {
  if (el.style.getPropertyValue(prop) !== value) el.style.setProperty(prop, value);
}
