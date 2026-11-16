'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useActiveStep, useIsPhone, useReducedMotion } from './motion.js';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// a sticky graphic may take 45% of a phone screen, 50% of a tablet's
const capFor = (w) => (w >= 600 ? 0.5 : 0.45);
const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const subscribeWidth = (cb) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};

// A scrolly block: a sticky graphic and text steps that scroll past it.
// Desktop: steps in a column of about 340px on the left, the graphic sticky
// on the right and centred in the space below the rail; an "n of m" label
// on the graphic follows the active step. Phone (<= 900px), several steps:
// the graphic sticks below the story rail with an opaque backing and the
// cards scroll up beneath it, so a card never covers the chart. The graphic
// box keeps the height of its tallest state, so a state change never moves
// the cards (no layout shift). If that tallest state is more than 45% of the
// screen, a sticky graphic would leave too little room to read, so each step
// instead shows its own state of the graphic above its card (`is-inline`).
// Phone, one step: figure then text, nothing sticky. `graphic(active,
// reduce)` draws the state for the active step; every state must be
// readable on its own (a reader can land on any step from a link). Nothing
// hijacks the scroll.
//
// A step's `icon` (a concept from lib/concepts.js) leads its title.
//
// A step marked `pin: 'bottom'` describes the bottom of a figure that may be
// taller than the screen below the rail (laptops): while it is active, on
// desktop, the sticky box rises by the overflow so the figure's foot is in
// view. Other steps keep the figure pinned by its top.
//
// A step marked `spacer: true` has no card: the graphic holds its state while
// it scrolls past (a block can open on the state the previous block ended
// on, then change), and it is not counted in "n of m".
//
//   <Scrolly id="p1-output" steps={[{ id, title, body }]} graphic={(i) => ...} label="..." />
export default function Scrolly({ id, steps, graphic, label, wide = false }) {
  // One more registered element than steps: an end marker after the last
  // card, past which the block is done.
  const [register, raw] = useActiveStep(steps.length + 1);
  const done = raw >= steps.length;
  const active = Math.min(raw, steps.length - 1);
  const reduce = useReducedMotion();
  const phone = useIsPhone();
  const single = steps.length === 1;
  const reserve = phone && !single;
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
  // too tall to stick on a phone: each step carries its own state
  const inline = reserve && minH > 0 && typeof window !== 'undefined' && minH > window.innerHeight * capFor(window.innerWidth);
  const sizers = useRef(null);
  const box = useRef(null);
  const live = useRef(null);
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
  const cards = steps.filter((x) => !x.spacer).length;
  const many = cards > 1;
  const pinBottom = steps[active]?.pin === 'bottom';
  // pin a figure by its foot while a `pin: 'bottom'` step is active (desktop)
  useEffect(() => {
    const b = box.current;
    if (!b) return undefined;
    const place = () => {
      const over = pinBottom && window.innerWidth > 900 && live.current ? live.current.offsetHeight - b.clientHeight : 0;
      b.style.top = over > 0 ? `calc(var(--story-graphic-top) - ${over + 12}px)` : '';
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [pinBottom, width]);
  const cardIndex = steps.slice(0, active + 1).filter((x) => !x.spacer).length - 1;
  return (
    <div
      className={`scrolly${wide ? ' is-wide' : ''}${done ? ' is-done' : ''}${single ? ' is-single' : ''}${inline ? ' is-inline' : ''}`}
      id={id}
    >
      <div className="scrolly-graphic" ref={box} aria-label={label} role="group" hidden={inline || undefined}>
        <div
          className="scrolly-graphic-inner"
          data-step={active}
          ref={live}
          style={reserve && minH && !inline ? { minHeight: minH } : undefined}
        >
          {many ? <StepDots n={cards} active={Math.max(0, cardIndex)} /> : null}
          {inline ? null : graphic(active, reduce)}
        </div>
        {reserve && measuring ? (
          <div className="scrolly-sizers" ref={sizers} aria-hidden="true" inert="">
            {steps.map((s, i) => (
              <div key={s.id} className="scrolly-graphic-inner">
                {graphic(i, reduce)}
              </div>
            ))}
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
              {inline ? (
                <div className="scrolly-graphic-inner is-inline" role="group" aria-label={label}>
                  {graphic(i, reduce)}
                </div>
              ) : null}
              <div className="scrolly-card">
                {s.kicker ? <p className="scrolly-kicker">{s.kicker}</p> : null}
                {s.title ? (
                  <h3 className="scrolly-title">
                    {s.icon ? <Icon name={iconFor(s.icon)} size={18} className="scrolly-title-icon" /> : null}
                    {s.title}
                  </h3>
                ) : null}
                <div className="scrolly-body">{s.body}</div>
              </div>
            </li>
          ),
        )}
        <li className="scrolly-end" ref={register(steps.length)} aria-hidden="true" />
      </ol>
    </div>
  );
}

// Where the reader is in the block: one dot per step and "n of m" (data-axis:
// not a figure, for the number checks).
function StepDots({ n, active }) {
  return (
    <p className="scrolly-dots" aria-hidden="true" data-axis="">
      <span className="scrolly-dots-row">
        {Array.from({ length: n }, (_, i) => (
          <i key={i} className={i === active ? 'is-on' : i < active ? 'is-past' : ''} />
        ))}
      </span>
      <span className="scrolly-dots-n">
        {active + 1} of {n}
      </span>
    </p>
  );
}
