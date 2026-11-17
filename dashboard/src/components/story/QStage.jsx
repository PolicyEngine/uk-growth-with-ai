'use client';

import { useEffect, useRef } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { setStyle, subscribe } from '@/lib/scrollLoop.js';

// The question-led sequence (Scrolly `sub.question`), in two forms:
//
// QFrame (the default, no added height): the question big and centred
// inside the scene's own figure frame (a plain icon, the words, one hint
// line), held for a short scroll, then shrunk up into the topic's header
// while the chart draws in its place.
//
// QStage (`sub.pin: 'full'`): one pinned screen in the flow above the
// header, `--q-pin` tall. The question arrives, holds centred below the
// rail, and is pushed up into the header.
//
// Both follow the scroll position in both directions (round 1, Vahid: "big
// questions why when scroll back and then go again are not showing?"):
// every frame the phase is computed from where the frame is (framePhase /
// stagePhase below, pure), so scrolling back up re-expands the question
// and scrolling down again replays arrive, hold, shrink. --qa (arrival)
// and --qm (move) are written on the element, never as React state;
// onPhase fires on each change of phase.
//
// Landing guard: a reader who lands past a question's start (first look, a
// jump of more than half a screen in one frame, or a nav link: lib/scroll's
// revealAnchor fires a 'reveal' event) sees the drawn chart at once. The
// guard lifts when the reader scrolls up by hand or the frame is back
// before its start, so the sequence replays from there.
//
// The question copies are aria-hidden, inert and data-axis (the header,
// id="q-<block>", prints it once). Reduced motion and print: neither
// plays (CSS); the header carries the question, static, and the chart is
// drawn. data-gap-exempt: the gap check skips them.

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');

// QFrame's phase from the frame's top: arrival over the quarter screen
// below the fold, the move from y0 (the start) to y1 (under the header).
export function framePhase({ top, V, y0, y1 }) {
  const qa = clamp01((V - top) / (0.25 * V));
  const qm = clamp01((y0 - top) / Math.max(1, y0 - y1));
  // 'reveal' (the chart starts to draw) only once the question's backdrop
  // starts to fade (story.css .q-frame-tint, qm 0.78): never drawn unseen
  const phase = qm >= 0.98 ? 'done' : qm >= 0.78 ? 'reveal' : qa >= 0.6 ? 'in' : 'wait';
  return { qa, qm, phase };
}

// QStage's phase from the stage's box: arrival as its top comes up the
// screen, then the hold (the card centred and still, for the stage's
// height less the card's: about 40vh), then the move, which starts as the
// stage's foot reaches the held card and runs over 28% of the screen of
// scroll, eased (polish round, Vahid: "going so fast"). qm is the eased
// move, 0 to 1; the chart starts to draw at 70% of it.
export const Q_MOVE = 0.28;
export function stagePhase({ top, bottom, V, R, H }) {
  const mid = (R + V) / 2;
  const qa = clamp01((V - top) / (0.55 * V));
  const raw = clamp01((mid + H / 2 + 28 - bottom) / Math.max(1, Q_MOVE * V));
  const qm = raw * raw * (3 - 2 * raw);
  const phase = bottom <= R + 1 || raw >= 0.7 ? 'done' : qa >= 0.5 ? 'in' : 'wait';
  return { qa, qm, phase };
}

// The landing guard, as a pure step: `skip` (the guard is up) given this
// frame. A jump that lands past the start raises it; scrolling up by hand,
// or the frame back before its start (`before`), lowers it.
export function nextSkip({ skip, jumped, past, before, up }) {
  if (jumped) return past;
  if (skip && (up || before)) return false;
  return skip;
}

// The question's visual: a plain icon, the words (key word marked), hint.
// aria-hidden and data-axis.
function QVisual({ question, hint, icon, keyWord, big = true }) {
  const key = keyWord ? norm(keyWord) : null;
  const words = question.split(/\s+/);
  return (
    <span className="q-visual" aria-hidden="true" data-axis="">
      {icon ? <Icon name={iconFor(icon)} size={big ? 44 : 36} strokeWidth={1.4} className="q-stage-icon" /> : null}
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
    </span>
  );
}

// The phase as classes on the element (both directions) and onPhase on
// each change.
function usePhase(onPhase) {
  const phase = useRef(null);
  const cb = useRef(onPhase);
  useEffect(() => {
    cb.current = onPhase;
  });
  return (el, p) => {
    if (p === phase.current) return;
    phase.current = p;
    el.classList.toggle('is-in', p !== 'wait');
    el.classList.toggle('is-reveal', p === 'reveal' || p === 'done');
    el.classList.toggle('is-done', p === 'done');
    el.dataset.phase = p;
    cb.current?.(p);
  };
}

// Run `read(el, f)` then `write(el, data, f)` in the page's one scroll loop
// (lib/scrollLoop.js: all reads, then all writes, one rAF per frame), while
// the element is within a screen of the viewport. f: { V, jumped, up, rail }.
function useScrollDriver(ref, read, write, deps) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    return subscribe({ el, read: (f) => read(el, f), write: (d, f) => write(el, d, f) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// --q-end: the settled header's font size over the opener's, so the
// question shrinks to exactly the header's size (typography spec: 0.386 at
// 1280, 0.607 at 390). Read once per width (in the loop's read phase).
function qEnd(memo, id, el) {
  const w = window.innerWidth;
  if (memo.current && memo.current.w === w) return memo.current.v;
  const head = document.getElementById(`q-${id}`)?.querySelector('.scene-head-q, h2, h3');
  const big = el.querySelector('.q-stage-q');
  const a = head ? parseFloat(getComputedStyle(head).fontSize) : 0;
  const b = big ? parseFloat(getComputedStyle(big).fontSize) : 0;
  const v = a > 0 && b > 0 ? Math.min(1, a / b) : null;
  memo.current = { w, v };
  return v;
}

const setVars = (el, qa, qm) => {
  setStyle(el, '--qa', qa.toFixed(3));
  setStyle(el, '--qm', qm.toFixed(3));
};

// The full pinned screen (sub.pin: 'full'). `recap` and `part` are
// accepted from older callers and not drawn (round 1: question and hint
// only).
// eslint-disable-next-line no-unused-vars
export default function QStage({ id, question, hint, icon, keyWord, part, recap, onPhase }) {
  const ref = useRef(null);
  const card = useRef(null);
  const go = usePhase(onPhase);
  const skip = useRef(false);
  const end = useRef(null);
  useScrollDriver(
    ref,
    (el, f) => {
      const c = card.current;
      if (!el.offsetHeight || getComputedStyle(c ?? el).position !== 'absolute') return null;
      const r = el.getBoundingClientRect();
      const V = f.V;
      const R = Math.max(0, f.rail());
      const H = c ? c.offsetHeight : 0;
      const pad = c ? c.offsetTop : 0;
      const mid = (R + V) / 2;
      const Q = el.offsetHeight;
      // the card's own place, pinned at mid once it gets there, then pushed
      // up by the stage's foot, clear of the header below
      const natural = r.top + pad + H / 2;
      const foot = r.bottom - H / 2 - 28;
      const y = Math.min(Math.max(natural, Math.min(mid, natural + Math.max(0, Q - H - 2 * pad))), foot);
      return { p: stagePhase({ top: r.top, bottom: r.bottom, V, R, H }), dy: Math.round(y - natural), qe: qEnd(end, id, el) };
    },
    (el, d, f) => {
      if (!d) {
        go(el, 'done');
        return;
      }
      const { p } = d;
      skip.current = nextSkip({ skip: skip.current, jumped: f.jumped, past: p.qm > 0, before: p.qm === 0, up: f.up });
      setStyle(el, '--qy', `${d.dy}px`);
      if (d.qe != null) setStyle(el, '--q-end', d.qe.toFixed(3));
      if (skip.current) {
        setVars(el, 1, 1);
        go(el, 'done');
      } else {
        setVars(el, p.qa, p.qm);
        go(el, p.phase);
      }
    },
    [id],
  );
  return (
    <div ref={ref} className="q-stage" data-gap-exempt="" data-q={id}>
      <div ref={card} className="q-stage-card">
        <QVisual question={question} hint={hint} icon={icon} keyWord={keyWord} />
      </div>
    </div>
  );
}

// The default: the question inside the scene's own figure frame (no
// added height). `boxRef`: the figure's sticky box (its `top` is where the
// frame stops on desktop and on sticky phone scenes).
// eslint-disable-next-line no-unused-vars
export function QFrame({ id, question, hint, icon, keyWord, part, boxRef, onPhase }) {
  const ref = useRef(null);
  const go = usePhase(onPhase);
  const skip = useRef(false);
  const end = useRef(null);
  useScrollDriver(
    ref,
    (el, f) => {
      if (!el.offsetHeight) return null;
      const r = el.getBoundingClientRect();
      const V = f.V;
      const R = Math.max(0, f.rail());
      const box = boxRef?.current;
      const sticky = box && getComputedStyle(box).position === 'sticky';
      const stop = sticky ? Math.max(R, parseFloat(box.style.top || getComputedStyle(box).top) || R) : R;
      // the move: from the frame's top at 55% of the screen to just below
      // where it stops (sticky) or the rail
      const y1 = stop + 24;
      const y0 = Math.max(y1 + 120, V * 0.55);
      // where the question goes: up into the header above the frame
      // (the card's layout top, untransformed, to the header's top)
      const head = document.getElementById(`q-${id}`);
      const card = el.querySelector('.q-frame-card');
      const qdy = head && card && r.bottom > -V && r.top < 2 * V ? Math.round(head.getBoundingClientRect().top - r.top - card.offsetTop) : null;
      return { p: framePhase({ top: r.top, V, y0, y1 }), past: r.top < y0, qdy, qe: qEnd(end, id, el) };
    },
    (el, d, f) => {
      if (!d) {
        go(el, 'done');
        return;
      }
      const { p } = d;
      skip.current = nextSkip({ skip: skip.current, jumped: f.jumped, past: d.past, before: !d.past, up: f.up });
      if (d.qdy != null) setStyle(el, '--qdy', `${d.qdy}px`);
      if (d.qe != null) setStyle(el, '--q-end', d.qe.toFixed(3));
      if (skip.current) {
        setVars(el, 1, 1);
        go(el, 'done');
      } else {
        setVars(el, p.qa, p.qm);
        go(el, p.phase);
      }
    },
    [id],
  );
  return (
    <div ref={ref} className="q-frame" data-gap-exempt="" data-q={id} aria-hidden="true" data-axis="" inert>
      <span className="q-frame-tint" />
      <div className="q-frame-card">
        <QVisual question={question} hint={hint} icon={icon} keyWord={keyWord} />
      </div>
    </div>
  );
}

// A scene's one closing line: a takeaway caption inside its figure frame
// (typography spec, 17 Nov, option b), directly under the plot. No icon; a
// 3px left rule in the part accent; the text in the three greys. Never
// hidden from innerText (opacity only), so the number checks see the same
// text at any scroll. `to` (the figure's home) is not a link; it marks the
// line data-axis: it restates a figure printed there.
// eslint-disable-next-line no-unused-vars
export function Answer({ question, answer, to, shown = true }) {
  return (
    <p className={`scrolly-takeaway${shown ? ' is-shown' : ''}`} data-axis={to != null ? '' : undefined}>
      {answer}
    </p>
  );
}

// A topic head for a block that is not a Scrolly (part 3's closing, the
// Two lenses close): the header with the question (id="q-<id>", the rail
// reads data-scene), with `pin: 'full'` the pinned question screen above
// it, and the closing line (sub.answer, else sub.takeaway) under it.
//
//   <TopicHead id="story-close" sub={{ title, icon, question, hint, key, pin: 'full', answer, answerTo }} titleId="…" />
export function TopicHead({ id, sub, part, titleId, className = '' }) {
  const { title, icon, question, hint, key, answer, answerTo, takeaway, pin } = sub;
  const closing = answer ?? takeaway;
  return (
    <>
      {question && pin === 'full' ? <QStage id={id} question={question} hint={hint} icon={icon} keyWord={key} part={part} /> : null}
      <header className={`scene-head topic-head${question ? ' has-q' : ''} ${className}`.trim()} data-scene={title} id={question ? `q-${id}` : undefined}>
        <h3 className="scene-head-q" id={titleId}>
          {question ?? title}
        </h3>
      </header>
      {closing != null ? (
        <div className="topic-head-answer">
          <Answer answer={closing} to={answer != null ? answerTo : undefined} />
        </div>
      ) : null}
    </>
  );
}
