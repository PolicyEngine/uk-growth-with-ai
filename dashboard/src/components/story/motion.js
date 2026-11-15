'use client';

import { useEffect, useRef, useState } from 'react';

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

// True once the element has entered the viewport (stays true: a reveal plays
// once). Without IntersectionObserver (old browsers, tests) it is true.
export function useInView(options = {}) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined');
  const { threshold = 0.25, rootMargin = '0px 0px -10% 0px' } = options;
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
