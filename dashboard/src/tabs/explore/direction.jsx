'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { side } from '@/tabs/ai/lines.js';

// Direction from a value's sign, never hard-coded: the concept (gapUp,
// gapDown, onPath) an item or arrow shows for a gap against the path. Uses
// the same threshold as the words (lines.js side()), so icon and words agree.
// null for a pending value: no icon.
export const dirConcept = (x) => (x == null ? null : { above: 'gapUp', below: 'gapDown', on: 'onPath' }[side(x)]);

// A small inline arrow beside words or a number. aria-hidden (Icon), so the
// direction must also be in the words next to it. data-dir lets tests read it.
export function Dir({ x }) {
  const c = dirConcept(x);
  if (!c) return null;
  return (
    <span className="ex-dir" data-dir={side(x)}>
      <Icon name={iconFor(c)} size={14} strokeWidth={2} />
    </span>
  );
}

// A plain icon leading a line of text (a card's finding or unit line, a
// table group label): the concept's icon, then the words.
export function Lead({ c, children }) {
  if (children == null || children === '') return null;
  return (
    <>
      <span className="ex-lead">
        <Icon name={iconFor(c)} size={14} />
      </span>
      {children}
    </>
  );
}

// A sentence or two (an "unsolved" note) as items: one per sentence, each
// with the concept's icon, in the plot-sized box the charts leave empty.
export const sentenceItems = (text, c = 'timing') =>
  String(text)
    .replace(/^(.+?) is solved for /, '$1: solved for ')
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .flatMap((t) => t.split(/,\s+(?=or )/))
    .filter(Boolean)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .map((t, i) => ({ key: i, icon: c, text: t }));
