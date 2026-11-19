"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ab/Icon.jsx";
import { iconFor } from "@/lib/concepts.js";

// Hover on every chart (M4, maria-round-brief.md): the one tooltip for a
// chart of separate marks (bars, dumbbells, tiles, rows, ribbons, grid
// cells). A time series uses Crosshair (the same card, a snapping line).
//
//   <ChartHover label="…" items={[{ head, rows: [{ name, value, path?, color?, icon? }], unit?, kind? }]}>
//     …the chart; each mark carries data-tip={i} (its item's index)…
//   </ChartHover>
//
// Input: a pointer over a mark shows its item (the nearest [data-tip]
// under the pointer); a tap shows it and pins it, a tap elsewhere closes it;
// the chart is focusable, and Left/Right (Up/Down) move between items,
// Home/End jump, Escape clears. A visually hidden aria-live line reads the
// item out. Nothing is in the DOM while inactive (the card and the live
// text mount only while a pointer, tap or key is on the chart), so the
// number checks never count it.
// Placement: the mark's box is read once when it becomes the item (no
// per-frame layout); the card sits beside it, flipped to stay inside the
// chart, and is moved by transform only. On a phone the card pins to the
// chart's top edge, clear of the marks under a finger. Values: each row's
// `path` (a dotted path into the active data file) goes on its value as
// data-path, for check_hover.
// `kind`: 'input' ("an assumption we set") or 'result' ("OG-UK works
// out"), item 7's words, as the card's foot.
const KIND = {
  input: "Scenario input: an assumption we set",
  result: "OG-UK result: OG-UK works it out",
};

export function ChartTipCard({
  head,
  rows = [],
  unit,
  kind,
  style,
  className = "",
}) {
  return (
    <div
      className={`ch-tip ch-tip-m ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      {/* a space between every name and value, and between the lines, so
          the card's text never joins two words (push D review, B3); a
          whitespace node is not drawn in the row's grid */}
      {head ? <div className="ch-tip-head">{head}</div> : null}{" "}
      {rows.map((r, k) => (
        <div key={r.key ?? k} className="ch-tip-row">
          {r.color ? (
            <span className="ch-tip-sw" style={{ background: r.color }} />
          ) : (
            <Icon
              name={iconFor(r.icon ?? "path")}
              size={12}
              className="ch-tip-icon"
            />
          )}
          <span className="ch-tip-name">{r.name}</span>{" "}
          <span
            className="ch-tip-value"
            data-path={r.path}
            style={r.text ? { color: r.text } : undefined}
          >
            {r.value}
          </span>{" "}
        </div>
      ))}
      {unit ? <div className="ch-tip-unit">{unit}</div> : null}{" "}
      {kind && KIND[kind] ? (
        <div className="ch-tip-unit">{KIND[kind]}</div>
      ) : null}
    </div>
  );
}

const readout = (it) =>
  it
    ? [it.head, ...(it.rows ?? []).map((r) => `${r.name} ${r.value}`), it.unit]
        .filter(Boolean)
        .join(", ")
    : "";

export default function ChartHover({
  items,
  label,
  className = "",
  children,
  phonePin = true,
  // told the item shown, or null (a crosshair or a linked chart draws from it)
  onActive,
}) {
  const host = useRef(null);
  const [at, setAt] = useState(null);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState(null); // { x, y, left } in host px
  const n = items?.length ?? 0;
  // the mark of item i: its box against the host's, read once
  const place = useCallback(
    (i) => {
      const h = host.current;
      if (!h || i == null) return setPos(null);
      const m = h.querySelector(`[data-tip="${i}"]`);
      const hb = h.getBoundingClientRect();
      if (!m) return setPos({ x: hb.width / 2, y: 0, left: false, top: true });
      const b = m.getBoundingClientRect();
      const cx = b.left + b.width / 2 - hb.left;
      const phone =
        phonePin && window.matchMedia?.("(max-width: 600px)").matches;
      setPos({
        x: phone ? 0 : cx,
        y: phone ? 0 : Math.max(0, b.top - hb.top),
        left: !phone && cx > hb.width / 2,
        top: phone,
        w: b.width,
      });
    },
    [phonePin],
  );
  const show = (i) => {
    setAt(i);
    place(i);
    onActive?.(i);
  };
  const clear = () => {
    setAt(null);
    setPinned(false);
    onActive?.(null);
  };
  // a tap outside a pinned item closes it
  useEffect(() => {
    if (!pinned) return undefined;
    const off = (e) => {
      if (host.current?.contains(e.target)) return;
      setAt(null);
      setPinned(false);
      onActive?.(null);
    };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [pinned, onActive]);
  const markOf = (t) => {
    const el = t instanceof Element ? t.closest("[data-tip]") : null;
    if (!el || !host.current?.contains(el)) return null;
    const i = Number(el.getAttribute("data-tip"));
    return Number.isInteger(i) && i >= 0 && i < n ? i : null;
  };
  const onKey = (e) => {
    if (!n) return;
    if (e.key === "Escape") return clear();
    const cur = at ?? -1;
    const k = {
      ArrowRight: cur + 1,
      ArrowDown: cur + 1,
      ArrowLeft: cur < 0 ? n - 1 : cur - 1,
      ArrowUp: cur < 0 ? n - 1 : cur - 1,
      Home: 0,
      End: n - 1,
    }[e.key];
    if (k == null) return;
    e.preventDefault();
    show(Math.max(0, Math.min(n - 1, k)));
  };
  // a stale index (the items changed under the pointer) shows nothing
  const it = at != null && at < n ? items[at] : null;
  const style = pos
    ? pos.top
      ? { left: 0, top: 0, transform: "translateY(calc(-100% - 6px))" }
      : {
          left: 0,
          top: 0,
          transform: `translate(${pos.left ? `calc(${pos.x - 12}px - 100%)` : `${pos.x + 12}px`}, ${pos.y}px)`,
        }
    : undefined;
  return (
    <div
      ref={host}
      className={`ch-hover ${className}`.trim()}
      tabIndex={0}
      role="group"
      data-chart-focus=""
      aria-label={`${label ?? ""}${label ? ". " : ""}Use the arrow keys to read each value`}
      onKeyDown={onKey}
      onBlur={(e) => {
        if (!pinned && !host.current?.contains(e.relatedTarget)) clear();
      }}
      onPointerMove={(e) => {
        if (e.pointerType === "touch" || pinned) return;
        const i = markOf(e.target);
        if (i !== at) (i == null ? clear : show)(i);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch" && !pinned) clear();
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== "touch") return;
        const i = markOf(e.target);
        if (i == null) return clear();
        show(i);
        setPinned(true);
      }}
    >
      {children}
      {it ? (
        <ChartTipCard
          head={it.head}
          rows={it.rows}
          unit={it.unit}
          kind={it.kind}
          style={style}
          className={`${pos?.top ? "is-top" : ""}${pos?.left ? " is-left-of" : ""}`}
        />
      ) : null}
      <span className="visually-hidden" aria-live="polite">
        {readout(it)}
      </span>
    </div>
  );
}
