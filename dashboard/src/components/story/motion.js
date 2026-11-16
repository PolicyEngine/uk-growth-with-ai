'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

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
export function useActiveStep(count, line = 0.55, phoneLine = 0.88) {
  const els = useRef([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const y = window.innerHeight * (window.innerWidth <= 900 ? phoneLine : line);
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
  }, [count, line, phoneLine]);
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

// A one-shot entry move for a figure whose opening state differs from its
// "before" picture: renders `prev` until `entered` (the figure is in view;
// Scrolly passes it as ctx.entered), holds `hold` ms, then renders `cur`, and
// from then on follows `cur` (step changes). Under reduced motion, `cur` at
// once. Call it inside a component (the figure), not inside Scrolly's
// `graphic` callback, which Scrolly calls conditionally.
//
//   const s = useEnterState(0, state, ctx?.entered ?? true);
// Inside FinalState (Scrolly's hidden measuring copies) it returns `cur`
// at once, so the box is measured on the real state.
export const FinalState = createContext(false);
export function useEnterState(prev, cur, entered, hold = 400) {
  const reduce = useReducedMotion();
  const final = useContext(FinalState);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!entered || armed || reduce || final) return undefined;
    const t = setTimeout(() => setArmed(true), hold);
    return () => clearTimeout(t);
  }, [entered, armed, hold, reduce, final]);
  return reduce || final || armed ? cur : prev;
}
