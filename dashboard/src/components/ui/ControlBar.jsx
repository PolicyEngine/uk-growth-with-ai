'use client';

import Icon from '@/components/ab/Icon.jsx';
import { RULES } from '@/lib/labels.js';
import { ARMS, ARM_COLOR } from '@/tabs/ai/surprise.js';

// The per-chart control bar: the same component, names and options on every
// chart. Groups sit on one row and wrap; each is labelled. A chosen item is
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

// One of several (radio group). A disabled option stays in view with its
// reason ("Not yet solved").
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segments" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={o.disabled}
          className={`segment${value === o.id ? ' is-checked' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.icon ? <Icon name={o.icon} size={14} /> : null}
          <span>{o.short ?? o.label}</span>
          {o.disabled && o.note ? <span className="segment-note">{o.note}</span> : null}
        </button>
      ))}
    </div>
  );
}

// The two groups every results chart can carry, so their names and options
// are the same wherever they appear.
export const ARM_ITEMS = ARMS.map((a) => ({ id: a.id, label: a.short || a.label, color: ARM_COLOR[a.id] }));

export function ArmsGroup({ shown, onChange }) {
  return (
    <ControlGroup label="Arms">
      <SeriesChips items={ARM_ITEMS} shown={shown} onChange={onChange} label="Arms shown" />
    </ControlGroup>
  );
}

// `only`: the rule ids this chart has ('common', 'fixed', 'dn')
export function RuleGroup({ value, onChange, only = ['common', 'fixed', 'dn'] }) {
  return (
    <ControlGroup label="Fiscal rule">
      <Segmented options={RULES.filter((r) => only.includes(r.id))} value={value} onChange={onChange} label="Fiscal rule" />
    </ControlGroup>
  );
}
