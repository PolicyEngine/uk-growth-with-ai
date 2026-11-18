'use client';

import { ARMS, ARM_COLOR } from '@/tabs/ai/surprise.js';

// The per-chart control bar: only the "Versions shown" chips of the
// eight-panel wall and the Debt/GDP and Tax/GDP charts are left (owned by
// later work, item-20-fable.md; every other chooser is the pill). Groups
// sit on one row and wrap; each is labelled. A chosen item is
// shown by fill and border only.
export default function ControlBar({ children, label = 'Chart options' }) {
  return (
    <div className="control-bar" role="group" aria-label={label}>
      {children}
    </div>
  );
}

export function ControlGroup({ label, children, note }) {
  return (
    <div className="control-group">
      <span className="control-label">{label}</span>
      {children}
      {note ? <span className="control-note">{note}</span> : null}
    </div>
  );
}

// Series on or off (aria-pressed): fill = the series colour at 14%, border
// at 55%. `items`: [{ id, label, color, dashed? }]; `shown`: ids in view.
export function SeriesChips({ items, shown, onChange, label }) {
  const toggle = (id) => {
    const next = shown.includes(id) ? shown.filter((x) => x !== id) : [...shown, id];
    onChange(items.map((i) => i.id).filter((x) => next.includes(x)));
  };
  return (
    <div className="chips" role="group" aria-label={label}>
      {items.map((it) => {
        const on = shown.includes(it.id);
        return (
          <button key={it.id} type="button" className={`chip${on ? ' is-on' : ''}`} style={{ '--chip': it.color }} aria-pressed={on} onClick={() => toggle(it.id)}>
            <span className={`chip-swatch${it.dashed ? ' is-dashed' : ''}`} aria-hidden="true" />
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// The versions, as chips
export const ARM_ITEMS = ARMS.map((a) => ({ id: a.id, label: a.short || a.label, color: ARM_COLOR[a.id] }));

export function ArmsGroup({ shown, onChange }) {
  return (
    <ControlGroup label="Versions">
      <SeriesChips items={ARM_ITEMS} shown={shown} onChange={onChange} label="Versions shown" />
    </ControlGroup>
  );
}
