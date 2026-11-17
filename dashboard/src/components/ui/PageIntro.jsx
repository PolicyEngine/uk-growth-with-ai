'use client';

import Icon from '@/components/ab/Icon.jsx';

// The opening of every Explore and Method sub-tab, in one fixed order: the
// question the page answers (one line), the answer (a sentence, built from
// the data where it moves with the pickers), then any page-level options.
// The answer may be a sentence (a <p>) or a node such as a list of short
// items (then a <div>, since a list cannot sit inside a paragraph).
// Charts, detail and sources follow in the page body.
export default function PageIntro({ id, icon = 'compass', question, answer, children }) {
  return (
    <header className="page-intro" id={id}>
      <p className="page-q">
        <Icon name={icon} size={18} />
        <span>{question}</span>
      </p>
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
