'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

// ---- Reversible entry (round 1) ----
// A nav link (lib/scroll revealAnchor fires a 'reveal' event) or a jump of
// more than half a screen in one frame lands the reader somewhere: what is
// entered then shows its final state at once (`instant`).
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
let navAt = -1e9;
if (typeof document !== 'undefined') {
  document.addEventListener('reveal', () => {
    navAt = now();
  });
}
export const navRecent = () => now() - navAt < 1500;

// The entry rule, pure: given the element's box this frame and the state
// before, the state after. It enters when its top is above `line` (share
// of the screen) and some of it is on screen; it resets only when it is
// wholly below the screen again (the reader scrolled back above it), so
// scrolling down replays it. Scrolling off the top keeps it entered (a
// reader coming back up from below sees the final state).
export function entryStep(prev, { top, bottom, V, line = 0.85, jumped = false }) {
  if (!prev.entered && top < V * line && bottom > 0) return { entered: true, instant: jumped, run: prev.run + 1 };
  if (prev.entered && top >= V) return { entered: false, instant: false, run: prev.run };
  return prev;
}

// Reversible "in view": { entered, instant, run } for the element at
// ref, following the scroll both ways (entryStep). `run` counts entries (a
// key for anything that must restart). Without layout (tests, no window)
// it is entered at once, instantly.
//
//   const [ref, entry] = useEntry();   entry = { entered, instant, run }
export function useEntry({ line = 0.85 } = {}) {
  const ref = useRef(null);
  const [st, setSt] = useState(() => ({ entered: typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined', instant: true, run: 0 }));
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let raf = 0;
    let first = true;
    let lastY = window.scrollY;
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const V = window.innerHeight;
      // no layout (jsdom): entered, instantly
      if (!r.height && !r.width) {
        setSt((s) => (s.entered ? s : { entered: true, instant: true, run: s.run + 1 }));
        return;
      }
      const y = window.scrollY;
      const jumped = first || Math.abs(y - lastY) > 0.5 * V || navRecent();
      first = false;
      lastY = y;
      setSt((s) => entryStep(s, { top: r.top, bottom: r.bottom, V, line, jumped }));
    };
    const on = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [line]);
  return [ref, st];
}

// Landed, not scrolled (round 2): true for `ms` after the figure at `ref`
// was entered by a jump, a reload or a nav link (entry.instant), or after
// an instant jump of more than half a screen while it is on screen (a
// scene already entered, jumped to a later step). Scrolly marks the block
// `is-snap` meanwhile and story.css drops every transition, transition
// delay and animation in it, so the current step's final state is drawn at
// once, not beat by beat from empty. Only state changes in timer and
// scroll callbacks (no sync setState in effects).
export function useSnap(ref, entry, ms = 900) {
  const [doneRun, setDoneRun] = useState(-1);
  const [jump, setJump] = useState(0);
  const [jumpDone, setJumpDone] = useState(0);
  const landed = Boolean(entry.entered && entry.instant) && doneRun !== entry.run;
  useEffect(() => {
    if (!landed) return undefined;
    const t = setTimeout(() => setDoneRun(entry.run), ms);
    return () => clearTimeout(t);
  }, [landed, entry.run, ms]);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let lastY = window.scrollY;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const y = window.scrollY;
      const V = window.innerHeight;
      const el = ref.current;
      if (el && (Math.abs(y - lastY) > 0.5 * V || navRecent())) {
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < V) setJump((j) => j + 1);
      }
      lastY = y;
    };
    const on = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      window.removeEventListener('scroll', on);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [ref]);
  useEffect(() => {
    if (jump === jumpDone) return undefined;
    const t = setTimeout(() => setJumpDone(jump), ms);
    return () => clearTimeout(t);
  }, [jump, jumpDone, ms]);
  return landed || jump !== jumpDone;
}

// The entry of the Scrolly figure a component sits in ({ entered, instant,
// run }), for primitives that play on entry (useEnterState, the Sankey
// pour, CountUp). Null outside a Scrolly.
export const EntryCtx = createContext(null);
export const useScrollyEntry = () => useContext(EntryCtx);

// Scroll and motion hooks for the story. Every animation reads
// useReducedMotion(): with "reduce" the final state shows at once. Nothing
// here moves the page or takes over scrolling; it only reads it.

export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduce;
}

// True on phone widths (<= 900px, the story's phone layout). False on the
// server and before mount.
export function useIsPhone(query = '(max-width: 900px)') {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [query]);
  return phone;
}

// True once the element has entered the viewport (stays true: a reveal plays
// once). Without IntersectionObserver (old browsers, tests) it is true.
// Threshold 0 with a pixel margin: a section taller than the screen counts
// as seen as soon as its top is 40px inside the viewport (a share threshold
// left tall sections invisible while on screen).
export function useInView(options = {}) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined');
  const { threshold = 0, rootMargin = '0px 0px -40px 0px' } = options;
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);
  return [ref, seen];
}

// The active step of a scrolly section: the step whose box crosses the
// line at `line` (share of the viewport height from the top). On phones
// (<= 900px) the line is `phoneLine`, near the bottom: the graphic changes
// as a card enters below it, before the card scrolls over it. Returns
// [register(i) => ref callback, activeIndex].
//
// `line` and `phoneLine` may also be functions returning the line in px
// from the top of the viewport (Scrolly measures a sticky scene's line from
// its figure); they are read at each measure.
export function useActiveStep(count, line = 0.55, phoneLine = 0.88) {
  const els = useRef([]);
  const lines = useRef({ line, phoneLine });
  useEffect(() => {
    lines.current = { line, phoneLine };
  });
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const l = window.innerWidth <= 900 ? lines.current.phoneLine : lines.current.line;
      const y = typeof l === 'function' ? l() : window.innerHeight * l;
      let best = 0;
      els.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top < y) best = i;
      });
      setActive((a) => (a === best ? a : best));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [count]);
  const register = (i) => (el) => {
    els.current[i] = el;
  };
  return [register, active];
}

// Reading progress through an element, 0 at its top reaching the bottom of
// the viewport, 1 at its bottom reaching the top.
export function useScrollProgress() {
  const ref = useRef(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height + window.innerHeight;
      const x = Math.min(1, Math.max(0, (window.innerHeight - r.top) / total));
      setP(x);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);
  return [ref, p];
}

// An entry move for a figure whose opening state differs from its
// "before" picture: renders `prev` until `entered` (the figure is in view;
// Scrolly passes it as ctx.entered), holds `hold` ms, then renders `cur`, and
// from then on follows `cur` (step changes). Reversible (round 1): when
// `entered` turns false again (the reader scrolled back above the scene) it
// shows `prev` again, and replays on the next entry. Landed by a jump or a
// nav link (the Scrolly's entry is `instant`): `cur` at once. Under reduced
// motion, `cur` at once. Call it inside a component (the figure), not inside Scrolly's
// `graphic` callback, which Scrolly calls conditionally.
//
//   const s = useEnterState(0, state, ctx?.entered ?? true);
// Inside FinalState (Scrolly's hidden measuring copies) it returns `cur`
// at once, so the box is measured on the real state.
export const FinalState = createContext(false);
export function useEnterState(prev, cur, entered, hold = 400) {
  const reduce = useReducedMotion();
  const final = useContext(FinalState);
  const entry = useContext(EntryCtx);
  // landed by a jump or a nav link: the final state at once
  const instant = Boolean(entry?.instant);
  const [armed, setArmed] = useState(false);
  // reversible (round 1): back above the scene (not entered) disarms it,
  // so scrolling down again replays the move
  if (!entered && armed) setArmed(false);
  useEffect(() => {
    if (!entered || armed || reduce || final || instant) return undefined;
    const t = setTimeout(() => setArmed(true), hold);
    return () => clearTimeout(t);
  }, [entered, armed, hold, reduce, final, instant]);
  return reduce || final || armed || (entered && instant) ? cur : prev;
}
