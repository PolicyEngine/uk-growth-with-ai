'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { mathNodes } from '@/components/ui/MathSym.jsx';

// One row of a model page's "Key settings" (Method redesign, 4.3; M5):
// the setting, what the study uses, what else was run, and a chevron, as
// one button; the row's body (today's section, its wording unchanged) is
// in the DOM, hidden until the row opens. A link to the row, or to any id
// inside its body, sends a bubbling "reveal" (lib/scroll.js revealAnchor),
// which opens the row before the scroll. Rows open independently.
//
// The header is a <button> of spans: the two value columns carry their
// labels inline (shown only where the column heads above the list are
// hidden, at 600px and below). Spaces separate the cells, so copy and
// screen readers do not run them together (label-joins.test).
//   <SettingRow id="m-rules" setting="…" uses="…" also="…">body</SettingRow>
export const SETTING_COLS = ['Setting', 'The study uses', 'Also run'];

export function SettingHeads() {
  return (
    <div className="mx-setting-heads" aria-hidden="true">
      {SETTING_COLS.map((c) => (
        <span key={c}>{c}</span>
      ))}
    </div>
  );
}

export default function SettingRow({ id, setting, uses, also = null, children }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const body = useId();
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const onReveal = () => setOpen(true);
    el.addEventListener('reveal', onReveal);
    return () => el.removeEventListener('reveal', onReveal);
  }, []);
  return (
    <div ref={root} id={id} className={`mx-setting${open ? ' is-open' : ''}`} tabIndex={-1}>
      <button type="button" className="mx-setting-head" aria-expanded={open} aria-controls={body} onClick={() => setOpen((o) => !o)}>
        <span className="mx-setting-name">{setting}</span>{' '}
        <span className="mx-setting-uses">
          <span className="mx-setting-label">{SETTING_COLS[1]}: </span>
          <span className="mx-setting-v">{mathNodes(uses)}</span>
        </span>{' '}
        <span className={`mx-setting-also${also ? '' : ' is-none'}`}>
          {also ? (
            <>
              <span className="mx-setting-label">{SETTING_COLS[2]}: </span>
              <span className="mx-setting-v">{mathNodes(also)}</span>
            </>
          ) : (
            <span className="mx-setting-v">—</span>
          )}
        </span>
        <Icon name="chevronDown" size={18} strokeWidth={2} className="mx-setting-chev" />
      </button>
      <div id={body} className="mx-setting-body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
