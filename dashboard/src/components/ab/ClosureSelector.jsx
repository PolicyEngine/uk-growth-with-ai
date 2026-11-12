'use client';

import Icon from './Icon.jsx';
import { TipTarget } from './Tip.jsx';

// Which capital closure the charts draw: a segmented control, the chosen
// option shown by fill and border only (no tick). One per sub-tab; the page
// keeps it in the URL (&closure=central|closed|both).
export const CLOSURE_OPTIONS = [
  { id: 'central', label: 'Central', math: '(ζK = 0.1)', icon: 'globe' },
  { id: 'closed', label: 'Closed capital', math: '(ζK = 0)', icon: 'lock' },
  { id: 'both', label: 'Both', math: '', icon: null },
];

export default function ClosureSelector({ value, onChange, onMore }) {
  return (
    <div className="closure-select">
      <span className="closure-select-label">Closure</span>
      <div className="seg" role="radiogroup" aria-label="Capital closure shown on the charts">
        {CLOSURE_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className={`seg-option${value === o.id ? ' is-on' : ''}`}
            onClick={() => onChange(o.id)}
          >
            {o.icon ? <Icon name={o.icon} size={13} /> : null}
            <span>{o.label}</span>
            {o.math ? <span className="seg-math">{o.math}</span> : null}
          </button>
        ))}
      </div>
      <TipTarget
        className="whats-this"
        label="What is a closure?"
        tip={
          <>
            <b>Capital closure</b>
            <span>
              Central: some new capital is foreign-owned (ζK = 0.1). Closed capital: none is (ζK = 0). Both: solid central,
              dashed closed capital.
            </span>
            <span className="tip-sub">Click for Closures and terms</span>
          </>
        }
        onActivate={onMore}
      >
        What&rsquo;s this?
      </TipTarget>
    </div>
  );
}
