'use client';

import { useEffect, useRef } from 'react';
import { setStyle, subscribe } from '@/lib/scrollLoop.js';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// A story beat (story-beats-fable.md): the big statement between two scenes
// that says what just happened. Not a question and not a heading: a left-
// aligned aside with a marker rule drawn like a chart annotation, a numeral
// (a year, or the rate that starts part 3), a headline of at most 8 words
// and a meaning line of at most 25. Real text, printed once.
//
// Motion: a short sticky track (--beat-h); the phase is read from where the
// track is, every frame, in the page's one scroll loop (no React state, two
// custom properties): --ba (arrive: the rule draws from the side of its
// chart, the numeral firms up from 0.3) and --bh (hand over: the numeral
// fades to 0.6 as the next scene takes over). Pure in the scroll position,
// so scrolling back re-forms it, and a reader who lands past it by a link
// or a jump sees it settled. The headline and line are there from the first
// frame. Reduced motion and print: a static block, the rule drawn.
//
//   <StoryBeat id="2028" num="2028" head="More AI, sooner, as a surprise" line="…" from="below" />
//   numProps: extra attributes for the numeral (B4: data-path, data-input)
//   cite: an optional line of sources under the meaning line (B4: where
//   the rate comes from), exempt from the 25-word cap (data-cite)

const clamp01 = (x) => Math.min(1, Math.max(0, x));

// The beat's phase from its track's box, pure.
export function beatPhase({ top, bottom, V }) {
  const ba = clamp01((V - top) / (0.45 * V));
  const bh = clamp01((0.55 * V - bottom) / (0.3 * V));
  return { ba, bh };
}

// `icon`: a beat with no numeral (part 3's OBR-sized run, push D Q3) leads
// its headline with this concept's icon instead, at the full beat size, so
// no empty numeral slot is left.
export default function StoryBeat({ id, num, head, line, cite = null, from = 'below', numProps = {}, icon = null }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return undefined;
    return subscribe({
      el,
      read: (f) => {
        const r = el.getBoundingClientRect();
        return r.height ? beatPhase({ top: r.top, bottom: r.bottom, V: f.V }) : null;
      },
      write: (p) => {
        if (!p) return;
        setStyle(el, '--ba', p.ba.toFixed(3));
        setStyle(el, '--bh', p.bh.toFixed(3));
      },
    });
  }, []);
  return (
    <aside ref={ref} className={`story-beat is-from-${from}${num == null && icon ? ' has-icon' : ''}`} id={`beat-${id}`} aria-label={num != null ? `${num}: ${head}` : head} data-gap-exempt="">
      <div className="story-beat-card">
        <span className="beat-rule" aria-hidden="true" />
        {num != null ? (
          <p className="beat-num" {...numProps}>
            {num}
          </p>
        ) : null}
        <div className="beat-text">
          <p className="beat-head">
            {num == null && icon ? <Icon name={iconFor(icon)} size={20} className="p2-tx-icon" /> : null}
            {head}
          </p>
          <p className="beat-line">{line}</p>
          {cite ? (
            <p className="beat-cite" data-cite="">
              {cite}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
