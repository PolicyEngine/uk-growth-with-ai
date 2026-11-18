'use client';

import { useLayoutEffect, useRef } from 'react';
import SourceLine from '@/components/ui/SourceLine.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { asOfItems } from '@/components/story/AsOf.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { MODEL_YEAR } from '@/tabs/story/part3/shared.jsx';

// The opening of every Explore and Method sub-tab, in one fixed order, all
// left-aligned to the content edge (item-22-fable.md): the question the
// page answers (the only heading, full width, one size, no box) with the
// page's sources-and-notes icon at the end of its line; then the model row
// (`row`: on an OG-UK page the settings pill and a scope note, on a
// household-study page the model line; none on a page with no settings
// whose title names its model); then the answer (a sentence or a node such
// as the answer strip, built from the data where it moves with the
// pickers), then any page-level options. Nothing sits above the title.
//
// The page's one "Sources and notes" button (components/ui/SourceLine.jsx):
// the "As of" items (the latest ONS and OBR releases read and the model
// commit, components/story/AsOf.jsx), the page's scope notes (`notes`, e.g.
// the assumed date of the AI shock) and any extra groups (`groups`).
export function PageNotes({ notes = [], groups = [], items = [] }) {
  return <SourceLine className="page-notes" items={[...items, ...asOfItems()]} groups={[...(notes.length ? [{ title: 'Assumptions', notes }] : []), ...groups]} label="Sources and notes for this page" />;
}

export default function PageIntro({ id, row, notes, question, answer, children }) {
  return (
    <header className="page-intro" id={id}>
      <h2 className="page-q">
        <span>{question}</span>
        <PageNotes notes={notes} />
      </h2>
      {row ? <div className="model-row">{row}</div> : null}
      {answer == null || answer === '' ? null : typeof answer === 'string' ? (
        <p className="page-a" aria-live="polite">
          {answer}
        </p>
      ) : (
        <div className="page-a is-items" aria-live="polite">
          {answer}
        </div>
      )}
      {children ? <div className="page-options">{children}</div> : null}
    </header>
  );
}

// A household-study page's model row (item-22-fable.md): the model and its
// year, as text, not a button. On Explore > Households the first segment
// links to the household method and the line adds that the OG-UK settings
// do not apply; on the method page itself it is plain text.
export function ModelLine({ link = false }) {
  const segs = [
    link ? (
      <NavLink tab="method" sub="households">
        Household study
      </NavLink>
    ) : (
      'Household study'
    ),
    'PolicyEngine UK',
    MODEL_YEAR,
    link ? 'OG-UK settings don’t apply' : null,
  ].filter(Boolean);
  // a segment that starts a line carries no separator before it
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const mark = () => {
      const segs = [...el.querySelectorAll('.model-line-seg')];
      segs.forEach((x, i) => x.classList.toggle('is-line-start', i > 0 && x.offsetTop > segs[i - 1].offsetTop + 2));
    };
    mark();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(mark);
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  return (
    <p className="model-line" ref={ref}>
      <Icon name={iconFor('households')} size={16} />
      {segs.map((x, i) => (
        <span key={i} className="model-line-seg">
          {x}
        </span>
      ))}
    </p>
  );
}
