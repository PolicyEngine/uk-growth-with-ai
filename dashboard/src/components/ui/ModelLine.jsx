'use client';

import { Fragment, useLayoutEffect, useRef } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { MODELS } from '@/components/story/chart/ModelBadge.jsx';
import { MODEL_YEAR } from '@/tabs/story/part3/shared.jsx';

// The model line (consolidated-design-fable.md §2, slot 2; item-22-fable.md):
// which model a page or card is from, as text, not a button. It sits in the
// model row under a page title, and under a card title only where the
// card's model or settings differ from the page's; a card's own chooser
// (the pill) follows it on the same row (Card.jsx).
//
//   <ModelLine />                   the household study, its model and year
//   <ModelLine link />              on Explore: the first segment links to
//                                   the household method, and the line adds
//                                   that the OG-UK settings do not apply
//   <ModelLine model="oguk" />      a model badge's name (ModelBadge.jsx's
//                                   MODELS), as one plain segment
//   <ModelLine model="oguk" settings={['Some foreign capital', 'main version']} />
//                                   and the card's own settings after it
//
// Segments are separated by a middle dot drawn in CSS, and the text keeps a
// space between them, so copied text and screen readers never join two
// segments (review round 1, R1-21). A segment that starts a line carries no
// dot before it.
// The scope note on Explore > Households: a quiet outlined tag, not a chip
// (Households redesign, R1; check_pill still reads it as the fourth
// segment).
export const SCOPE_NOTE = 'Macro model settings don’t apply';
export function modelSegments(model = 'aistudy', link = false) {
  if (model !== 'aistudy') return [MODELS[model]?.label ?? model];
  return [
    link ? (
      <NavLink tab="method" sub="households">
        Household study
      </NavLink>
    ) : (
      'Household study'
    ),
    'PolicyEngine UK',
    MODEL_YEAR,
    link ? SCOPE_NOTE : null,
  ].filter(Boolean);
}

export default function ModelLine({ model = 'aistudy', link = false, settings = [], className = '' }) {
  // a card's settings where they differ from the page's, after the model
  // (c0-rulings-opus.md ruling 5)
  const segs = [...modelSegments(model, link), ...settings.filter(Boolean)];
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const mark = () => {
      const all = [...el.querySelectorAll('.model-line-seg')];
      all.forEach((x, i) => x.classList.toggle('is-line-start', i > 0 && x.offsetTop > all[i - 1].offsetTop + 2));
    };
    mark();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(mark);
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  return (
    <p className={`model-line ${className}`.trim()} ref={ref} data-model={model}>
      <Icon name={iconFor(model === 'aistudy' ? 'households' : 'model')} size={16} />
      {segs.map((x, i) =>
        x === SCOPE_NOTE ? (
          // the space sits outside the tag, so the outline holds the words only
          <Fragment key={i}>
            {' '}
            <span className="model-line-seg is-scope">{x}</span>
          </Fragment>
        ) : (
          <span key={i} className="model-line-seg">
            {i ? ' ' : null}
            {x}
          </span>
        ),
      )}
    </p>
  );
}
