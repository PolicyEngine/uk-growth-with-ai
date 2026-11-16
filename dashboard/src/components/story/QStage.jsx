'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// The question-led sequence (Scrolly `sub.question`): one pinned screen per
// topic, in the flow just above the topic's header, `--q-pin` tall (one CSS
// variable on .story, story.css; shorter at 900px and below).
//   1. Arrive: as the screen scrolls in, the part tint comes up and the
//      question rises with it, word by word, under a large plain icon, a
//      faint part numeral behind it and a progress ring (topic k of n in
//      the part) round the part number; the key word (`sub.key`) is marked.
//   2. Hold: the question stays centred in the screen below the rail for
//      the rest of the pinned height, with the optional one-line `hint`.
//   3. Move into the answer: the screen's foot pushes it up into the
//      topic's header (just below), shrinking and fading; the header lights
//      as it lands, and the scene's entry moves start (Scrolly gates
//      ctx.entered on onPhase('done')).
// Everything is driven by scroll position (no timers but the word stagger):
// --qa (arrival 0..1) and --qm (move 0..1) are written on the element each
// frame, never as React state; onPhase('in' | 'done') fires once each. A
// screen already above the rail on arrival (deep link, scrolling up) is
// done at once. aria-hidden, inert and data-axis: the question is printed
// once, in the header (id="q-<block>"), for readers and the checks. Reduced
// motion and print hide it (CSS): the header and its answer chip stand alone.
// data-gap-exempt: the gap check skips this screen (its blank band is the
// pinned screen).
export default function QStage({ id, question, hint, icon, keyWord, part, onPhase }) {
  const ref = useRef(null);
  const card = useRef(null);
  const phase = useRef('wait');
  const cb = useRef(onPhase);
  useEffect(() => {
    cb.current = onPhase;
  });
  const [meta, setMeta] = useState({ n: part ?? null, k: 0, of: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const sec = el.closest('.story-part[data-part]');
    const all = sec ? [...sec.querySelectorAll('.q-stage')] : [el];
    setMeta({ n: part ?? sec?.dataset.part ?? null, k: all.indexOf(el) + 1, of: all.length });
    const go = (p) => {
      if (phase.current === p || phase.current === 'done') return;
      phase.current = p;
      el.classList.add(p === 'done' ? 'is-done' : 'is-in');
      if (p === 'done') el.classList.add('is-in');
      cb.current?.(p);
    };
    const railBottom = () => document.querySelector('.story-rail')?.getBoundingClientRect().bottom ?? 0;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const Q = el.offsetHeight;
      if (!Q) {
        go('done');
        return;
      }
      const r = el.getBoundingClientRect();
      const V = window.innerHeight;
      const R = Math.max(0, railBottom());
      const c = card.current;
      const H = c ? c.offsetHeight : 0;
      const pad = c ? c.offsetTop : 0;
      // the centre of the screen below the rail
      const mid = (R + V) / 2;
      // the card's own place (top of the stage + its padding): pinned at
      // mid once it gets there, pushed up again by the stage's foot
      const natural = r.top + pad + H / 2;
      // pushed up by the stage's foot, clear of the header below
      const foot = r.bottom - H / 2 - 28;
      const y = Math.min(Math.max(natural, mid), foot);
      const qa = Math.min(1, Math.max(0, (V - r.top) / (0.55 * V)));
      const qm = Math.min(1, Math.max(0, (mid + H / 2 + 28 - r.bottom) / Math.max(1, mid + H / 2 + 28 - R)));
      el.style.setProperty('--qy', `${Math.round(y - natural)}px`);
      el.style.setProperty('--qa', qa.toFixed(3));
      el.style.setProperty('--qm', qm.toFixed(3));
      if (r.bottom <= R + 1 && phase.current === 'wait') go('done');
      else if (qm >= 0.7) go('done');
      else if (qa >= 0.5) go('in');
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
  }, [part]);
  const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');
  const key = keyWord ? norm(keyWord) : null;
  const words = question.split(/\s+/);
  const ring = meta.of > 0 ? meta.k / meta.of : 0;
  return (
    <div ref={ref} className="q-stage" data-gap-exempt="" data-q={id} aria-hidden="true" data-axis="" inert>
      <span className="q-stage-tint" />
      <div ref={card} className="q-stage-card">
        {meta.n ? <span className="q-stage-numeral">{meta.n}</span> : null}
        {icon ? <Icon name={iconFor(icon)} size={56} strokeWidth={1.4} className="q-stage-icon" /> : null}
        <span className="q-stage-q">
          {words.map((w, i) => (
            <span key={i} className={`q-stage-w${key && norm(w) === key ? ' is-key' : ''}`} style={{ '--w': i }}>
              {w}{' '}
            </span>
          ))}
        </span>
        {hint ? (
          <span className="q-stage-hint" style={{ '--w': words.length }}>
            {hint}
          </span>
        ) : null}
        {meta.n ? (
          <span className="q-stage-progress">
            <svg className="q-stage-ring" width="30" height="30" viewBox="0 0 30 30" focusable="false">
              <circle cx="15" cy="15" r="12" className="q-stage-ring-track" />
              <circle cx="15" cy="15" r="12" pathLength="1" className="q-stage-ring-fill" style={{ strokeDasharray: `${ring} 1` }} />
              <text x="15" y="15" dy="0.35em" textAnchor="middle">
                {meta.n}
              </text>
            </svg>
            <span>
              Part {meta.n}
              {meta.of > 1 ? `, question ${meta.k} of ${meta.of}` : ''}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
