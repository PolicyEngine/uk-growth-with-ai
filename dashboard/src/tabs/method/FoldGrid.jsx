'use client';

import { Children, cloneElement, isValidElement } from 'react';
import Disclosure from '@/components/ab/Disclosure.jsx';

// A grid of Method cards with one "Details" fold for the whole grid, not
// one per card (round 1 de-clutter), when two or more cards have detail. Each InfoCard child's `more` moves
// into that fold under the card's title, in order; the cards render
// without their own fold. Anchors inside a moved detail still open it
// (Disclosure's "reveal" event).
//
//   <FoldGrid className="card-grid cols-3">{cards}</FoldGrid>
export default function FoldGrid({ className = '', children }) {
  // a grid with one detail keeps it in its card: a fold under the grid
  // would only add height
  const withMore = Children.toArray(children).filter((c) => isValidElement(c) && c.props.more);
  if (withMore.length < 2) return <div className={className}>{children}</div>;
  const parts = [];
  const cards = Children.map(children, (c) => {
    if (!isValidElement(c) || !c.props.more) return c;
    parts.push({ key: c.key ?? c.props.id ?? c.props.title, title: c.props.title, more: c.props.more });
    return cloneElement(c, { more: null });
  });
  return (
    <>
      <div className={className}>{cards}</div>
      {parts.length ? (
        <div className="mx-foldgrid">
          <Disclosure inCard title="Details" preview={parts.map((p) => p.title).join(' · ')}>
            {parts.map((p) => (
              <div key={p.key} className="info-section">
                <h4>{p.title}</h4>
                <div className="info-card-more">{p.more}</div>
              </div>
            ))}
          </Disclosure>
        </div>
      ) : null}
    </>
  );
}
