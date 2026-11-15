'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useActiveStep, useIsPhone, useReducedMotion } from './motion.js';

const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const subscribeWidth = (cb) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};

// A scrolly block: a sticky graphic and text steps that scroll past it.
// Desktop: steps in a narrow column on the left, the graphic sticky on the
// right. Phone (<= 900px), several steps: the graphic sticks below the
// story rail with an opaque backing and the cards scroll up beneath it, so
// a card never covers the chart; each card is read in the space below the
// graphic. The graphic box keeps the height of its tallest state, so a
// state change never moves the cards (no layout shift). Phone, one step:
// figure then text, nothing sticky. `graphic(active, reduce)` draws the
// state for the active step; every state must be readable on its own (a
// reader can land on any step from a link). Nothing hijacks the scroll.
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
  const width = useSyncExternalStore(subscribeWidth, () => window.innerWidth, () => 0);
  const [measured, setMeasured] = useState({ w: -1, h: 0 });
  const measuring = reserve && measured.w !== width;
  const minH = reserve && measured.w === width ? measured.h : 0;
  const sizers = useRef(null);
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
  return (
    <div className={`scrolly${wide ? ' is-wide' : ''}${done ? ' is-done' : ''}${single ? ' is-single' : ''}`} id={id}>
      <div className="scrolly-graphic" aria-label={label} role="group">
        <div className="scrolly-graphic-inner" data-step={active} ref={live} style={reserve && minH ? { minHeight: minH } : undefined}>
          {graphic(active, reduce)}
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
        {steps.map((s, i) => (
          <li key={s.id} id={s.id} ref={register(i)} className={`scrolly-step${i === active ? ' is-active' : i < active ? ' is-past' : ''}`} aria-current={i === active ? 'step' : undefined}>
            <div className="scrolly-card">
              {s.kicker ? <p className="scrolly-kicker">{s.kicker}</p> : null}
              {s.title ? <h3 className="scrolly-title">{s.title}</h3> : null}
              <div className="scrolly-body">{s.body}</div>
            </div>
          </li>
        ))}
        <li className="scrolly-end" ref={register(steps.length)} aria-hidden="true" />
      </ol>
    </div>
  );
}
