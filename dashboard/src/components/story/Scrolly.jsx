'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { EntryCtx, FinalState, useActiveStep, useEntry, useIsPhone, useReducedMotion, useSnap } from './motion.js';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { scrollBelowBars } from '@/lib/scroll.js';
import { setStyle, subscribe } from '@/lib/scrollLoop.js';
import { HighlightCtx, normIds, useApplyHighlight, useHighlightDescription, useHighlightState } from './highlight.jsx';
import QStage, { Answer } from './QStage.jsx';
import MarkCallout from './MarkCallout.jsx';
import { NotesSlot } from './FigNotes.jsx';

// a sticky figure may take 55% of the screen at 600px and below and 45%
// from 601 to 900px, of the small viewport height (svh: browser bars
// shown). phone-sticky-cap-fable.md (18 Nov) replaces round 2 sign-off #5's
// 45% on phones: cards are now held under the figure, so the test is
// whether the card fits the room left, and the chart type scale's phone
// sizes (item 9) took every scene over 45%.
const capFor = (w) => (w <= 600 ? 0.55 : 0.45);
let svhPx = 0;
const svh = () => {
  if (svhPx) return svhPx;
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;top:0;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(d);
  svhPx = d.offsetHeight || window.innerHeight;
  d.remove();
  window.addEventListener('resize', () => {
    svhPx = 0;
  }, { once: true });
  return svhPx;
};
const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;
// The hold rule (Vahid, 18 Nov; headline-tiles ruling, Fix B): every
// state is held, chart and text stuck together, for at least 40% of the
// screen height of scroll, a scene's first state for 60%. Desktop: the
// stuck run is split in these shares (plus SLACK px each, against the
// check's sampling). Phones: the same shares are the card's sticky spacer
// (story.css).
const FIRST_SHARE = 0.6;
const NEXT_SHARE = 0.4;
const SLACK = 40;
const shares = (n, V) => Array.from({ length: n }, (_, k) => (k === 0 ? FIRST_SHARE : NEXT_SHARE) * V + SLACK);
const holdRun = (n, V) => shares(n, V).reduce((a, b) => a + b, 0);
// the state for s px of a stuck run `travel` long, its n states in shares
const stateAt = (s, travel, n, V) => {
  const sh = shares(n, V);
  const f = travel / holdRun(n, V);
  let acc = 0;
  for (let k = 0; k < n; k++) {
    acc += sh[k] * f;
    if (s < acc) return k;
  }
  return n - 1;
};
// how far through state k's share of the run s px is, 0 to 1
const stateFrac = (s, travel, n, V) => {
  const sh = shares(n, V);
  const f = travel / holdRun(n, V);
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const w = sh[k] * f;
    if (s < acc + w || k === n - 1) return Math.min(1, Math.max(0, (s - acc) / Math.max(1, w)));
    acc += w;
  }
  return 1;
};
// the middle of state k's share of the run, in px from where it starts
const stateMid = (k, travel, n, V) => {
  const sh = shares(n, V);
  const f = travel / holdRun(n, V);
  return (sh.slice(0, k).reduce((a, b) => a + b, 0) + sh[k] / 2) * f;
};
const subscribeWidth = (cb) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};

// A sticky scene's trigger line sits this far below the stuck figure's foot:
// 40% of the room below it, at most 72px at every width up to 900px (Fix
// B2), so the next card takes over just under the chart, while the one
// before is held against the foot by its sticky card (story.css), not left
// under the chart.
const lineGap = (room) => Math.min(0.4 * Math.max(0, room), 72);

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
// the cap (55% of the screen on phones, capFor) falls back to the figure once. `phone="steps"` instead
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
//                always as a question moment on its navy section, one
//                pinned screen above the header (item 16; the in-frame QFrame
//                is no longer used), the icon, the words and the hint centred,
//                then shrunk into the header. `key`: the word to mark;
//                `hint`: one line under it. It follows the scroll both ways
//                (scrolling back up brings the question back); skipped under
//                reduced motion, in print and in "is-inline" blocks; the
//                chart draws in once, when the question first moves aside.
//                `answer` (string or node): the scene's ONE closing line,
//                a takeaway caption inside the figure frame, under the plot
//                (no icon; a 3px rule in the part accent), shown once the
//                last card is reached (always when drawn once, under
//                reduced motion and in print). With `answerTo` it is
//                data-axis (it restates a figure whose home is elsewhere).
//                `answerHighlight`: the marks the caption is about, in the
//                syntax of step.highlight; they replace the last step's
//                once the reader is past the last card.
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
// `close`: { answer, answerTo } for a block with no `sub` (the output scene,
// whose header is its own TopicHead): the same caption, placed the same way.
export default function Scrolly({ id, steps, graphic, label, wide = false, phone: phoneMode, scene = false, foot, sub, close: closeProp, stepProgress = false }) {
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
  // desktop, several cards: the state follows `prog` (below), so the trigger
  // line only says whether the block is done (no re-render per card)
  const pickStep = (i) => (window.innerWidth > 900 && steps.filter((x) => !x.spacer).length > 1 ? (i >= steps.length ? steps.length : 0) : i);
  const [register, raw] = useActiveStep(steps.length + 1, 0.55, phoneLine, pickStep);
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
  // 600px and below the notes leave the pinned box (FigNotes.jsx), so the
  // measure is keyed by that too
  const small = useIsPhone('(max-width: 600px)');
  const mkey = small ? -width : width;
  const [measured, setMeasured] = useState({ w: -1, h: 0 });
  const measuring = reserve && measured.w !== mkey;
  const minH = reserve && measured.w === mkey ? measured.h : 0;
  // too tall to stick on a phone
  const tooTall = reserve && minH > 0 && typeof window !== 'undefined' && minH > svh() * capFor(window.innerWidth);
  const flat = phone && !single && (!scene || tooTall);
  // phone="steps": each step carries its own copy of the figure (for blocks
  // whose states are different figures); otherwise one figure, then the cards
  const inline = flat && phoneMode === 'steps';
  const once = flat && !inline;
  const sticky = reserve && !tooTall;
  // the notes slot after the steps (FigNotes.jsx): a sticky phone scene
  // (600px and below) draws its figures' notes there; while measuring
  // they are left out
  const [notesEl, setNotesEl] = useState(null);
  const notesSlot = small && reserve && (measuring || sticky) ? { phone: true, el: sticky ? notesEl : null } : null;
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
    setMeasured({ w: mkey, h: Math.ceil(Math.max(own, ...hs)) });
  }, [measuring, mkey]);
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
  // Desktop, several cards (Fix B1): only the stuck run counts, from the
  // moment the figure sticks to the moment the column's foot lets it go
  // (the column's height less the figure box's); it is split in the hold
  // shares, the first state 0.6 of the screen, the rest 0.4. Before the
  // figure sticks the first state shows, after it the last. `stick` is the
  // figure's own stuck top (place, below), not the one a `pin: 'bottom'`
  // step shifts, so the split never depends on the state it picks.
  const stickRef = useRef(null);
  const geom = () => {
    const col = stepsCol.current;
    const b = box.current;
    if (!col || !live.current || !b) return null;
    const stick = stickRef.current ?? (parseFloat(b.style.top || getComputedStyle(b).top) || 0);
    return { colTop: col.getBoundingClientRect().top, stick, travel: Math.max(0, col.offsetHeight - b.offsetHeight) };
  };

  // The step column's length (Fix B1): desktop, several cards, the stuck
  // run (C - F, geom above) holds every state for its share, so the column
  // needs C = F + 0.6V + 0.4V(n - 1) + SLACK n: a min-height on the column
  // (story.css), not a floor on every card, so each card's pinned item is
  // only as tall as its words. The stylesheet sets it from the figure box's
  // own floor and --n before any script runs (the prerendered first paint);
  // this raises it (--col-min) to the figure's measured height, in a layout
  // effect, per screen size, raise-only within a size: a state that makes
  // the figure taller raises it once, and the page never shrinks under the
  // reader.
  const [colMin, setColMin] = useState({ k: '', v: 0 });
  const minRef = useRef(colMin);
  const fitCol = () => {
    const col = stepsCol.current;
    const g = live.current;
    if (!col || !g || single || window.innerWidth <= 900) return;
    const V = window.innerHeight;
    const k = `${window.innerWidth}x${V}`;
    const cur = minRef.current.k === k ? minRef.current.v : 0;
    const b = box.current;
    const want = Math.max(0, Math.ceil((b ? b.offsetHeight : g.offsetHeight) + holdRun(cardSteps.length, V)));
    if (minRef.current.k !== k || want > cur) setColMin({ k, v: Math.max(want, cur) });
  };
  const fitRef = useRef(fitCol);
  useIso(() => {
    minRef.current = colMin;
    fitRef.current = fitCol;
  });
  useIso(() => {
    fitRef.current();
  }, [width, single]);
  useEffect(() => {
    if (single || typeof window === 'undefined') return undefined;
    const fit = () => fitRef.current();
    const ro = typeof ResizeObserver === 'undefined' || !live.current ? null : new ResizeObserver(fit);
    ro?.observe(live.current);
    window.addEventListener('resize', fit);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [single]);

  // the page's one scroll loop (lib/scrollLoop.js): reads, then writes;
  // setProg only when the step changes
  const progRef = useRef(null);
  useEffect(() => {
    if (single || typeof window === 'undefined') return undefined;
    const n = cardSteps.length;
    const put = (v) => {
      if (v === progRef.current) return;
      progRef.current = v;
      setProg(v);
    };
    return subscribe({
      el: stepsCol.current,
      read: () => {
        const m = window.innerWidth > 900 ? geom() : null;
        if (!m) return null;
        // px since the figure stuck
        const s = m.stick - m.colTop;
        // (no stuck run at all, as without layout: the last state once
        // the figure reaches its place)
        return cardSteps[s < 0 ? 0 : s >= m.travel ? n - 1 : stateAt(s, m.travel, n, window.innerHeight)];
      },
      write: put,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single, cardSteps.join(',')]);
  // `stepProgress` (opt-in): how far the reader is through the active
  // card's hold, 0 to 1, written as --step-p on the block on the page's one
  // scroll loop, for a figure whose change is scroll-linked across a step
  // (the GDP morph, item 30). Desktop: the share of the stuck run; a sticky
  // phone scene: how far the active card has travelled through its hold.
  useEffect(() => {
    if (!stepProgress || single || typeof window === 'undefined') return undefined;
    const n = cardSteps.length;
    let last = null;
    return subscribe({
      el: stepsCol.current,
      read: () => {
        if (window.innerWidth > 900) {
          const m = geom();
          if (!m) return null;
          const s = m.stick - m.colTop;
          return s < 0 ? 0 : s >= m.travel ? 1 : stateFrac(s, m.travel, n, window.innerHeight);
        }
        const blk = ownBox.current;
        const li = blk?.querySelector('.scrolly-step.is-active');
        const card = li?.querySelector('.scrolly-card');
        const b = box.current;
        if (!li || !card || !b || getComputedStyle(b).position !== 'sticky') return 1;
        const foot = (parseFloat(b.style.top || getComputedStyle(b).top) || 0) + b.offsetHeight + 8;
        const r = li.getBoundingClientRect();
        return Math.min(1, Math.max(0, (foot - r.top) / Math.max(1, li.offsetHeight - card.offsetHeight)));
      },
      write: (v) => {
        if (v == null || (last != null && Math.abs(v - last) < 0.002)) return;
        last = v;
        ownBox.current?.style.setProperty('--step-p', v.toFixed(3));
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepProgress, single, cardSteps.join(',')]);
  // go to card k (a link to an old step id, through a 'scrolly-go' event
  // on the block; round 2 removed the step dots): phones drawn once set the
  // state; desktop scrolls to the middle of the step's share of the stuck
  // run (geom); a sticky phone scene scrolls the card to its trigger line
  const goStep = (k, instant = false) => {
    if (once) {
      setPicked(cardSteps[k]);
      return;
    }
    const m = window.innerWidth > 900 ? geom() : null;
    if (m) {
      const s = stateMid(k, m.travel, cardSteps.length, window.innerHeight);
      window.scrollTo({ top: Math.max(0, window.scrollY + m.colTop - (m.stick - s)), behavior: reduce || instant ? 'instant' : 'smooth' });
      return;
    }
    const el = document.getElementById(steps[cardSteps[k]].id);
    // a link lands at once (instant), as on desktop
    if (el) goToStep(el, box.current, reduce || instant);
  };
  const goRef = useRef(goStep);
  useEffect(() => {
    goRef.current = goStep;
  });
  useEffect(() => {
    const el = id ? document.getElementById(id) : null;
    if (!el) return undefined;
    // detail: the card's index, or { k, instant } (a link: lib/scroll)
    const on = (e) => {
      const d = e.detail;
      if (d && typeof d === 'object') goRef.current(Number(d.k) || 0, Boolean(d.instant));
      else goRef.current(Number(d) || 0);
    };
    el.addEventListener('scrolly-go', on);
    return () => el.removeEventListener('scrolly-go', on);
  }, [id]);
  // The active step's sentence sits against the chart (round 1, Vahid:
  // "these kind of text are like in nowhere in space"). Desktop, several
  // cards: each step's list item is pinned by the browser (position:
  // sticky, story.css; Fix A1: every item in one grid cell, starting
  // where the chart starts and as tall as the chart's foot, so items and
  // chart stick and let go as one body) at the place where its
  // sentence is level with the mark it names (step.anchor, else its first
  // highlight id: the figure's [data-mark]) once the figure is stuck, or
  // near the figure's top for a step that names none; inactive cards fade
  // out entirely. The place is computed once per step change, resize or
  // figure resize, from the figure's settled geometry, never per frame
  // (polish round E: a transform rewritten every frame against the scroll
  // shook on a slow scroll, as the compositor scrolls ahead of the page).
  // desktop only: on phones a sticky scene's active card already sits just
  // under the stuck chart (its trigger line)
  const anchored = !single && !inline && !once && !phone;
  const shownRef = useRef(shown);
  useEffect(() => {
    shownRef.current = shown;
  });
  const pinStep = (i) => {
    const g = live.current;
    const b = box.current;
    const col = stepsCol.current;
    const step = steps[i];
    if (!g || !b || !col || !step || step.spacer || window.innerWidth <= 900) return;
    const li = document.getElementById(step.id);
    const card = li?.querySelector('.scrolly-card');
    if (!card) return;
    const body = card.querySelector('.scrolly-body') ?? card;
    const V = window.innerHeight;
    const gr = g.getBoundingClientRect();
    // where the figure sits once stuck: the sticky box's top, plus the
    // figure's offset inside it
    const stuck = (parseFloat(b.style.top || getComputedStyle(b).top) || 0) + (gr.top - b.getBoundingClientRect().top);
    const figTop = stuck;
    const figBottom = stuck + g.offsetHeight;
    const lead = body.getBoundingClientRect().top - li.getBoundingClientRect().top;
    const Hb = body.offsetHeight;
    // the last card carries the closing caption: its sentence and caption
    // stay inside the figure's height together
    const H = i === lastCard ? card.getBoundingClientRect().bottom - body.getBoundingClientRect().top : Hb;
    const ids = normIds(step.anchor ?? step.highlight);
    const sel = ids.map((id) => `[data-mark~="${String(id).replace(/"/g, '')}"]`).join(',');
    const mark = sel ? g.querySelector(sel) : null;
    const r = mark ? settledRect(g, mark) : null;
    let y = r && r.height + r.width > 0 ? figTop + (r.top - gr.top) + r.height / 2 - Hb / 2 : figTop + 48;
    const railEl = document.querySelector('.story-rail');
    const rs = railEl ? getComputedStyle(railEl) : null;
    const rail = railEl ? (rs.position === 'sticky' ? (parseFloat(rs.top) || 0) + railEl.offsetHeight : railEl.getBoundingClientRect().bottom) : 0;
    // never under the stuck scene header (its room, --scene-head-h)
    const headH = parseFloat(col.closest('.scrolly')?.style.getPropertyValue('--scene-head-h')) || 0;
    y = Math.min(Math.max(y, figTop + 8, rail + headH + 8), Math.max(figTop + 8, figBottom - H - 8), V - H - 8);
    const top = Math.round(y - lead);
    setStyle(li, '--pin-top', `${top}px`);
    // the chart's stuck top and height on the column: every item starts
    // where the chart starts, sticks when it sticks and is let go by the
    // same column foot (story.css, Fix A1)
    setStyle(col, '--fig-top', `${Math.round(figTop)}px`);
    setStyle(col, '--fig-h', `${Math.round(g.offsetHeight)}px`);
  };
  const pinRef = useRef(pinStep);
  useIso(() => {
    pinRef.current = pinStep;
  });
  // the active step: placed before paint on every change
  useIso(() => {
    if (anchored) pinRef.current(shown);
  }, [anchored, shown, width]);
  useEffect(() => {
    if (!anchored || typeof window === 'undefined') return undefined;
    // every card at mount and on every resize (an inactive one pinned
    // before the chart was centred kept a place 100px off), the active one
    // last
    const all = () => {
      steps.forEach((x, i) => {
        if (i !== shownRef.current) pinRef.current(i);
      });
      pinRef.current(shownRef.current);
    };
    all();
    // and once the chart's centring (place, below) has run
    const raf = requestAnimationFrame(all);
    const ro = typeof ResizeObserver === 'undefined' || !live.current ? null : new ResizeObserver(all);
    if (ro) ro.observe(live.current);
    window.addEventListener('resize', all);
    document.fonts?.ready.then(() => pinRef.current && all());
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', all);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchored]);

  // The scene header stays in view while its chart is held (Vahid, 18 Nov:
  // "why this disappearing when scroll"): it was a plain grid row above the
  // sticky chart, so it scrolled away under the rail as the chart stuck,
  // and the hold rule's longer stuck run (f278637) made it gone for most
  // of the scene. It now sticks under the rail (story-bands.css) and the
  // chart sticks below it: --scene-head-h is the room it takes (its
  // height, 12px above it and 16px under it on desktop; its height and
  // 12px on phones, where the chart's backing fills that strip).
  // A block with no `sub` whose header is its host's TopicHead (the output
  // scene, .p2-output) is treated the same: that header sticks instead.
  const headRef = useRef(null);
  const ownBox = useRef(null);
  const headSticks = !single && !once && !inline;
  useIso(() => {
    const blk = ownBox.current;
    const host = blk?.parentElement;
    const h = headRef.current ?? (host?.classList.contains('p2-output') ? host.querySelector(':scope > .scene-head') : null);
    if (h && host?.classList.contains('p2-output')) host.classList.toggle('has-head-stick', headSticks);
    if (!h || !blk) return undefined;
    if (!headSticks) {
      blk.style.removeProperty('--scene-head-h');
      return undefined;
    }
    // its room: its box (opaque, padded: story-bands.css) and a gap under
    // it (8px desktop, 12px phones, where the chart's backing fills it)
    const put = () => setStyle(blk, '--scene-head-h', `${Math.ceil(h.offsetHeight + (window.innerWidth > 900 ? 8 : 12))}px`);
    // It lets go with its chart (sign-off r3: it stayed stuck while the
    // chart scrolled up under it): both are stuck within the same block, so
    // the higher one would let go later by the distance between their
    // stuck feet. A bottom margin of that distance on the header (taken
    // back by the row after it) makes both let go at the same scroll.
    const g = box.current;
    // the output scene's header is its host's: the block itself follows it
    const hosted = h.parentElement !== blk;
    const next = hosted ? [blk] : [g, window.innerWidth > 900 ? stepsCol.current : null].filter(Boolean);
    const release = () => {
      if (!g || getComputedStyle(g).position !== 'sticky') return;
      const gTop = parseFloat(g.style.top || getComputedStyle(g).top) || 0;
      const gm = parseFloat(getComputedStyle(g).marginBottom) || 0;
      const hTop = parseFloat(getComputedStyle(h).top) || 0;
      // a hosted header is held by its host, which ends this much later
      const d = hosted ? h.parentElement.getBoundingClientRect().bottom - blk.getBoundingClientRect().bottom : 0;
      const x = Math.max(0, Math.round(gTop + g.offsetHeight + gm - (hTop + h.offsetHeight) + d));
      setStyle(h, 'margin-bottom', `${x}px`);
      // the row after it keeps its place (on phones only the chart follows
      // the header; the steps follow the chart)
      for (const el of next) setStyle(el, hosted ? 'margin-top' : '--head-take', `${-x}px`);
    };
    const all = () => {
      put();
      release();
    };
    all();
    const raf = requestAnimationFrame(all);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(all);
    ro?.observe(h);
    if (g) ro?.observe(g);
    window.addEventListener('resize', all);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', all);
      h.style.marginBottom = '';
      for (const el of next) {
        el.style.removeProperty('--head-take');
        if (hosted) el.style.marginTop = '';
      }
    };
  }, [headSticks, sub]);
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
      stickRef.current = null;
      if (window.innerWidth <= 900 || single) return;
      const top = parseFloat(getComputedStyle(b).top) || 0;
      stickRef.current = top;
      const room = window.innerHeight - top;
      const over = b.offsetHeight - room;
      if (pinBottom && over > 0) b.style.top = `${top - over - 12}px`;
      // centred, but never more than 96px below the rail (no blank band
      // over 120px above it)
      else if (over < 0) {
        // the rail's stuck bottom (as fitCol and pinStep read it), not its
        // live box: before it sticks (page load) that is lower, so the
        // first placement skipped the cap and a later one applied it (a
        // 12px figure jump at a step change, sign-off r3 minor 5)
        const railEl = document.querySelector('.story-rail');
        const rs = railEl ? getComputedStyle(railEl) : null;
        const rail = railEl ? (rs.position === 'sticky' ? (parseFloat(rs.top) || 0) + railEl.offsetHeight : railEl.getBoundingClientRect().bottom) : top;
        b.style.top = `${Math.round(Math.min(top + Math.floor(-over / 2), Math.max(top, rail + 96)))}px`;
        stickRef.current = parseFloat(b.style.top);
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
  // 900px and below, a sticky scene: the figure lets go with the last card
  // (Fix A4: it covered the last card, the headline tiles on arrival from
  // the hero link): a margin under the figure shortens its sticky range by
  // the last card's height, 8px, and everything after its item in the
  // block (the closing caption prints after the list at 600px and below),
  // and the steps take it back (layout unchanged). The card's own hold
  // (Fix B2: it sticks under the figure for its spacer) ends at its item's
  // foot, so the figure lets go as the card's hold ends, and both leave
  // together.
  useEffect(() => {
    const b = box.current;
    const col = stepsCol.current;
    if (!sticky || !b || !col) return undefined;
    const fit = () => {
      const li = steps[lastCard] ? document.getElementById(steps[lastCard].id) : null;
      const card = li?.querySelector('.scrolly-card');
      const blk = b.closest('.scrolly');
      const x = card && blk ? Math.round(card.offsetHeight + 8 + (blk.getBoundingClientRect().bottom - li.getBoundingClientRect().bottom)) : 0;
      setStyle(b, 'margin-bottom', `${x}px`);
      setStyle(col, 'margin-top', `${-x}px`);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      b.style.marginBottom = '';
      col.style.marginTop = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sticky, small, width, lastCard]);
  // 900px and below, a sticky scene: where the stuck figure's foot is (its
  // sticky top plus its height), written as --scene-foot; each card sticks
  // just under it (story.css, Fix B2) for its hold
  const [footY, setFootY] = useState(0);
  useEffect(() => {
    const b = box.current;
    if (!sticky || !b) {
      setFootY(0);
      return undefined;
    }
    const place = () => {
      const f = getComputedStyle(b).position === 'sticky' ? Math.round((parseFloat(b.style.top || getComputedStyle(b).top) || 0) + b.offsetHeight) : 0;
      setFootY(f);
      // a card taller than the room under the stuck figure is left unstuck
      // (story.css [data-tall]); A4 still keeps it clear of the figure
      const col = stepsCol.current;
      if (!col) return;
      for (const c of col.querySelectorAll('.scrolly-card')) {
        if (f && c.offsetHeight > window.innerHeight - f - 16) c.dataset.tall = '1';
        else delete c.dataset.tall;
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
  }, [sticky, width]);
  // one step, one highlight (highlight.jsx): the shown step's marks; once
  // the end sentinel is active (`done`: past the last card), the closing
  // caption's own marks (sub.answerHighlight), if it names any
  const answerHl = sub && typeof sub === 'object' ? sub.answerHighlight : undefined;
  const hl = useHighlightState(done && answerHl != null && !once ? answerHl : steps[shown]?.highlight);
  useApplyHighlight(live, hl, [shown, entered, done]);
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
  const answer = subObj?.answer ?? takeaway ?? closeProp?.answer;
  const answerTo = subObj?.answer != null ? subObj?.answerTo : closeProp?.answerTo;
  // every topic question is a full question moment on its navy section
  // (Vahid, item 16: "no box background"): the pinned screen (QStage) above
  // the header, never inside the figure frame. `pin` is accepted and
  // ignored.
  const pinFull = true;
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
  // the closing line is a caption inside the figure frame (typography
  // spec, option b): under the plot, above the source line, its height
  // reserved (always in the DOM, opacity only; in the sizers too). An
  // inline block (no shared figure) prints it after its cards.
  // `sub.answerNote`: one 12px line under the caption, in the frame (the
  // GDP scene's debt line and its one "More on Explore" link)
  const answerNote = subObj?.answerNote;
  const noteEl = (on) => (answerNote != null ? <p className={`scrolly-takeaway-note${on ? ' is-shown' : ''}`} data-closing="note">{answerNote}</p> : null);
  // Where the caption goes: in the frame where the figure is drawn once
  // (phones: the figure, complete, then its cards); with a pinned figure
  // (desktop, sticky phone scenes) it ends the last card, so the pinned
  // frame keeps its height (each state's hold, the 45% phone cap). After
  // the quiet-sources merge frees the frame's source lines, the integrator
  // may move it into the pinned frame too.
  const capInFrame = once;
  // a sticky phone scene: after the list, below the last card, never
  // inside it under the stuck chart (Fix A4)
  const capAfter = !capInFrame && !inline && sticky && small;
  const takeawayEl =
    answer != null ? (
      <>
        <Answer answer={answer} to={answerTo} shown={answered} />
        {noteEl(answered)}
      </>
    ) : null;
  const ctx = { inline: false, once, entered: drawn || (entered && stageDone), instant: entry.instant, run: entry.run, prev: hist.prev, highlight: hl.point ? [hl.point] : hl.ids };
  const sizerCtx = { inline: false, once: false, entered: true, prev: null, highlight: [] };
  const subTitle = typeof sub === 'string' ? sub : sub?.title;
  const TitleTag = 'h4';
  const footHere = foot != null ? <div className="scrolly-foot">{foot}</div> : null;
  const entryValue = { entered: ctx.entered, instant: entry.instant, run: entry.run };
  return (
    <EntryCtx.Provider value={entryValue}>
    <NotesSlot.Provider value={notesSlot}>
    <HighlightCtx.Provider value={hl}>
    <div
      className={`scrolly${wide ? ' is-wide' : ''}${done ? ' is-done' : ''}${single ? ' is-single' : ''}${inline ? ' is-inline' : ''}${once ? ' is-once' : ''}${sticky ? ' is-scene' : ''}${sub ? ' has-sub' : ''}${headSticks && sub ? ' has-head-stick' : ''}${question && pinFull ? ' has-stage' : ''}${anchored ? ' is-anchored' : ''}${asking ? ' is-asking' : ''}${footY ? ' has-foot' : ''}${snap ? ' is-snap' : ''}${arming ? ' is-arming' : ''}`}
      id={id}
      ref={ownBox}
      style={single ? (footY ? { '--scene-foot': `${footY}px` } : undefined) : { '--n': cards, ...(footY ? { '--scene-foot': `${footY}px` } : null), ...(colMin.v ? { '--col-min': `${colMin.v}px` } : null) }}
    >
      {question && pinFull && !inline ? (
        <QStage id={id} question={question} hint={subObj.hint} icon={subObj.icon} keyWord={subObj.key} onPhase={setStage} />
      ) : null}
      {sub ? (
        // the topic's one header: its question, an h3 (typography spec,
        // 17 Nov: no icon, kicker, topic name or hairline; the topic name
        // stays as data-scene, for the rail)
        <header ref={headRef} className={`scene-head${question ? ' has-q' : ''}`} data-scene={subTitle} id={question ? `q-${id}` : undefined}>
          <h3 className="scene-head-q">{question ?? subTitle}</h3>
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
          {inline || !calloutText ? null : <MarkCallout rootRef={live} anchor={calloutAnchor} text={calloutText} stepKey={steps[shown]?.id} />}
          {capInFrame ? takeawayEl : null}
          {phone ? null : footHere}
        </div>
        {reserve && measuring ? (
          <div className="scrolly-sizers" ref={sizers} aria-hidden="true" inert>
            <FinalState.Provider value>
              {steps.map((s, i) => (
                <div key={s.id} className="scrolly-graphic-inner">
                  {graphic(i, reduce, sizerCtx)}
                  {/* a sticky phone scene's caption is in its last card */}
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
                {i === lastCard && !capInFrame && !inline && !capAfter ? <div className="scrolly-takeaway-in-step">{takeawayEl}</div> : null}
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
      {capAfter ? <div className="scrolly-takeaway-after">{takeawayEl}</div> : null}
      {sticky && small ? <div className="scrolly-notes" ref={setNotesEl} /> : null}
      {inline ? takeawayEl : null}
      {phone ? footHere : null}
    </div>
    </HighlightCtx.Provider>
    </NotesSlot.Provider>
    </EntryCtx.Provider>
  );
}

// A mark's box as it will be once the figure's running transitions and
// entry animations end (the step's settled geometry): each running
// animation in the figure is moved to its end, the box read, and the
// animation put back where it was, so nothing visible changes.
function settledRect(root, el) {
  const anims = typeof root.getAnimations === 'function' ? root.getAnimations({ subtree: true }).filter((a) => a.playState === 'running' && a.effect) : [];
  const saved = [];
  for (const a of anims) {
    const t = a.effect.getComputedTiming();
    if (!Number.isFinite(t.endTime)) continue;
    saved.push([a, a.currentTime]);
    a.currentTime = t.endTime - 0.01;
  }
  const r = el.getBoundingClientRect();
  for (const [a, t] of saved) a.currentTime = t;
  return r;
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
  window.scrollTo({ top: Math.max(0, r.top + window.scrollY - y), behavior: reduce ? 'instant' : 'smooth' });
}

