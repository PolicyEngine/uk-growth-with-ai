'use client';

import SourceLine from '@/components/ui/SourceLine.jsx';
import { asOfItems } from '@/components/story/AsOf.jsx';

// The opening of every Explore and Method sub-tab, in one fixed order, all
// left-aligned to the content edge: a small model kicker (what this page's
// model can say) with the page's sources-and-notes icon beside it, the
// question the page answers (the only heading, full width, one size, no
// box), the answer (a sentence or a node such as the answer strip, built
// from the data where it moves with the pickers), then any page-level
// options. Charts, detail and sources follow in the page body.
//
// The page's one "Sources and notes" button (components/ui/SourceLine.jsx),
// beside the kicker: the "As of" items (the latest ONS and OBR releases
// read and the model commit, components/story/AsOf.jsx) and the page's
// scope notes (`notes`, e.g. the assumed date of the AI shock).
export function PageNotes({ notes = [] }) {
  return <SourceLine className="page-notes" items={asOfItems()} groups={[{ title: 'Assumptions', notes }]} label="Sources and notes for this page" />;
}

// a page that does not name its model (Evidence, Data and code) reads both
const BOTH = 'Two models: OG-UK, the whole economy; the household study, households';

export default function PageIntro({ id, kicker = BOTH, notes, question, answer, children }) {
  return (
    <header className="page-intro" id={id}>
      <div className="page-kicker-row">
        <p className="page-kicker">{kicker}</p>
        <PageNotes notes={notes} />
      </div>
      <h2 className="page-q">{question}</h2>
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
