'use client';

import Icon from '@/components/ab/Icon.jsx';

// The opening of every Explore and Method sub-tab, in one fixed order: the
// question the page answers (one line), the answer (a sentence, built from
// the data where it moves with the pickers), then any page-level options.
// Charts, detail and sources follow in the page body.
export default function PageIntro({ id, icon = 'compass', question, answer, children }) {
  return (
    <header className="page-intro" id={id}>
      <p className="page-q">
        <Icon name={icon} size={18} />
        <span>{question}</span>
      </p>
      {answer ? <p className="page-a" aria-live="polite">{answer}</p> : null}
      {children ? <div className="page-options">{children}</div> : null}
    </header>
  );
}
