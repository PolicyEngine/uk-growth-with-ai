'use client';

import { createContext, useContext, useEffect, useId, useLayoutEffect, useMemo, useState } from 'react';

// The text-to-plot link (Vahid: "someone cannot trace the text between the
// plots"). One step, one highlight: a Scrolly step names the marks it is
// about (`highlight: ['uk_high', 'gap-2030']`), the figure's marks opt in
// with `data-mark="<id>"`, and while that step is active the named marks
// show at full strength and every other `[data-mark]` in the figure dims
// to 25% (CSS in story.css on `[data-hl]`). Words and numbers in the text
// point at marks too: hovering or focusing a <Key>, <Fig> or <Num> lights
// its mark; hovering a mark underlines its words.
//
//   step:   { id, title, body, highlight: ['uk_high'] }      (or highlight: 'none', highlightWhy: 'text only')
//   figure: <path data-mark="uk_high" … />                    ctx.highlight / useHighlight() → ['uk_high']
//   marks:  <MarkProvider marks={{ uk_high: { color: 'var(--chart-1)', shape: 'circle', label: 'UK high' } }}>
//   words:  <Key id="uk_high">UK high</Key>                   colour + shape, hover/focus lights the mark
//   number: <Fig path="gdp.uk_high.2030" mark="uk_high">+0.92%</Fig>
//   marker: <Num n={1} /> in text, <NumMark n={1} x={…} y={…} /> in the SVG
//
// Outside a Scrolly (no provider) each piece renders as plain styled text.

// The mark registry: id → { color, shape: 'circle' | 'square' | 'triangle' |
// 'line' | 'none', label }. Supplied by the part (series colours live with
// the figures, not here); nested providers merge.
const Marks = createContext({});
export function MarkProvider({ marks, children }) {
  const up = useContext(Marks);
  const value = useMemo(() => ({ ...up, ...marks }), [up, marks]);
  return <Marks.Provider value={value}>{children}</Marks.Provider>;
}
export const useMarks = () => useContext(Marks);

// One Scrolly block's highlight state: the active step's ids, and the id a
// reader is pointing at (a word, a chip or a mark). Scrolly provides it.
export const HighlightCtx = createContext(null);
const NONE = [];
// The ids lit in the figure now: the pointed-at id while one is, else the
// active step's.
export function useHighlight() {
  const h = useContext(HighlightCtx);
  if (!h) return NONE;
  return h.point ? [h.point] : h.ids;
}
export function usePoint() {
  return useContext(HighlightCtx)?.point ?? null;
}

// Scrolly's side of it: state for the pointed-at id, normalised step ids.
export function useHighlightState(stepHighlight) {
  const [point, setPoint] = useState(null);
  const ids = useMemo(() => normIds(stepHighlight), [stepHighlight]);
  return useMemo(() => ({ ids, point, setPoint }), [ids, point]);
}
export function normIds(h) {
  if (!h || h === 'none') return NONE;
  return Array.isArray(h) ? h.filter(Boolean) : [h];
}

const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;
// Apply the lit ids to a figure root: data-hl on the root (only while some
// id is lit), data-on on each matching [data-mark], and hovering a mark sets
// the pointed-at id (which underlines the words keyed to it).
// Runs after every render of the owner (a figure that changes its marks
// re-renders with it); `deps` is accepted for older callers.
// eslint-disable-next-line no-unused-vars
export function useApplyHighlight(rootRef, state, deps) {
  const lit = state ? (state.point ? [state.point] : state.ids) : NONE;
  const key = lit.join(' ');
  useIso(() => {
    const root = rootRef.current;
    if (!root) return;
    const set = new Set(lit);
    let any = false;
    root.querySelectorAll('[data-mark]').forEach((el) => {
      const on = el.dataset.mark.split(/\s+/).some((m) => set.has(m));
      if (on) {
        any = true;
        el.setAttribute('data-on', '');
      } else el.removeAttribute('data-on');
    });
    // nothing in this figure carries the id: no dimming at all
    if (set.size && any) root.setAttribute('data-hl', key);
    else root.removeAttribute('data-hl');
  });
  const setPoint = state?.setPoint;
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !setPoint) return undefined;
    const over = (e) => {
      const m = e.target.closest?.('[data-mark]');
      if (m && root.contains(m)) setPoint(m.dataset.mark.split(/\s+/)[0]);
    };
    const out = (e) => {
      const m = e.target.closest?.('[data-mark]');
      if (m && !(e.relatedTarget && m.contains(e.relatedTarget))) setPoint(null);
    };
    root.addEventListener('pointerover', over);
    root.addEventListener('pointerout', out);
    return () => {
      root.removeEventListener('pointerover', over);
      root.removeEventListener('pointerout', out);
    };
  }, [rootRef, setPoint]);
}

// The label of the lit ids, for the figure's aria description.
export function useHighlightLabel(state) {
  const marks = useMarks();
  if (!state) return '';
  const lit = state.point ? [state.point] : state.ids;
  if (!lit.length) return '';
  // labelled marks only (round 2, review 3 B12): an id with no label in
  // the MarkProvider is an internal key, never read out
  const names = lit.map((id) => marks[id]?.label).filter(Boolean);
  return names.length ? `Highlighted: ${names.join(', ')}` : '';
}

// Pointer and focus handlers that light `id` while hovered or focused (tap
// toggles on touch).
function usePointHandlers(id) {
  const h = useContext(HighlightCtx);
  if (!h || !id) return {};
  const on = () => h.setPoint(id);
  const off = () => h.setPoint((p) => (p === id ? null : p));
  return {
    onPointerEnter: on,
    onPointerLeave: off,
    onFocus: on,
    onBlur: off,
    onClick: () => h.setPoint((p) => (p === id ? null : id)),
  };
}

// A small marker shape in the series colour (colour is never the only cue).
export function MarkShape({ shape = 'circle', color, size = 10, className = '' }) {
  if (shape === 'none') return null;
  const s = size;
  const c = color ?? 'currentColor';
  const body =
    shape === 'square' ? (
      <rect x={1} y={1} width={s - 2} height={s - 2} fill={c} />
    ) : shape === 'triangle' ? (
      <path d={`M${s / 2} 1 L${s - 1} ${s - 1} L1 ${s - 1} Z`} fill={c} />
    ) : shape === 'line' ? (
      <rect x={0} y={s / 2 - 1.5} width={s} height={3} rx={1.5} fill={c} />
    ) : shape === 'diamond' ? (
      <path d={`M${s / 2} 0.5 L${s - 0.5} ${s / 2} L${s / 2} ${s - 0.5} L0.5 ${s / 2} Z`} fill={c} />
    ) : (
      <circle cx={s / 2} cy={s / 2} r={s / 2 - 1} fill={c} />
    );
  return (
    <svg className={`mark-shape ${className}`.trim()} width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true" focusable="false">
      {body}
    </svg>
  );
}

// A colour-keyed word: the series colour and its marker shape before the
// word; hovering or focusing it lights the mark. Underlined while the
// mark itself is hovered.
export function Key({ id, children, shape, color, className = '' }) {
  const m = useMarks()[id] ?? {};
  const point = usePoint();
  const handlers = usePointHandlers(id);
  const live = Object.keys(handlers).length > 0;
  return (
    <span
      className={`hl-key${point === id ? ' is-pointed' : ''} ${className}`.trim()}
      data-key={id}
      style={{ '--key-c': color ?? m.color }}
      tabIndex={live ? 0 : undefined}
      {...handlers}
    >
      <MarkShape shape={shape ?? m.shape ?? 'circle'} color={color ?? m.color} />
      <span className="hl-key-text">{children}</span>
    </span>
  );
}

// A number as a chip: hover, focus or tap pulses its mark. `path` names the
// figure's data path (data-path), for the number checks and for readers.
export function Fig({ path, mark, children, className = '' }) {
  const point = usePoint();
  const handlers = usePointHandlers(mark);
  const live = Object.keys(handlers).length > 0;
  return (
    <span
      className={`hl-fig${mark && point === mark ? ' is-pointed' : ''} ${className}`.trim()}
      data-path={path}
      data-fig-mark={mark}
      tabIndex={live ? 0 : undefined}
      {...handlers}
    >
      {children}
    </span>
  );
}

// A numbered marker in text, matching <NumMark n> on the chart; it lights
// the marker's mark (`num-<n>`, or `mark`).
export function Num({ n, mark, label }) {
  const id = mark ?? `num-${n}`;
  const point = usePoint();
  const handlers = usePointHandlers(id);
  const live = Object.keys(handlers).length > 0;
  return (
    <span
      className={`hl-num${point === id ? ' is-pointed' : ''}`}
      data-axis=""
      role={live ? 'button' : undefined}
      aria-label={label ?? `Marker ${n} on the chart`}
      tabIndex={live ? 0 : undefined}
      {...handlers}
    >
      {n}
    </span>
  );
}

// The chart side: a numbered disc at (x, y) in SVG units. data-mark is
// `num-<n>` (plus `mark`, so a step highlighting the series lights it too).
export function NumMark({ n, x, y, r = 9, mark }) {
  return (
    <g className="hl-nummark" data-mark={mark ? `num-${n} ${mark}` : `num-${n}`} data-axis="" transform={`translate(${x} ${y})`} aria-hidden="true">
      <circle r={r} />
      <text dy="0.35em" textAnchor="middle">
        {n}
      </text>
    </g>
  );
}

// The aria description for a figure: { id, node } (Scrolly renders node and
// points aria-describedby at id).
export function useHighlightDescription(state) {
  const id = useId();
  const text = useHighlightLabel(state);
  const marks = useMarks();
  // the lit ids with no label, for the checks (never read out)
  const lit = state ? (state.point ? [state.point] : state.ids) : [];
  const bare = lit.filter((m) => !marks[m]?.label).join(' ');
  return {
    id,
    node:
      text || bare ? (
        <span id={id} className="visually-hidden" data-axis="" data-unlabelled={bare || undefined}>
          {text}
        </span>
      ) : null,
  };
}

// For tests: the cards (non-spacer Scrolly steps) in `root` with no
// `highlight` (data-highlight absent). A step that opts out says
// highlight: 'none' and gives highlightWhy.
export function stepsWithoutHighlight(root) {
  return [...root.querySelectorAll('.scrolly-step:not(.is-spacer)')]
    .filter((li) => {
      const h = li.getAttribute('data-highlight');
      if (!h) return true;
      return h === 'none' && !li.getAttribute('data-highlight-why');
    })
    .map((li) => li.id);
}
