'use client';

import { isValidElement } from 'react';
import Disclosure from '@/components/ab/Disclosure.jsx';
import { Items } from '@/components/story/Items.jsx';

// A card's one "More info" (consolidated-design-fable.md §2, slot 8;
// item-36-fable.md §1.1): closed, its button text exactly "More info".
// No preview: item 36 §1.1 and probe 5b; c0-rulings-opus.md ruling 2. It holds every word about a card
// that is not its title, unit, legend or lead: how to read it, how it is
// calculated, its caveats and any source text. The card's book icon
// (SourceLine) keeps the links only.
//
//   <MoreInfo id groups={[{ key, title, items: [{ key, head?, text }] }]} />
//
// The sub-heads come in a fixed order (HEADS); a caller's groups are keyed
// to them (item 17's titles are bold heads on their lines, c0-rulings-opus.md
// ruling 3). Source words are not here: they stay behind the book icon
// with the links (ruling 4). An
// item's `head` is a short bold label before its text ("Measure",
// "Compared with", "Settings", "Period", "Sample", "How it is drawn":
// item 36's rows). The content is marked data-more-info, so the page dumps
// (scripts/dumptabs.mjs) read it while the fold is closed.
export const HEADS = [
  ['read', 'How to read'],
  ['how', 'How it’s calculated'],
  ['caveats', 'Caveats'],
];

// item 36's row labels, in their fixed order within "How to read"
export const ROWS = ['Measure', 'Compared with', 'Settings', 'Period', 'Sample', 'How it is drawn'];

// A group's items from what a card is given: an array of rows ({ head or
// label, text }: plain lines), an array of note items ({ icon, text }: one
// icon-led list, as the card's notes were drawn behind the book icon), or
// any node (an <Items> list, a sentence) as one item.
export function asLines(node, key = 'n') {
  if (node == null || node === false || node === '') return [];
  if (Array.isArray(node)) {
    const xs = node.filter(Boolean);
    if (!xs.length) return [];
    if (xs.every((n) => typeof n === 'object' && !isValidElement(n) && 'text' in n && !(n.head ?? n.label) && n.icon)) return [{ key, text: <Items items={xs} /> }];
    return xs.flatMap((n, i) => (typeof n === 'object' && !isValidElement(n) && 'text' in n ? [{ key: `${key}${n.key ?? i}`, head: n.head ?? n.label, text: n.text }] : asLines(n, `${key}${i}`)));
  }
  return [{ key, text: node }];
}

const inline = (t) => typeof t === 'string' || typeof t === 'number';

function Line({ g, it }) {
  // a <p> only for plain text: a node may hold a list, which a <p> cannot
  const Tag = inline(it.text) ? 'p' : 'div';
  return (
    <Tag className="ex-fin-more-line" data-claim={`${g.key}-${it.key}`}>
      {it.head ? <b>{it.head}</b> : null}
      {it.head ? ' ' : null}
      {it.text}
    </Tag>
  );
}

export default function MoreInfo({ id, groups = [], className = '', children }) {
  const shown = groups.filter((g) => g && g.items?.length);
  if (!shown.length && !children) return null;
  return (
    <div className={`ex-fin-more more-info ${className}`.trim()}>
      <Disclosure inCard id={id} title="More info">
        <div data-more-info="">
          {shown.map((g) => (
            <div key={g.key} className="ex-fin-more-group" data-group={g.key}>
              <p className="ex-fin-more-head">{g.title}</p>
              {g.items.map((it) => (
                <Line key={it.key} g={g} it={it} />
              ))}
            </div>
          ))}
          {children}
        </div>
      </Disclosure>
    </div>
  );
}
