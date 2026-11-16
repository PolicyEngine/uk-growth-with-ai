'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { Recap } from './Items.jsx';

// The question-led sequence (Scrolly `sub.question`), in two forms:
//
// QFrame (the default, no added height): the question big and centred
// inside the scene's own figure frame as the block comes in (word by word,
// a large plain icon, a faint part numeral, a progress ring "Part n,
// question k of m"), held for a short scroll, then shrunk up into the
// topic's header while the chart draws in its place (Scrolly gates
// ctx.entered on onPhase('reveal'); the frame unmounts on 'done').
//
// QStage (`sub.pin: 'full'`: the first topic of each part and the close):
// one pinned screen in the flow above the header, `--q-pin` tall (45svh;
// x --q-pin-phone at 900px and below). The question arrives on the part
// tint, holds centred below the rail, and is pushed up into the header.
// `recap` ({ icon, q, a, to }[], the previous part's questions and
// answers) is shown under the arriving question as the transition; it is
// real links (the Recap nav), and stays as a static strip under reduced
// motion and in print.
//
// Both are driven by scroll position (no timers but the word stagger):
// --qa (arrival) and --qm (move) are written on the element each frame,
// never as React state; onPhase fires once per phase. Guard: a topic
// already past its start on arrival (a nav jump, a copied link, a step
// dot, scrolling up) is done at once, and a done topic never replays, so a
// reader never lands on a blank question frame. The question copies are
// aria-hidden, inert and data-axis (the header, id="q-<block>", prints it
// once). Reduced motion and print: neither plays (CSS), the header and
// the drawn chart stand alone. data-gap-exempt: the gap check skips them.

const railBottom = () => document.querySelector('.story-rail')?.getBoundingClientRect().bottom ?? 0;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');

// "Part n, question k of m": k is this topic's place among the part's
// question headers.
function topicMeta(el, id, part) {
  const sec = el.closest('.story-part[data-part]');
  const all = sec ? [...sec.querySelectorAll('.scene-head.has-q')] : [];
  const k = all.findIndex((h) => h.id === `q-${id}`) + 1;
  return { n: part ?? sec?.dataset.part ?? null, k, of: all.length };
}

// The question's visual: numeral, icon, the words (key word marked), hint,
// progress ring. aria-hidden and data-axis.
function QVisual({ meta, question, hint, icon, keyWord, big = true }) {
  const key = keyWord ? norm(keyWord) : null;
  const words = question.split(/\s+/);
  const ring = meta.of > 0 && meta.k > 0 ? meta.k / meta.of : 0;
  return (
    <span className="q-visual" aria-hidden="true" data-axis="">
      {meta.n ? <span className="q-stage-numeral">{meta.n}</span> : null}
      {icon ? <Icon name={iconFor(icon)} size={big ? 56 : 44} strokeWidth={1.4} className="q-stage-icon" /> : null}
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
            {meta.of > 1 && meta.k > 0 ? `, question ${meta.k} of ${meta.of}` : ''}
          </span>
        </span>
      ) : null}
    </span>
  );
}

// Phase bookkeeping shared by both forms: classes on the element, onPhase
// once per phase, never back (a done topic does not replay).
const ORDER = ['wait', 'in', 'reveal', 'done'];
function usePhase(onPhase) {
  const phase = useRef('wait');
  const cb = useRef(onPhase);
  useEffect(() => {
    cb.current = onPhase;
  });
  return (el, p) => {
    if (ORDER.indexOf(p) <= ORDER.indexOf(phase.current)) return;
    phase.current = p;
    el.classList.add('is-in');
    if (p === 'reveal' || p === 'done') el.classList.add('is-reveal');
    if (p === 'done') el.classList.add('is-done');
    cb.current?.(p);
  };
}

// Run `measure(el)` on scroll and resize (one rAF per frame) until it
// returns 'stop'.
function useScrollDriver(ref, measure, deps) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    let off = false;
    const tick = () => {
      raf = 0;
      if (off) return;
      if (measure(el) === 'stop') stop();
    };
    const on = () => {
      if (!raf && !off) raf = window.requestAnimationFrame(tick);
    };
    const stop = () => {
      off = true;
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    tick();
    return () => {
      stop();
      if (raf) window.cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// The full pinned screen (sub.pin: 'full').
export default function QStage({ id, question, hint, icon, keyWord, part, recap, onPhase }) {
  const ref = useRef(null);
  const card = useRef(null);
  const go = usePhase(onPhase);
  const [meta, setMeta] = useState({ n: part ?? null, k: 0, of: 0 });
  useEffect(() => {
    if (ref.current) setMeta(topicMeta(ref.current, id, part));
  }, [id, part]);
  useScrollDriver(
    ref,
    (el) => {
      const c = card.current;
      // a recap taller than the screen's own height raises it (no overflow)
      if (c && recap?.length) el.style.minHeight = `${c.offsetHeight + 2 * c.offsetTop + 48}px`;
      const Q = el.offsetHeight;
      if (!Q || getComputedStyle(c ?? el).position !== 'absolute') {
        go(el, 'done');
        return 'stop';
      }
      const r = el.getBoundingClientRect();
      const V = window.innerHeight;
      const R = Math.max(0, railBottom());
      const H = c ? c.offsetHeight : 0;
      const pad = c ? c.offsetTop : 0;
      // the centre of the screen below the rail
      const mid = (R + V) / 2;
      // the card's own place, pinned at mid once it gets there, then pushed
      // up by the stage's foot, clear of the header below
      const natural = r.top + pad + H / 2;
      const foot = r.bottom - H / 2 - 28;
      const y = Math.min(Math.max(natural, Math.min(mid, natural + Math.max(0, Q - H - 2 * pad))), foot);
      const qa = clamp01((V - r.top) / (0.55 * V));
      const qm = clamp01((mid + H / 2 + 28 - r.bottom) / Math.max(1, mid + H / 2 + 28 - R));
      el.style.setProperty('--qy', `${Math.round(y - natural)}px`);
      el.style.setProperty('--qa', qa.toFixed(3));
      el.style.setProperty('--qm', qm.toFixed(3));
      if (r.bottom <= R + 1) go(el, 'done');
      else if (qm >= 0.7) go(el, 'done');
      else if (qa >= 0.5) go(el, 'in');
      return undefined;
    },
    [id, part],
  );
  return (
    <div ref={ref} className={`q-stage${recap?.length ? ' has-recap' : ''}`} data-gap-exempt="" data-q={id}>
      <span className="q-stage-tint" aria-hidden="true" />
      <div ref={card} className="q-stage-card">
        <QVisual meta={meta} question={question} hint={hint} icon={icon} keyWord={keyWord} />
        {recap?.length ? <Recap className="q-stage-recap" title={recapTitle(meta.n)} items={recap} /> : null}
      </div>
    </div>
  );
}
const recapTitle = (n) => (n && Number(n) > 1 ? `Part ${Number(n) - 1} in short` : 'In short');

// The default: the question inside the scene's own figure frame (no
// added height). `boxRef`: the figure's sticky box (its `top` is where the
// frame stops on desktop and on sticky phone scenes).
export function QFrame({ id, question, hint, icon, keyWord, part, boxRef, onPhase }) {
  const ref = useRef(null);
  const go = usePhase(onPhase);
  const [meta, setMeta] = useState({ n: part ?? null, k: 0, of: 0 });
  useEffect(() => {
    if (ref.current) setMeta(topicMeta(ref.current, id, part));
  }, [id, part]);
  const first = useRef(true);
  const lastY = useRef(0);
  useScrollDriver(
    ref,
    (el) => {
      if (!el.offsetHeight) {
        go(el, 'done');
        return 'stop';
      }
      const r = el.getBoundingClientRect();
      const V = window.innerHeight;
      const R = Math.max(0, railBottom());
      const box = boxRef?.current;
      const sticky = box && getComputedStyle(box).position === 'sticky';
      const stop = sticky ? Math.max(R, parseFloat(box.style.top || getComputedStyle(box).top) || R) : R;
      // the move: from the frame's top at 55% of the screen to just below
      // where it stops (sticky) or the rail
      const y1 = stop + 24;
      const y0 = Math.max(y1 + 120, V * 0.55);
      // landed past the start (first look, or a jump of more than half a
      // screen since the last frame: a nav link, a copied link, a step
      // dot): the chart, at once
      const jumped = first.current || Math.abs(window.scrollY - lastY.current) > 0.5 * V;
      first.current = false;
      lastY.current = window.scrollY;
      if (jumped && r.top < y0) {
        go(el, 'done');
        return 'stop';
      }
      const qa = clamp01((V - r.top) / (0.25 * V));
      const qm = clamp01((y0 - r.top) / (y0 - y1));
      // where the question goes: up into the header above the frame
      // (the card's layout top, untransformed, to the header's top)
      const head = document.getElementById(`q-${id}`);
      const card = el.querySelector('.q-frame-card');
      if (head && card) el.style.setProperty('--qdy', `${Math.round(head.getBoundingClientRect().top - r.top - card.offsetTop)}px`);
      el.style.setProperty('--qa', qa.toFixed(3));
      el.style.setProperty('--qm', qm.toFixed(3));
      if (qm >= 0.98) {
        go(el, 'done');
        return 'stop';
      }
      if (qm >= 0.45) go(el, 'reveal');
      else if (qa >= 0.6) go(el, 'in');
      return undefined;
    },
    [id, part],
  );
  return (
    <div ref={ref} className="q-frame" data-gap-exempt="" data-q={id} aria-hidden="true" data-axis="" inert>
      <span className="q-frame-tint" />
      <div className="q-frame-card">
        <QVisual meta={meta} question={question} hint={hint} icon={icon} keyWord={keyWord} big={false} />
      </div>
    </div>
  );
}

// The answer (sub.answer): the topic's question replayed with one line of
// the scene's key number(s), right after the last card, where the reader
// is when the evidence is done; it slides up once the last card is reached.
// `answerTo` (an anchor, or { tab, sub, anchor }) makes the answer a link
// to the figure's home; then it restates a figure printed there, so it is
// data-axis (not a second home for the number checks). Never hidden from
// innerText (opacity only), so the number checks see the same text at any
// scroll. The question copy here is aria-hidden (the header carries it).
export function Answer({ question, answer, to, shown }) {
  const t = to == null ? null : typeof to === 'string' ? { tab: 'story', anchor: to } : to;
  const text = <span className="scrolly-answer-text">{answer}</span>;
  return (
    <div className={`scrolly-answer-card${shown ? ' is-shown' : ''}`}>
      {question ? (
        <p className="scrolly-answer-q" aria-hidden="true" data-axis="">
          <Icon name={iconFor('question')} size={14} className="scrolly-answer-q-icon" />
          {question}
        </p>
      ) : null}
      <p className="scrolly-answer-a" data-axis={t ? '' : undefined}>
        <Icon name={iconFor('answer')} size={16} className="scrolly-answer-icon" />
        <span className="scrolly-answer-label">Answer</span>
        {t ? (
          <NavLink tab={t.tab ?? 'story'} sub={t.sub} anchor={t.anchor} className="scrolly-answer-link">
            {text}
          </NavLink>
        ) : (
          text
        )}
      </p>
    </div>
  );
}

// A topic head for a block that is not a Scrolly (part 3's closing, the
// Two lenses close): the header with the question (id="q-<id>", the rail
// reads data-scene), with `pin: 'full'` the pinned question screen above it
// (and its `recap`), and, when given, the answer (shown at once: there are
// no steps to reach). Without a pin there is no figure frame to play in:
// the header alone.
//
//   <TopicHead id="story-close" sub={{ title, icon, question, hint, key, pin: 'full', recap, answer, answerTo }} titleId="…" />
export function TopicHead({ id, sub, part, titleId, className = '' }) {
  const { title, icon, question, hint, key, answer, answerTo, pin, recap } = sub;
  return (
    <>
      {question && pin === 'full' ? <QStage id={id} question={question} hint={hint} icon={icon} keyWord={key} part={part} recap={recap} /> : null}
      <header className={`scene-head topic-head${question ? ' has-q' : ''} ${className}`.trim()} data-scene={title} id={question ? `q-${id}` : undefined}>
        <span className="scene-head-row">
          {icon ? <Icon name={iconFor(icon)} size={16} className="scene-head-icon" /> : null}
          <h3 className="scene-head-title" id={titleId}>
            {title}
          </h3>
          {question ? (
            <p className="scene-head-q">
              <Icon name={iconFor('question')} size={14} className="scene-head-q-icon" />
              <span>{question}</span>
            </p>
          ) : null}
          <span className="scene-head-rule" aria-hidden="true" />
        </span>
      </header>
      {answer != null ? (
        <div className="topic-head-answer">
          <Answer question={null} answer={answer} to={answerTo} shown />
        </div>
      ) : null}
    </>
  );
}
