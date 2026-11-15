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
  const [register, active] = useActiveStep(steps.length);
  const reduce = useReducedMotion();
  return (
    <div className={`scrolly${wide ? ' is-wide' : ''}`} id={id}>
      <div className="scrolly-graphic" aria-label={label} role="group">
        <div className="scrolly-graphic-inner" data-step={active}>
          {graphic(active, reduce)}
        </div>
      </div>
      <ol className="scrolly-steps">
        {steps.map((s, i) => (
          <li key={s.id} id={s.id} ref={register(i)} className={`scrolly-step${i === active ? ' is-active' : ''}`} aria-current={i === active ? 'step' : undefined}>
            <div className="scrolly-card">
              {s.kicker ? <p className="scrolly-kicker">{s.kicker}</p> : null}
              {s.title ? <h3 className="scrolly-title">{s.title}</h3> : null}
              <div className="scrolly-body">{s.body}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
