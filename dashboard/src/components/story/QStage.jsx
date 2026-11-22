'use client';

import { useEffect, useRef } from 'react';
import IconLine from '@/components/ui/IconLine.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { setStyle, subscribe } from '@/lib/scrollLoop.js';

// The question-led sequence (Scrolly `sub.question`), in two forms:
//
// QFrame (the default, no added height): the question big and centred
// inside the scene's own figure frame (a plain icon, the words, one hint
// line), held for a short scroll, then faded in place (full size, no
// shrink: Vahid, 21 Nov) while the chart draws in its place.
//
// QStage (`sub.pin: 'full'`): one pinned screen in the flow above the
// header, `--q-pin` tall. The question is fixed at full size in its box
// (Vahid, 21 Nov: "dont zoom in or out, be fix in that box"): it scrolls
// in with the stage, holds at the optical centre below the rail (held by
// the browser, position: sticky; no per-frame write), and scrolls away
// with the stage's foot.
//
// Both follow the scroll position in both directions (round 1, Vahid: "big
// questions why when scroll back and then go again are not showing?"):
// every frame the phase is computed from where the frame is (framePhase /
// stagePhase below, pure), so scrolling back up brings the question back
// and scrolling down again replays arrive, hold, leave. --qa (arrival)
// and --qm (move) are written on the element, never as React state;
// onPhase fires on each change of phase.
//
// Landing guard: a reader who lands past a question's start (first look, a
// jump of more than half a screen in one frame, or a nav link: lib/scroll's
// revealAnchor fires a 'reveal' event) sees the drawn chart at once. The
// guard lifts when the reader scrolls up by hand or the frame is back
// before its start, so the sequence replays from there.
//
// The guard is paint only (is-landed). The header's layout (story-bands.css
// section 5: its height, its question's box, the stage's foot margin)
// follows a second state, data-head-shown (nextHead), which follows the
// guard only while the stage's foot is below the viewport, so nothing in
// view or above it ever moves (Fable 5.2, fix list 10: a fast-scroll
// landing, or the guard lifting on the way up, moved the page by up to
// 42px; Vahid, 22 Nov: a jump, a rail link or a reload with a hash must
// land where it was aimed, so no header above or in view grows on a jump
// either). A landed stage hides its band and card only while its header
// is shown (story-bands.css, story.css): one copy of the question either
// way.
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

// QStage's phase from the stage's box. The browser holds the card still
// (position: sticky at --q-top) from the moment the holder reaches --q-top
// (its layout top, the stage's top plus its margin `mt`) until the
// stage's foot would push it (28px clear): `run` px of scroll. qa (0 to 1
// over the run's first Q_GROW) and qm (0 to 1 over its last Q_SHRINK,
// eased) set the phase only: the card is full size throughout (story.css
// .q-stage-card, 21 Nov; it scaled by qa * (1 - qm) before). The chart
// starts to draw at 70% of the last stretch.
export const Q_GROW = 0.3;
export const Q_SHRINK = 0.35;
// The held card's centre: the optical centre of the screen below the rail,
// 6% of that height below the true centre (18 Nov, Vahid: "lower position
// of this ... text"; it was 3%).
export const Q_OPTICAL = 0.06;
export const qMid = (R, V) => R + (V - R) * (0.5 + Q_OPTICAL);
const ease = (x) => x * x * (3 - 2 * x);
export function stagePhase({ top, bottom, V, R, H, mt = 0 }) {
  const qt = qMid(R, V) - H / 2;
  // px of scroll since the card stuck, and the length of the stuck run
  const s = qt - (top + mt);
  const run = Math.max(1, bottom - 28 - H - (top + mt));
  const qa = ease(clamp01(s / (Q_GROW * run)));
  const raw = clamp01((s - (1 - Q_SHRINK) * run) / (Q_SHRINK * run));
  const qm = ease(raw);
  const phase = bottom <= R + 1 || raw >= 0.98 ? 'done' : raw >= 0.7 ? 'reveal' : qa >= 0.5 ? 'in' : 'wait';
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

// the header's layout state: raised and lowered only when nothing in view
// or above it moves
export function nextHead({ head, skip, below }) {
  // the stage's foot (and so its header) under the viewport: a change
  // there moves nothing in view and nothing a jump aimed at, so follow the
  // guard; otherwise (in view or above, on a jump too) unchanged
  return below ? skip : head;
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
  const head = useRef(false);
  useScrollDriver(
    ref,
    (el, f) => {
      const c = card.current;
      const hold = c?.parentElement;
      // not shown (reduced motion, print): no hold, the chart drawn
      if (!el.offsetHeight || !hold || getComputedStyle(hold).position !== 'sticky') return null;
      const r = el.getBoundingClientRect();
      const V = f.V;
      const R = Math.max(0, f.rail());
      const H = c.offsetHeight;
      // where the browser holds the card (story.css .q-stage-hold): its
      // centre at the optical centre below the rail. Constant through the
      // hold, so setStyle writes nothing then.
      const qt = Math.round(qMid(R, V) - H / 2);
      const mt = parseFloat(getComputedStyle(hold).marginTop) || 0;
      return { p: stagePhase({ top: r.top, bottom: r.bottom, V, R, H, mt }), qt, below: r.bottom >= V };
    },
    (el, d, f) => {
      if (!d) {
        go(el, 'done');
        return;
      }
      const { p } = d;
      skip.current = nextSkip({ skip: skip.current, jumped: f.jumped, past: p.qm > 0, before: p.qm === 0, up: f.up });
      // landed past the start (a reload, a jump): with its header shown the
      // stage drops its navy and card (story-bands.css, story.css), so no
      // empty navy slab shows under the rail (navy-sections-fable.md 7a, its
      // fallback); it goes with the guard
      el.classList.toggle('is-landed', skip.current);
      // the header's layout follows the guard only while the stage's foot is
      // below the viewport: nothing in view or above it moves
      head.current = nextHead({ head: head.current, skip: skip.current, below: d.below });
      el.toggleAttribute('data-head-shown', head.current);
      setStyle(el, '--q-top', `${d.qt}px`);
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
      {/* a declared opener hold (item 35; scripts/check_hold.mjs) */}
      <div className="q-stage-hold" data-hold="opener">
        <div ref={card} className="q-stage-card">
          <QVisual question={question} hint={hint} icon={icon} keyWord={keyWord} />
        </div>
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
  const head = useRef(false);
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
      return { p: framePhase({ top: r.top, V, y0, y1 }), past: r.top < y0, below: r.bottom >= V };
    },
    (el, d, f) => {
      if (!d) {
        go(el, 'done');
        return;
      }
      const { p } = d;
      skip.current = nextSkip({ skip: skip.current, jumped: f.jumped, past: d.past, before: !d.past, up: f.up });
      head.current = nextHead({ head: head.current, skip: skip.current, below: d.below });
      el.toggleAttribute('data-head-shown', head.current);
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
// (typography spec, 17 Nov, option b), directly under the plot. It leads
// with the answer icon (Vahid, 21 Nov: "all text should have icon"), in
// the shared IconLine (body tier: the step cards' 18px column); the text in the three greys. Never
// hidden from innerText (opacity only), so the number checks see the same
// text at any scroll. `to` (the figure's home) is not a link; it marks the
// line data-axis: it restates a figure printed there.
// eslint-disable-next-line no-unused-vars
export function Answer({ question, answer, to, shown = true }) {
  return (
    <IconLine concept="answer" tier="body" className={`scrolly-takeaway${shown ? ' is-shown' : ''}`} data-closing="" data-axis={to != null ? '' : undefined}>
      {answer}
    </IconLine>
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
      {/* a scene header: it sticks only in a stepped .p2-output (story-bands.css), a declared scene hold (item 35) */}
      <header className={`scene-head topic-head${question ? ' has-q' : ''} ${className}`.trim()} data-scene={title} id={question ? `q-${id}` : undefined} data-hold="scene">
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
