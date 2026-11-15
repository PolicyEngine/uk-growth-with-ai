'use client';

import { useActiveStep, useReducedMotion } from './motion.js';

// A scrolly block: a sticky graphic and text steps that scroll past it.
// Desktop: steps in a narrow column on the left, the graphic sticky on the
// right. Phone: the graphic sticky at the top of the screen, the steps scroll
// over its lower part as cards. `graphic(active, reduce)` draws the state for
// the active step; every state must be readable on its own (a reader can
// land on any step from a link). Nothing hijacks the scroll.
//
//   <Scrolly id="p1-output" steps={[{ id, title, body }]} graphic={(i) => ...} label="..." />
export default function Scrolly({ id, steps, graphic, label, wide = false }) {
  // One more registered element than steps: an end marker after the last
  // card. Past it the block is done; on phones the last card then fades like
  // every other, so it never covers the chart as the block scrolls away.
  const [register, raw] = useActiveStep(steps.length + 1);
  const done = raw >= steps.length;
  const active = Math.min(raw, steps.length - 1);
  const reduce = useReducedMotion();
  return (
    <div className={`scrolly${wide ? ' is-wide' : ''}${done ? ' is-done' : ''}`} id={id}>
      <div className="scrolly-graphic" aria-label={label} role="group">
        <div className="scrolly-graphic-inner" data-step={active}>
          {graphic(active, reduce)}
        </div>
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
