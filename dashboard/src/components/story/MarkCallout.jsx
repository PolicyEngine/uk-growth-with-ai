'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// A step's sentence anchored to its mark (Scrolly step `callout`, opt-in):
// drawn inside the figure card next to the mark the step highlights
// (`anchor`, else the first `highlight` id), with a thin leader line. It
// measures the mark's box and its own, and takes the first place among
// right, left, above, below (then the corner furthest from the mark) that
// stays inside the card and does not cover the mark. The same on phones
// (an overlay on the chart). aria-hidden and data-axis: the sentence is
// the card's (a restatement, for sighted readers tracing text to plot).
// Hidden when the mark is not in this state of the figure.
//
//   step: { id, title, body, highlight: ['uk_high'], callout: 'UK high ends 0.9% above the path' }
//   step: { …, callout: true }   (the step's title as the sentence)
//   step: { …, anchor: 'gap-2030', callout: true }
const GAP = 14;
const PAD = 6;
export default function MarkCallout({ rootRef, anchor, text, stepKey }) {
  const ref = useRef(null);
  const [pos, setPos0] = useState(null);
  // only a real change re-renders (placement runs after every render)
  const setPos = (p) => setPos0((q) => (JSON.stringify(q) === JSON.stringify(p) ? q : p));
  const place = () => {
    const root = rootRef.current;
    const box = ref.current;
    if (!root || !box || !anchor) return;
    const mark = root.querySelector(`[data-mark~="${CSS.escape(anchor)}"]`);
    const m0 = mark?.getBoundingClientRect();
    if (!m0 || (!m0.width && !m0.height)) {
      setPos(null);
      return;
    }
    const R = root.getBoundingClientRect();
    const m = { l: m0.left - R.left, t: m0.top - R.top, r: m0.right - R.left, b: m0.bottom - R.top };
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    const W = R.width;
    const H = R.height;
    const cy = (m.t + m.b) / 2;
    const cx = (m.l + m.r) / 2;
    const clampY = (y) => Math.max(PAD, Math.min(H - h - PAD, y));
    const clampX = (x) => Math.max(PAD, Math.min(W - w - PAD, x));
    const cands = [
      { side: 'right', x: m.r + GAP, y: clampY(cy - h / 2) },
      { side: 'left', x: m.l - GAP - w, y: clampY(cy - h / 2) },
      { side: 'above', x: clampX(cx - w / 2), y: m.t - GAP - h },
      { side: 'below', x: clampX(cx - w / 2), y: m.b + GAP },
    ];
    const fits = (c) => c.x >= PAD && c.y >= PAD && c.x + w <= W - PAD && c.y + h <= H - PAD;
    const covers = (c) => !(c.x + w <= m.l || c.x >= m.r || c.y + h <= m.t || c.y >= m.b);
    let c = cands.find((k) => fits(k) && !covers(k));
    if (!c) {
      // the corner furthest from the mark
      const far = (k) => Math.hypot(k.x + w / 2 - cx, k.y + h / 2 - cy);
      c = [
        { side: 'corner', x: PAD, y: PAD },
        { side: 'corner', x: W - w - PAD, y: PAD },
        { side: 'corner', x: PAD, y: H - h - PAD },
        { side: 'corner', x: W - w - PAD, y: H - h - PAD },
      ].sort((a, b) => far(b) - far(a))[0];
    }
    // the leader: from the callout's nearest edge point to the mark's
    const nx = Math.max(c.x, Math.min(c.x + w, cx));
    const ny = Math.max(c.y, Math.min(c.y + h, cy));
    const tx = Math.max(m.l, Math.min(m.r, nx));
    const ty = Math.max(m.t, Math.min(m.b, ny));
    setPos({ x: Math.round(c.x), y: Math.round(c.y), side: c.side, line: [nx, ny, tx, ty].map(Math.round), W: Math.round(W), H: Math.round(H) });
  };
  const placeRef = useRef(place);
  // after every render of the block (step and pointer changes re-render it)
  useIso(() => {
    placeRef.current = place;
    place();
  });
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const on = () => placeRef.current();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(on);
    ro?.observe(root);
    window.addEventListener('resize', on);
    // marks that move in (entry transitions) settle after a beat
    const t = setTimeout(on, 650);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', on);
      clearTimeout(t);
    };
  }, [rootRef, stepKey]);
  if (!anchor || !text) return null;
  return (
    <>
      {pos ? (
        <svg className="mark-callout-leader" width={pos.W} height={pos.H} aria-hidden="true" focusable="false" data-axis="">
          <line x1={pos.line[0]} y1={pos.line[1]} x2={pos.line[2]} y2={pos.line[3]} />
          <circle cx={pos.line[2]} cy={pos.line[3]} r={2.5} />
        </svg>
      ) : null}
      <div
        ref={ref}
        key={stepKey}
        className={`mark-callout${pos ? ` is-placed is-${pos.side}` : ''}`}
        style={pos ? { left: pos.x, top: pos.y } : undefined}
        aria-hidden="true"
        data-axis=""
      >
        {text}
      </div>
    </>
  );
}
