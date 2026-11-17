'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { EntryCtx, FinalState, useActiveStep, useEntry, useIsPhone, useReducedMotion, useSnap } from './motion.js';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { scrollBelowBars } from '@/lib/scroll.js';
import { HighlightCtx, normIds, useApplyHighlight, useHighlightDescription, useHighlightState } from './highlight.jsx';
import QStage, { Answer, QFrame } from './QStage.jsx';
import MarkCallout from './MarkCallout.jsx';

// a sticky figure may take 45% of the screen at 900px and below
const capFor = () => 0.45;
const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const subscribeWidth = (cb) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};

// A sticky scene's trigger line sits this far below the stuck figure's foot:
// 40% of the room below it; on tablets (768-900px, round 1 review: "second
// steps sit up to 215px below the sticky chart") at most 72px, so the next
// sentence takes over just under the chart, while the one before is held
// against the foot by its sticky body (story.css), not left under the chart.
const tablet = () => window.innerWidth >= 768 && window.innerWidth <= 900;
const lineGap = (room) => {
  const g = 0.4 * Math.max(0, room);
  return tablet() ? Math.min(g, 72) : g;
};

// A scrolly block: a figure and text steps beside it. No empty page: a block
// ends when its last card ends, cards are 32px apart (no viewport-height
// steps), and the active step changes as a card crosses the trigger line
// (motion.js). Desktop: steps in a column of about 340px on the left, the
// figure on the right, sticky below the rail only while the step column is
// taller than it (no step counter or dots: the cards show where the reader
// is). One card: a plain two-column block (stacked on phones),
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
// A step's `icon` (a concept from lib/concepts.js) leads its sentence.
//
// A step marked `pin: 'bottom'` describes the bottom of a figure that may be
// taller than the screen below the rail (laptops): while it is active, on
// desktop, the sticky box rises by the overflow so the figure's foot is in
// view. Other steps keep the figure pinned by its top.
//
// A step marked `spacer: true` has no card and no height (a zero-height
// marker; kept so old step lists still work), and is not counted as a card.
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
//                { title, icon, question, hint, key, pin, answer, answerTo }
//                (icon a concept). Rendered as <header class="scene-head"
//                data-scene="title" id="q-<id>"> (the rail reads
//                [data-scene]; #q-<id> links to the question); step titles
//                then become h4 (visually hidden: the step's accessible
//                name).
//                `question` (about a dozen words, neutral, answered by the
//                block): printed in the header, and played big (QStage.jsx):
//                by default (QFrame, no added height) inside the figure
//                frame as the block comes in, then shrunk into the header
//                while the chart draws in; with `pin: 'full'` (QStage) one
//                pinned screen above the header. `key`: the word to mark;
//                `hint`: one line under it. It follows the scroll both ways
//                (scrolling back up brings the question back); skipped under
//                reduced motion, in print and in "is-inline" blocks; the
//                chart draws in once, when the question first moves aside.
//                `answer` (string or node): the scene's ONE closing line,
//                after the last card (icon + sentence, no box), shown once
//                the last card is reached (always when drawn once, under
//                reduced motion and in print). With `answerTo` it is
//                data-axis (it restates a figure whose home is elsewhere).
//                `takeaway` (old API): the closing line when no `answer`;
//                ignored when there is one. `recap` (old API): ignored.
//   step.highlight  ids of the marks this step is about (highlight.jsx):
//                the figure's other [data-mark]s dim; ctx.highlight /
//                useHighlight() give the lit ids; `highlight: 'none'` with
//                `highlightWhy` for a text-only step;
//   step.callout the step's sentence (true: its title) anchored to its mark
//                (`anchor`, else the first highlight id) inside the figure,
//                with a leader line (MarkCallout.jsx);
//   step.icon    a concept: the card's one icon, leading its sentence.
//   step.kicker, step.kickerIcon, part (old API): ignored (round 1: a step
//                card is one sentence and one icon).
export default function Scrolly({ id, steps, graphic, label, wide = false, phone: phoneMode, scene = false, foot, sub }) {
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
    return bottom + lineGap(h - bottom);
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
  // reversible entry (motion.js useEntry): true once the figure is 85% up
  // the screen, false again when the reader scrolls back above the block,
  // so its entry moves replay; `instant` when landed by a jump or a link
  const [seenRef, entry] = useEntry();
  const entered = entry.entered;
  // landed by a jump, a reload or a link: the current step drawn at once
  // (story.css .is-snap), not beat by beat from an empty figure
  const snap = useSnap(live, entry);
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
  // go to card k (a link to an old step id, through a 'scrolly-go' event
  // on the block; round 2 removed the step dots): phones drawn once set the
  // state; desktop scrolls to the middle of the step's share; a sticky
  // phone scene scrolls the card to its trigger line
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
  const goRef = useRef(goStep);
  useEffect(() => {
    goRef.current = goStep;
  });
  useEffect(() => {
    const el = id ? document.getElementById(id) : null;
    if (!el) return undefined;
    const on = (e) => goRef.current(Number(e.detail) || 0);
    el.addEventListener('scrolly-go', on);
    return () => el.removeEventListener('scrolly-go', on);
  }, [id]);
  // The active step's sentence sits against the chart (round 1, Vahid:
  // "these kind of text are like in nowhere in space"). Desktop, several
  // cards: the active card is moved (a transform, written each frame; the
  // card stays in its list item, so the scroll that drives the steps, the
  // links and the text are unchanged) level with the mark it names
  // (step.anchor, else its first highlight id: the figure's [data-mark]),
  // or near the figure's top for a step that names none, in the column
  // 24px from the chart; inactive cards fade out entirely.
  const anchorRef = useRef(null);
  useEffect(() => {
    anchorRef.current = { shown, steps };
  });
  // desktop only: on phones a sticky scene's active card already sits just
  // under the stuck chart (its trigger line), and moving it would leave a
  // blank slot in the flow (the gap check)
  const anchored = !single && !inline && !once && !phone;
  useEffect(() => {
    if (!anchored || typeof window === 'undefined') return undefined;
    let raf = 0;
    const place = () => {
      raf = 0;
      const g = live.current;
      const col = stepsCol.current;
      if (!g || !col) return;
      const V = window.innerHeight;
      const fig = g.getBoundingClientRect();
      // only while the figure is on screen; elsewhere every card in place
      if (fig.bottom < 0 || fig.top > V) {
        col.querySelectorAll('.scrolly-card').forEach((c) => {
          c.style.transform = '';
        });
        return;
      }
      if (!anchorRef.current) return;
      const { shown: i, steps: st } = anchorRef.current;
      const step = st[i];
      if (!step) return;
      const li = [...col.children].find((c) => c.id === step.id);
      const card = li?.querySelector('.scrolly-card');
      if (!card) return;
      for (const c of col.querySelectorAll('.scrolly-card')) if (c !== card) c.style.transform = '';
      // centre the sentence (the body), not the card: part CSS floors a
      // card's height, which would put the sentence above its mark
      const body = card.querySelector('.scrolly-body') ?? card;
      const H = body.offsetHeight;
      const lead = body.getBoundingClientRect().top - card.getBoundingClientRect().top;
      const liTop = li.getBoundingClientRect().top + lead;
      const desk = window.innerWidth > 900;
      let y;
      if (desk) {
        const ids = normIds(step.anchor ?? step.highlight);
        const sel = ids.map((id) => `[data-mark~="${String(id).replace(/"/g, '')}"]`).join(',');
        const mark = sel ? g.querySelector(sel) : null;
        const r = mark?.getBoundingClientRect();
        y = r && r.height + r.width > 0 ? r.top + r.height / 2 - H / 2 : fig.top + 48;
        const rail = document.querySelector('.story-rail')?.getBoundingClientRect().bottom ?? 0;
        y = Math.min(Math.max(y, fig.top + 8, rail + 8), Math.max(fig.top + 8, fig.bottom - H - 8), V - H - 8);
      } else {
        y = fig.bottom - H - 10;
      }
      // never outside its own block's column
      const cr = col.getBoundingClientRect();
      y = Math.min(Math.max(y, cr.top), Math.max(cr.top, cr.bottom - H));
      card.style.transform = `translateY(${Math.round(y - liTop)}px)`;
    };
    const on = () => {
      if (!raf) raf = window.requestAnimationFrame(place);
    };
    place();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    const ro = typeof ResizeObserver === 'undefined' || !live.current ? null : new ResizeObserver(on);
    if (ro) ro.observe(live.current);
    const col = stepsCol.current;
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      ro?.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
      col?.querySelectorAll('.scrolly-card').forEach((c) => {
        c.style.transform = '';
      });
    };
  }, [anchored, shown]);
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
      // centred, but never more than 96px below the rail (no blank band
      // over 120px above it)
      else if (over < 0) {
        const rail = document.querySelector('.story-rail')?.getBoundingClientRect().bottom ?? top;
        b.style.top = `${Math.round(Math.min(top + Math.floor(-over / 2), Math.max(top, rail + 96)))}px`;
      }
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
  // tablets, a sticky scene: where the stuck figure's foot is (its sticky
  // top plus its height), written as --scene-foot; each card's sentence
  // sticks just under it (story.css) until its card has scrolled past
  const [footY, setFootY] = useState(0);
  useEffect(() => {
    const b = box.current;
    if (!sticky || !b) {
      setFootY(0);
      return undefined;
    }
    const place = () => {
      const f = tablet() && getComputedStyle(b).position === 'sticky' ? Math.round((parseFloat(b.style.top || getComputedStyle(b).top) || 0) + b.offsetHeight) : 0;
      setFootY(f);
    };
    place();
    window.addEventListener('resize', place);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    ro?.observe(b);
    return () => {
      window.removeEventListener('resize', place);
      ro?.disconnect();
    };
  }, [sticky, width]);
  // one step, one highlight (highlight.jsx): the shown step's marks
  const hl = useHighlightState(steps[shown]?.highlight);
  useApplyHighlight(live, hl, [shown, entered]);
  const hlDesc = useHighlightDescription(hl);
  // the shown step's sentence anchored to its mark (opt-in: step.callout)
  const cur = steps[shown];
  const calloutText = cur?.callout ? (cur.callout === true ? cur.title : cur.callout) : null;
  const calloutAnchor = cur?.anchor ?? normIds(cur?.highlight)[0];
  // the question-led sequence (QStage.jsx): arrive, hold, move into the
  // scene; the scene's entry moves wait until the question has moved in
  const subObj = sub && typeof sub === 'object' ? sub : null;
  const question = subObj?.question;
  const takeaway = subObj?.takeaway;
  // one closing line per scene (round 1): sub.answer, else sub.takeaway
  const answer = subObj?.answer ?? takeaway;
  const answerTo = subObj?.answer != null ? subObj?.answerTo : undefined;
  const pinFull = subObj?.pin === 'full';
  // the question's phase follows the scroll both ways (QStage.jsx)
  const [stage, setStage] = useState(question ? 'pending' : 'done');
  const stageDone = !question || inline || reduce || stage === 'done' || stage === 'reveal';
  // while the big question is up (before the chart starts to draw), the
  // header's small copy of it and the step text wait (story.css
  // .is-asking): the question is on screen once, and no sentence gives the
  // answer before its marks exist. Never under reduced motion, in an inline
  // block or after a jump (the landing guard sets 'done' at once).
  const asking = !stageDone;
  // the chart draws in once, the first time the question moves aside, and
  // stays drawn when the question comes back over it (scrolling up)
  // (until the reader scrolls back above the block: then it replays)
  const [drawn, setDrawn] = useState(false);
  if (!drawn && entered && stageDone) setDrawn(true);
  if (drawn && !entered) setDrawn(false);
  // the step text waits for the marks (round 2, sign-off #4): the figures'
  // entry moves start 400ms after the chart is drawn in (motion.js
  // useEnterState's hold), so the first sentence fades in then too, not
  // over an empty plot (story.css .is-arming). Not after a jump or a link
  // (is-snap: everything at once) and not under reduced motion.
  const [armedRun, setArmedRun] = useState(-1);
  const arming = drawn && !inline && !reduce && !snap && !entry.instant && armedRun !== entry.run;
  useEffect(() => {
    if (!arming) return undefined;
    const t = setTimeout(() => setArmedRun(entry.run), 400);
    return () => clearTimeout(t);
  }, [arming, entry.run]);
  // the answer: once the scene's last card is reached (always when drawn
  // once, under reduced motion and in print, by CSS)
  const answered = once || inline || reduce || active >= lastCard;
  // a wide single block (cards above the figure, desktop): the answer goes
  // after the figure, once the question has moved into it (Fable, batch 2)
  const answerAfter = answer != null && wide && single && !phone;
  const ctx = { inline: false, once, entered: drawn || (entered && stageDone), instant: entry.instant, run: entry.run, prev: hist.prev, highlight: hl.point ? [hl.point] : hl.ids };
  const sizerCtx = { inline: false, once: false, entered: true, prev: null, highlight: [] };
  const subTitle = typeof sub === 'string' ? sub : sub?.title;
  const TitleTag = sub ? 'h4' : 'h3';
  const footHere = foot != null ? <div className="scrolly-foot">{foot}</div> : null;
  const entryValue = { entered: ctx.entered, instant: entry.instant, run: entry.run };
  return (
    <EntryCtx.Provider value={entryValue}>
    <HighlightCtx.Provider value={hl}>
    <div
      className={`scrolly${wide ? ' is-wide' : ''}${done ? ' is-done' : ''}${single ? ' is-single' : ''}${inline ? ' is-inline' : ''}${once ? ' is-once' : ''}${sticky ? ' is-scene' : ''}${sub ? ' has-sub' : ''}${question && pinFull ? ' has-stage' : ''}${anchored ? ' is-anchored' : ''}${asking ? ' is-asking' : ''}${footY ? ' has-foot' : ''}${snap ? ' is-snap' : ''}${arming ? ' is-arming' : ''}`}
      id={id}
      style={footY ? { '--scene-foot': `${footY}px` } : undefined}
    >
      {question && pinFull && !inline ? (
        <QStage id={id} question={question} hint={subObj.hint} icon={subObj.icon} keyWord={subObj.key} onPhase={setStage} />
      ) : null}
      {sub ? (
        <header
          className={`scene-head${question ? ' has-q' : ''}${question && (stage === 'done' || stage === 'reveal') && !reduce ? ' is-arrived' : ''}`}
          data-scene={subTitle}
          id={question ? `q-${id}` : undefined}
        >
          <span className="scene-head-row">
            {subObj?.icon ? <Icon name={iconFor(subObj.icon)} size={16} className="scene-head-icon" /> : null}
            <h3 className="scene-head-title">{subTitle}</h3>
            {question ? <p className="scene-head-q">{question}</p> : null}
            <span className="scene-head-rule" aria-hidden="true" />
          </span>
        </header>
      ) : null}
      <div className="scrolly-graphic" ref={box} aria-label={label} aria-describedby={hlDesc.node ? hlDesc.id : undefined} role="group" hidden={inline || undefined}>
        {hlDesc.node}
        <div
          className="scrolly-graphic-inner"
          data-step={shown}
          ref={liveRef}
          style={reserve && minH && !inline ? { minHeight: minH } : undefined}
        >
          {inline ? null : graphic(shown, reduce, ctx)}
          {question && !pinFull && !inline && !reduce ? (
            <QFrame id={id} question={question} hint={subObj.hint} icon={subObj.icon} keyWord={subObj.key} boxRef={box} onPhase={setStage} />
          ) : null}
          {inline || !calloutText ? null : <MarkCallout rootRef={live} anchor={calloutAnchor} text={calloutText} stepKey={steps[shown]?.id} />}
          {phone ? null : footHere}
        </div>
        {reserve && measuring ? (
          <div className="scrolly-sizers" ref={sizers} aria-hidden="true" inert>
            <FinalState.Provider value>
              {steps.map((s, i) => (
                <div key={s.id} className="scrolly-graphic-inner">
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
              <div className={`scrolly-card${s.icon ? ' has-icon' : ''}`}>
                {s.title ? <TitleTag className="scrolly-title visually-hidden">{s.title}</TitleTag> : null}
                {s.icon ? <Icon name={iconFor(s.icon)} size={18} className="scrolly-card-icon" /> : null}
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
        {answer != null && !answerAfter ? (
          <li className="scrolly-answer">
            <Answer answer={answer} to={answerTo} shown={answered} />
          </li>
        ) : null}
        <li className="scrolly-end" ref={register(steps.length)} aria-hidden="true" />
      </ol>
      {phone ? footHere : null}
      {answerAfter ? (
        <div className="scrolly-answer scrolly-answer-after">
          <Answer answer={answer} to={answerTo} shown={reduce || ctx.entered} />
        </div>
      ) : null}
    </div>
    </HighlightCtx.Provider>
    </EntryCtx.Provider>
  );
}

// One step's own copy of the figure (inline fallback, 900px and below), with
// its own `entered`, so each copy plays its one-shot move as it comes into view.
function InlineCopy({ graphic, i, reduce, label, highlight }) {
  const [ref, entry] = useEntry();
  const entered = entry.entered;
  const box = useRef(null);
  const hl = useHighlightState(highlight);
  useApplyHighlight(box, hl, [entered]);
  const setRef = (el) => {
    ref.current = el;
    box.current = el;
  };
  return (
    <div ref={setRef} className="scrolly-graphic-inner is-inline" role="group" aria-label={label}>
      <EntryCtx.Provider value={entry}>{graphic(i, reduce, { inline: true, once: false, entered, instant: entry.instant, run: entry.run, prev: i > 0 ? i - 1 : null, highlight: hl.ids })}</EntryCtx.Provider>
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
    line = bottom + lineGap(h - bottom);
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

