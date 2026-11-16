'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { FinalState, useActiveStep, useInView, useIsPhone, useReducedMotion } from './motion.js';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { scrollBelowBars } from '@/lib/scroll.js';
import { NavLink } from '@/lib/nav.jsx';
import { HighlightCtx, normIds, useApplyHighlight, useHighlightDescription, useHighlightState } from './highlight.jsx';
import QStage from './QStage.jsx';

// a sticky figure may take 45% of the screen at 900px and below
const capFor = () => 0.45;
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
//                { title, icon, question, takeaway } (icon a concept).
//                Rendered as <header class="scene-head" data-scene="title">
//                (the rail reads [data-scene]); step titles then become h4.
//                `question` (about a dozen words, neutral, answered by the
//                block): printed in the header on the title's row, and played
//                once as a topic opener: a panel over the figure card (never
//                over the cards, no added height) with a large plain icon,
//                "Part n" (from the closest .story-part[data-part], or the
//                `part` prop) and the question, scaling and fading in word by
//                word on the part's tint, then shrinking into the header. It
//                is skipped when the block is already above the rail (a deep
//                link, a step dot, scrolling up), under reduced motion, in
//                print and in "is-inline" blocks. ctx.entered (and so
//                useEnterState entry moves) waits until it has shrunk.
//                `takeaway`: one "Key takeaway" line after the block (the
//                full width, under both columns: one line on desktop);
//   part         the part number for the opener (default: read from the page);
//   step.kickerIcon  a concept leading the kicker (default: step.icon).
export default function Scrolly({ id, steps, graphic, label, wide = false, phone: phoneMode, scene = false, foot, sub, part }) {
  // One more registered element than steps: an end marker after the last
  // card, past which the block is done.
  const box = useRef(null);
  // At 900px and below a sticky scene's trigger line is measured from its
  // figure: the stuck figure's bottom plus 40% of the space below it.
  const phoneLine = () => {
    const b = box.current;
    const h = window.innerHeight;
    if (!b || getComputedStyle(b).position !== 'sticky') return h * 0.88;
    const bottom = (parseFloat(getComputedStyle(b).top) || 0) + b.offsetHeight;
    return bottom + 0.4 * Math.max(0, h - bottom);
  };
  const [register, raw] = useActiveStep(steps.length + 1, 0.55, phoneLine);
  const done = raw >= steps.length;
  // desktop, several cards: the state follows progress through the scroll
  // over which the figure is in view (see the effect below)
  const [prog, setProg] = useState(null);
  const active = prog ?? Math.min(raw, steps.length - 1);
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
  const sticky = reserve && !tooTall;
  const sizers = useRef(null);
  const live = useRef(null);
  const [seenRef, entered] = useInView({ rootMargin: '0px 0px -15% 0px' });
  const liveRef = (el) => {
    live.current = el;
    seenRef.current = el;
  };
  const lastCard = steps.reduce((k, x, i) => (x.spacer ? k : i), 0);
  // drawn once (phones): the last card's state, or the one a reader picks
  // with a step dot or a card's "Show on chart"
  const [picked, setPicked] = useState(null);
  const shown = once ? (picked ?? lastCard) : active;
  // the state shown before this one, for one-shot moves
  const [hist, setHist] = useState({ cur: shown, prev: null });
  if (hist.cur !== shown) setHist({ cur: shown, prev: hist.cur });
  const showOnChart = (i) => {
    setPicked(i);
    const b = box.current;
    if (b && b.getBoundingClientRect().top < 0) scrollBelowBars(b, { smooth: !reduce });
  };
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
  const cardSteps = steps.map((x, i) => (x.spacer ? -1 : i)).filter((i) => i >= 0);
  const stepsCol = useRef(null);
  // Desktop, several cards: the scroll over which the figure is at least 90%
  // in view (from entering at the bottom to leaving under the rail, sticky
  // or not) is split evenly between the cards, so every state is held for
  // the same distance with the figure in view; the active card is marked.
  const geom = () => {
    const col = stepsCol.current;
    const g = live.current;
    const b = box.current;
    if (!col || !g || !b) return null;
    const F = g.offsetHeight;
    const C = col.offsetHeight;
    const top0 = document.querySelector('.story-rail')?.getBoundingClientRect().bottom ?? parseFloat(getComputedStyle(b).top) ?? 0;
    const enter = window.innerHeight - 0.9 * F;
    const exit = top0 - 0.1 * F - Math.max(0, C - F);
    return { colTop: col.getBoundingClientRect().top, enter, exit: Math.min(exit, enter - 1) };
  };
  useEffect(() => {
    if (single || typeof window === 'undefined') return undefined;
    let raf = 0;
    const n = cardSteps.length;
    const measure = () => {
      raf = 0;
      const m = window.innerWidth > 900 ? geom() : null;
      if (!m) {
        setProg(null);
        return;
      }
      const p = (m.enter - m.colTop) / (m.enter - m.exit);
      const k = Math.max(0, Math.min(n - 1, Math.floor(p * n)));
      setProg(cardSteps[k]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single, cardSteps.join(',')]);
  // a step dot: phones drawn once set the state; desktop scrolls to the
  // middle of the step's share; a sticky phone scene scrolls the card to its
  // trigger line
  const goStep = (k) => {
    if (once) {
      setPicked(cardSteps[k]);
      return;
    }
    const m = window.innerWidth > 900 ? geom() : null;
    if (m) {
      const target = m.enter - ((k + 0.5) / cardSteps.length) * (m.enter - m.exit);
      window.scrollTo({ top: Math.max(0, window.scrollY + m.colTop - target), behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    const el = document.getElementById(steps[cardSteps[k]].id);
    if (el) goToStep(el, box.current, reduce);
  };
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
  // one step, one highlight (highlight.jsx): the shown step's marks
  const hl = useHighlightState(steps[shown]?.highlight);
  useApplyHighlight(live, hl, [shown, entered]);
  const hlDesc = useHighlightDescription(hl);
  // the question-led sequence (QStage.jsx): arrive, hold, move into the
  // scene; the scene's entry moves wait until the question has moved in
  const subObj = sub && typeof sub === 'object' ? sub : null;
  const question = subObj?.question;
  const takeaway = subObj?.takeaway;
  const answer = subObj?.answer;
  const [stage, setStage] = useState(question ? 'pending' : 'done');
  const stageDone = !question || inline || reduce || stage === 'done';
  // the answer: once the scene's last card is reached (always when drawn
  // once, under reduced motion and in print, by CSS)
  const answered = once || inline || reduce || active >= lastCard;
  const ctx = { inline: false, once, entered: entered && stageDone, prev: hist.prev, highlight: hl.point ? [hl.point] : hl.ids };
  const sizerCtx = { inline: false, once: false, entered: true, prev: null, highlight: [] };
  const dots = many && !inline;
  const subTitle = typeof sub === 'string' ? sub : sub?.title;
  const TitleTag = sub ? 'h4' : 'h3';
  const footHere = foot != null ? <div className="scrolly-foot">{foot}</div> : null;
  return (
    <HighlightCtx.Provider value={hl}>
    <div
      className={`scrolly${wide ? ' is-wide' : ''}${done ? ' is-done' : ''}${single ? ' is-single' : ''}${inline ? ' is-inline' : ''}${once ? ' is-once' : ''}${sticky ? ' is-scene' : ''}${sub ? ' has-sub' : ''}${question ? ' has-stage' : ''}`}
      id={id}
    >
      {question && !inline ? <QStage id={id} question={question} hint={subObj.hint} icon={subObj.icon} keyWord={subObj.key} part={part} onPhase={setStage} /> : null}
      {sub ? (
        <header
          className={`scene-head${question ? ' has-q' : ''}${answer != null ? ' has-a' : ''}${question && stage === 'done' && !reduce ? ' is-arrived' : ''}`}
          data-scene={subTitle}
          id={question ? `q-${id}` : undefined}
        >
          <span className="scene-head-row">
            {subObj?.icon ? <Icon name={iconFor(subObj.icon)} size={16} className="scene-head-icon" /> : null}
            <h3 className="scene-head-title">{subTitle}</h3>
            {question ? (
              <p className="scene-head-q">
                <Icon name={iconFor('question')} size={14} className="scene-head-q-icon" />
                <span>{question}</span>
              </p>
            ) : null}
            <span className="scene-head-rule" aria-hidden="true" />
          </span>
          {answer != null ? <Answer answer={answer} to={subObj.answerTo} shown={answered} /> : null}
        </header>
      ) : null}
      <div className="scrolly-graphic" ref={box} aria-label={label} aria-describedby={hlDesc.node ? hlDesc.id : undefined} role="group" hidden={inline || undefined}>
        {hlDesc.node}
        <div
          className={`scrolly-graphic-inner${dots ? ' has-dots' : ''}`}
          data-step={shown}
          ref={liveRef}
          style={reserve && minH && !inline ? { minHeight: minH } : undefined}
        >
          {dots ? (
            <StepDots
              n={cards}
              active={once ? Math.max(0, cardSteps.indexOf(shown)) : Math.max(0, cardIndex)}
              steps={cardSteps.map((i) => steps[i])}
              onGo={goStep}
            />
          ) : null}
          {inline ? null : graphic(shown, reduce, ctx)}
          {phone ? null : footHere}
        </div>
        {reserve && measuring ? (
          <div className="scrolly-sizers" ref={sizers} aria-hidden="true" inert>
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
      <ol className="scrolly-steps" ref={stepsCol}>
        {steps.map((s, i) =>
          s.spacer ? (
            <li key={s.id} id={s.id} ref={register(i)} className="scrolly-step is-spacer" aria-hidden="true" />
          ) : (
            <li
              key={s.id}
              id={s.id}
              ref={register(i)}
              data-highlight={s.highlight == null ? undefined : normIds(s.highlight).join(' ') || 'none'}
              data-highlight-why={s.highlightWhy}
              className={`scrolly-step${i === active ? ' is-active' : i < active ? ' is-past' : ''}`}
              aria-current={i === active ? 'step' : undefined}
            >
              {inline ? <InlineCopy graphic={graphic} i={i} reduce={reduce} label={label} highlight={s.highlight} /> : null}
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
                {once ? (
                  <button type="button" className="scrolly-show" aria-label="Show on chart" title="Show on chart" aria-pressed={shown === i} onClick={() => showOnChart(i)}>
                    <Icon name="eye" size={16} />
                  </button>
                ) : null}
              </div>
            </li>
          ),
        )}
        <li className="scrolly-end" ref={register(steps.length)} aria-hidden="true" />
      </ol>
      {phone ? footHere : null}
      {takeaway ? (
        <p className="scrolly-takeaway">
          <Icon name={iconFor('takeaway')} size={16} className="scrolly-takeaway-icon" />
          <span>
            <strong>Key takeaway:</strong> {takeaway}
          </span>
        </p>
      ) : null}
    </div>
    </HighlightCtx.Provider>
  );
}

// The answer chip under the question (sub.answer): one line with the
// scene's key number(s), slid up once the last card is reached. `answerTo`
// (an anchor, or { tab, sub, anchor }) makes it a link to the figure's home;
// then it restates a figure printed there, so it is data-axis (not a second
// home for the number checks). Never hidden from innerText (opacity only),
// so the number checks see the same text at any scroll.
function Answer({ answer, to, shown }) {
  const inner = (
    <>
      <Icon name={iconFor('answer')} size={14} className="scene-head-a-icon" />
      <span className="scene-head-a-label">Answer</span>
      <span className="scene-head-a-text">{answer}</span>
    </>
  );
  const cls = `scene-head-a${shown ? ' is-shown' : ''}`;
  if (to == null) return <p className={cls}>{inner}</p>;
  const t = typeof to === 'string' ? { tab: 'story', anchor: to } : to;
  return (
    <p className={cls} data-axis="">
      <NavLink tab={t.tab ?? 'story'} sub={t.sub} anchor={t.anchor} className="scene-head-a-link">
        {inner}
      </NavLink>
    </p>
  );
}

// One step's own copy of the figure (inline fallback, 900px and below), with
// its own `entered`, so each copy plays its one-shot move as it comes into view.
function InlineCopy({ graphic, i, reduce, label, highlight }) {
  const [ref, entered] = useInView({ rootMargin: '0px 0px -15% 0px' });
  const box = useRef(null);
  const hl = useHighlightState(highlight);
  useApplyHighlight(box, hl, [entered]);
  const setRef = (el) => {
    ref.current = el;
    box.current = el;
  };
  return (
    <div ref={setRef} className="scrolly-graphic-inner is-inline" role="group" aria-label={label}>
      {graphic(i, reduce, { inline: true, once: false, entered, prev: i > 0 ? i - 1 : null, highlight: hl.ids })}
    </div>
  );
}

// Bring step `el` to where it becomes the active step (the trigger line:
// 0.55 of the screen on desktop; at 900px and below, from the sticky
// figure, as in Scrolly): as high as
// it can sit (below the rail; under a sticky figure on phones) while the
// next card is still below the trigger line.
function goToStep(el, box, reduce) {
  const h = window.innerHeight;
  const phoneW = window.innerWidth <= 900;
  let line = h * (phoneW ? 0.88 : 0.55);
  let y;
  if (!phoneW) {
    y = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  } else if (box && getComputedStyle(box).position === 'sticky') {
    const bottom = (parseFloat(getComputedStyle(box).top) || 0) + box.offsetHeight;
    line = bottom + 0.4 * Math.max(0, h - bottom);
    y = bottom + 8;
  } else {
    y = 120;
  }
  const r = el.getBoundingClientRect();
  let next = el.nextElementSibling;
  while (next && next.classList.contains('is-spacer')) next = next.nextElementSibling;
  if (next) {
    const gap = next.getBoundingClientRect().top - r.top;
    y = Math.max(y, line - gap + 12);
  }
  y = Math.min(y, line - 12);
  window.scrollTo({ top: Math.max(0, r.top + window.scrollY - y), behavior: reduce ? 'auto' : 'smooth' });
}

// Where the reader is in the block: one dot per card and "n of m". Each dot
// is a button ("Step n of m: title", aria-current on the active one) that
// scrolls to its step; Left and Right (Home, End) move between them. The
// "n of m" text is data-axis (not a figure, for the number checks).
// `onGo(k)` brings card k's state up (Scrolly decides how).
function StepDots({ n, active, steps, onGo }) {
  const btns = useRef([]);
  const go = (k, focus) => {
    const j = Math.max(0, Math.min(n - 1, k));
    onGo(j);
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
