'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { FinalState, useActiveStep, useInView, useIsPhone, useReducedMotion } from './motion.js';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// a sticky graphic may take 45% of a phone screen, 50% of a tablet's
const capFor = (w) => (w >= 600 ? 0.5 : 0.45);
const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const subscribeWidth = (cb) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};

// A scrolly block: a figure and text steps beside it. No empty page: a block
// ends when its last card ends, cards are 32px apart (no viewport-height
// steps), and the active step changes as a card crosses the trigger line
// (motion.js). Desktop: steps in a column of about 340px on the left, the
// figure on the right, sticky below the rail only while the step column is
// taller than it; an "n of m" row of dot buttons on the figure follows the
// active step. One card: a plain two-column block (stacked on phones),
// nothing sticky. Phones (<= 900px), several cards: the figure once, then
// its cards (`phone="once"`, the default; ctx.once is true and the last
// card's state is drawn), unless the block is a `scene` (several states
// worth watching): then the figure sticks below the rail on an opaque
// backing, cards scroll beneath it, and its box keeps the height of its
// tallest state (no layout shift). A scene whose tallest state is more than
// 45% of the screen falls back to the figure once. `phone="steps"` instead
// gives each step its own copy of the figure (`is-inline`), for blocks whose
// states are different figures. `graphic(active, reduce, ctx)` draws the
// state for the active step; every state must be readable on its own (a
// reader can land on any step from a link). Nothing hijacks the scroll.
//
// A step's `icon` (a concept from lib/concepts.js) leads its title.
//
// A step marked `pin: 'bottom'` describes the bottom of a figure that may be
// taller than the screen below the rail (laptops): while it is active, on
// desktop, the sticky box rises by the overflow so the figure's foot is in
// view. Other steps keep the figure pinned by its top.
//
// A step marked `spacer: true` has no card and no height (a zero-height
// marker; kept so old step lists still work), and is not counted in "n of m".
//
//   <Scrolly id="p1-output" steps={[{ id, title, body }]} graphic={(i) => ...} label="..." />
//
// Opt-in (wave 2; a caller that passes none of these renders as before):
//   graphic(active, reduce, ctx)  ctx = { inline, once, entered, prev }:
//                `entered` turns true once this copy of the figure is in
//                view (each inline copy has its own), `prev` is the step
//                shown before (null at first; i - 1 for inline copy i), for
//                useEnterState (motion.js) one-shot entry moves;
//   phone        "once" (default) or "steps", as above;
//   scene        sticky on phones too (a multi-state scene);
//   foot         a node (the one-line source, any legend): inside the
//                figure card on desktop, after the last card at 900px and
//                below, printed once either way;
//   sub          the scene sub-header above the block: a string or
//                { title, icon } (icon a concept). Rendered as
//                <header class="scene-head" data-scene="title"> (the rail
//                reads [data-scene]); step titles then become h4;
//   step.kickerIcon  a concept leading the kicker (default: step.icon).
export default function Scrolly({ id, steps, graphic, label, wide = false, phone: phoneMode, scene = false, foot, sub }) {
  // One more registered element than steps: an end marker after the last
  // card, past which the block is done.
  const [register, raw] = useActiveStep(steps.length + 1);
  const done = raw >= steps.length;
  const active = Math.min(raw, steps.length - 1);
  const reduce = useReducedMotion();
  const phone = useIsPhone();
  const cards = steps.filter((x) => !x.spacer).length;
  const single = cards <= 1;
  // phones: sticky only for a multi-state `scene` whose figure fits the cap
  const reserve = phone && !single && scene;
  // The tallest state's height, measured once per width from hidden copies
  // of every state, then kept as the box's min-height; the copies unmount.
  const width = useSyncExternalStore(
    subscribeWidth,
    () => window.innerWidth,
    () => 0,
  );
  const [measured, setMeasured] = useState({ w: -1, h: 0 });
  const measuring = reserve && measured.w !== width;
  const minH = reserve && measured.w === width ? measured.h : 0;
  // too tall to stick on a phone
  const tooTall = reserve && minH > 0 && typeof window !== 'undefined' && minH > window.innerHeight * capFor(window.innerWidth);
  const flat = phone && !single && (!scene || tooTall);
  // phone="steps": each step carries its own copy of the figure (for blocks
  // whose states are different figures); otherwise one figure, then the cards
  const inline = flat && phoneMode === 'steps';
  const once = flat && !inline;
  const sizers = useRef(null);
  const box = useRef(null);
  const live = useRef(null);
  const [seenRef, entered] = useInView({ rootMargin: '0px 0px -15% 0px' });
  const liveRef = (el) => {
    live.current = el;
    seenRef.current = el;
  };
  // the step shown before the active one, for one-shot moves
  const [hist, setHist] = useState({ cur: active, prev: null });
  if (hist.cur !== active) setHist({ cur: active, prev: hist.cur });
  const lastCard = steps.reduce((k, x, i) => (x.spacer ? k : i), 0);
  useIso(() => {
    if (!measuring || !sizers.current) return;
    const hs = [...sizers.current.children].map((c) => c.getBoundingClientRect().height);
    const own = live.current ? live.current.getBoundingClientRect().height : 0;
    setMeasured({ w: width, h: Math.ceil(Math.max(own, ...hs)) });
  }, [measuring, width]);
  // A state taller than measured (fonts, a changed scenario) raises the box.
  useEffect(() => {
    if (!reserve || !live.current || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      const h = Math.ceil(live.current?.getBoundingClientRect().height ?? 0);
      setMeasured((m) => (h > m.h ? { ...m, h } : m));
    });
    ro.observe(live.current);
    return () => ro.disconnect();
  }, [reserve]);
  const many = cards > 1;
  const pinBottom = steps[active]?.pin === 'bottom';
  // pin a figure by its foot while a `pin: 'bottom'` step is active (desktop)
  useEffect(() => {
    const b = box.current;
    if (!b) return undefined;
    // desktop: a figure shorter than the space below the rail sticks centred
    // in it (no tall blank band under it); a taller one sticks by its top,
    // or by its foot while a `pin: 'bottom'` step is active
    const place = () => {
      b.style.top = '';
      if (window.innerWidth <= 900 || single) return;
      const top = parseFloat(getComputedStyle(b).top) || 0;
      const room = window.innerHeight - top;
      const over = b.offsetHeight - room;
      if (pinBottom && over > 0) b.style.top = `${top - over - 12}px`;
      else if (over < 0) b.style.top = `${top + Math.floor(-over / 2)}px`;
    };
    place();
    window.addEventListener('resize', place);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    ro?.observe(b);
    return () => {
      window.removeEventListener('resize', place);
      ro?.disconnect();
    };
  }, [pinBottom, width, single]);
  const cardIndex = steps.slice(0, active + 1).filter((x) => !x.spacer).length - 1;
  const cardSteps = steps.map((x, i) => (x.spacer ? -1 : i)).filter((i) => i >= 0);
  const shown = once ? lastCard : active;
  const ctx = { inline: false, once, entered, prev: once ? null : hist.prev };
  const sizerCtx = { inline: false, once: false, entered: true, prev: null };
  const dots = many && !once && !inline;
  const subTitle = typeof sub === 'string' ? sub : sub?.title;
  const TitleTag = sub ? 'h4' : 'h3';
  const footHere = foot != null ? <div className="scrolly-foot">{foot}</div> : null;
  return (
    <div
      className={`scrolly${wide ? ' is-wide' : ''}${done ? ' is-done' : ''}${single ? ' is-single' : ''}${inline ? ' is-inline' : ''}${once ? ' is-once' : ''}${sub ? ' has-sub' : ''}`}
      id={id}
    >
      {sub ? (
        <header className="scene-head" data-scene={subTitle}>
          {typeof sub === 'object' && sub.icon ? <Icon name={iconFor(sub.icon)} size={16} className="scene-head-icon" /> : null}
          <h3 className="scene-head-title">{subTitle}</h3>
        </header>
      ) : null}
      <div className="scrolly-graphic" ref={box} aria-label={label} role="group" hidden={inline || undefined}>
        <div
          className={`scrolly-graphic-inner${dots ? ' has-dots' : ''}`}
          data-step={shown}
          ref={liveRef}
          style={reserve && minH && !inline ? { minHeight: minH } : undefined}
        >
          {dots ? <StepDots n={cards} active={Math.max(0, cardIndex)} steps={cardSteps.map((i) => steps[i])} reduce={reduce} /> : null}
          {inline ? null : graphic(shown, reduce, ctx)}
          {phone ? null : footHere}
        </div>
        {reserve && measuring ? (
          <div className="scrolly-sizers" ref={sizers} aria-hidden="true" inert="">
            <FinalState.Provider value>
              {steps.map((s, i) => (
                <div key={s.id} className={`scrolly-graphic-inner${dots ? ' has-dots' : ''}`}>
                  {graphic(i, reduce, sizerCtx)}
                </div>
              ))}
            </FinalState.Provider>
          </div>
        ) : null}
      </div>
      <ol className="scrolly-steps">
        {steps.map((s, i) =>
          s.spacer ? (
            <li key={s.id} id={s.id} ref={register(i)} className="scrolly-step is-spacer" aria-hidden="true" />
          ) : (
            <li
              key={s.id}
              id={s.id}
              ref={register(i)}
              className={`scrolly-step${i === active ? ' is-active' : i < active ? ' is-past' : ''}`}
              aria-current={i === active ? 'step' : undefined}
            >
              {inline ? <InlineCopy graphic={graphic} i={i} reduce={reduce} label={label} /> : null}
              <div className="scrolly-card">
                {s.kicker ? (
                  <p className="scrolly-kicker">
                    {s.kickerIcon || s.icon ? <Icon name={iconFor(s.kickerIcon ?? s.icon)} size={14} className="scrolly-kicker-icon" /> : null}
                    {s.kicker}
                  </p>
                ) : null}
                {s.title ? (
                  <TitleTag className="scrolly-title">
                    {s.icon ? <Icon name={iconFor(s.icon)} size={18} className="scrolly-title-icon" /> : null}
                    <span>{s.title}</span>
                  </TitleTag>
                ) : null}
                <div className="scrolly-body">{s.body}</div>
              </div>
            </li>
          ),
        )}
        <li className="scrolly-end" ref={register(steps.length)} aria-hidden="true" />
      </ol>
      {phone ? footHere : null}
    </div>
  );
}

// One step's own copy of the figure (inline fallback, 900px and below), with
// its own `entered`, so each copy plays its one-shot move as it comes into view.
function InlineCopy({ graphic, i, reduce, label }) {
  const [ref, entered] = useInView({ rootMargin: '0px 0px -15% 0px' });
  return (
    <div ref={ref} className="scrolly-graphic-inner is-inline" role="group" aria-label={label}>
      {graphic(i, reduce, { inline: true, once: false, entered, prev: i > 0 ? i - 1 : null })}
    </div>
  );
}

// Bring step `el` to where it becomes the active step (motion.js trigger
// lines): on desktop just below the rail; at 900px and below just under the
// sticky figure, never below the 0.88 trigger line.
function goToStep(el, box, reduce) {
  const h = window.innerHeight;
  const phoneW = window.innerWidth <= 900;
  let y;
  if (!phoneW) {
    y = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  } else {
    const b = box?.getBoundingClientRect();
    const under = b && getComputedStyle(box).position === 'sticky' ? b.bottom + 8 : 120;
    y = Math.min(h * 0.88 - 12, under);
  }
  const top = el.getBoundingClientRect().top + window.scrollY - y;
  window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
}

// Where the reader is in the block: one dot per card and "n of m". Each dot
// is a button ("Step n of m: title", aria-current on the active one) that
// scrolls to its step; Left and Right (Home, End) move between them. The
// "n of m" text is data-axis (not a figure, for the number checks).
function StepDots({ n, active, steps, reduce }) {
  const btns = useRef([]);
  const go = (k, focus) => {
    const j = Math.max(0, Math.min(n - 1, k));
    const el = typeof document !== 'undefined' ? document.getElementById(steps[j].id) : null;
    if (el) goToStep(el, btns.current[0]?.closest('.scrolly-graphic'), reduce);
    if (focus) btns.current[j]?.focus({ preventScroll: true });
  };
  const onKey = (e, i) => {
    const k = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
    if (k == null) return;
    e.preventDefault();
    go(k, true);
  };
  return (
    <div className="scrolly-dots" role="group" aria-label="Steps" data-axis="">
      <span className="scrolly-dots-row">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            ref={(el) => {
              btns.current[i] = el;
            }}
            className={i === active ? 'is-on' : i < active ? 'is-past' : ''}
            aria-label={`Step ${i + 1} of ${n}${s.title ? `: ${typeof s.title === 'string' ? s.title : ''}` : ''}`.replace(/: $/, '')}
            aria-current={i === active ? 'step' : undefined}
            tabIndex={i === active ? 0 : -1}
            onClick={() => go(i, false)}
            onKeyDown={(e) => onKey(e, i)}
          />
        ))}
      </span>
      <span className="scrolly-dots-n" aria-hidden="true">
        {active + 1} of {n}
      </span>
    </div>
  );
}
