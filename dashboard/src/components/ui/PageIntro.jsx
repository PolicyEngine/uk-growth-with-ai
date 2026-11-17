'use client';

import Icon from '@/components/ab/Icon.jsx';
import AsOf from '@/components/story/AsOf.jsx';

// The opening of every Explore and Method sub-tab, in one fixed order, all
// left-aligned to the content edge: a small model kicker (what this page's
// model can say) with the page's sources-and-notes icon beside it, the
// question the page answers (the only heading, full width, one size, no
// box), the answer (a sentence or a node such as the answer strip, built
// from the data where it moves with the pickers), then any page-level
// options. Charts, detail and sources follow in the page body.
//
// SOURCES: the "As of" stamp (latest ONS and OBR releases and the model
// commit, components/story/AsOf.jsx) and the page's notes (`notes`) belong
// in the sources-and-notes icon, components/ui/SourceLine.jsx
// (<SourceLine items={[…]} />, on perf/sources). Until that is merged, a
// placeholder with the same role is drawn here (PageNotes); swap it for
// SourceLine after the merge.
export function PageNotes({ notes = [] }) {
  return (
    <details className="page-notes">
      <summary aria-label="Sources and notes for this page" title="Sources and notes">
        <Icon name="info" size={16} />
      </summary>
      <div className="page-notes-body">
        <p data-cite="">
          <AsOf inline />
        </p>
        {notes.map((n, i) => (
          <p key={i}>{n}</p>
        ))}
      </div>
    </details>
  );
}

// a page that does not name its model (Evidence, Data and code) reads both
const BOTH = 'Two models: OG-UK, the whole economy; uk-ai-study, households';

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
