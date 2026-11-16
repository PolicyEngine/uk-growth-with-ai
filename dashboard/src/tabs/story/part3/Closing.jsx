'use client';

import Icon from '@/components/ab/Icon.jsx';
import { useInView, useReducedMotion } from '@/components/story/motion.js';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { D, Ico, PROVISIONAL, SceneHead } from './shared.jsx';
import { PAPER_URL, PR_URL, REPO_URL } from './sources.jsx';

// Step 8, the close of part 3: not sticky, no figures. What the one-year
// test leaves out (docs/story/part3-notes.md, Caveats). Related PolicyEngine
// work, with its figures and the date they were read, is on Method and
// sources > Evidence; the link row below points there.

// Where to read more: the row of links on the "Next" band that ends part 3
// (Part3.jsx), so the part closes with one band rather than a list and a band.
export function CloseLinks() {
  return (
    <>
      <a href={PAPER_URL} target="_blank" rel="noreferrer">
        <Ico c="source" />
        {PROVISIONAL ? 'The draft paper (PDF)' : 'The paper (PDF)'}
      </a>
      <a href={REPO_URL} target="_blank" rel="noreferrer">
        <Ico c="code" />The study and its code: uk-ai-study
      </a>
      <a href={PR_URL} target="_blank" rel="noreferrer">
        <Ico c="code" />Its review: PR #{D.source.pr}
      </a>
      <NavLink tab="explore" sub="households">
        <Ico c="scenario" />Explore: every variant, rule and policy response
      </NavLink>
      <NavLink tab="method" sub="households">
        <Ico c="model" />Method and sources: how the study is made
      </NavLink>
      <NavLink tab="method" sub="studies">
        <Ico c="compare" />Other studies of AI and the UK economy
      </NavLink>
      <NavLink tab="method" sub="studies" anchor="related-work">
        <Ico c="related" />Related PolicyEngine work
      </NavLink>
    </>
  );
}

// Step 8: what the one-year test leaves out, as an icon list. Each item
// shows its icon, label and one line of detail at all times, and a label
// and line together are 12 words or fewer. Items fade and rise in turn,
// 60ms apart, at once under reduced motion.
export const LEFT_OUT = [
  { id: 'reemploy', icon: 'labour', label: 'Re-employment', detail: 'The displaced stay out of work all year' },
  { id: 'partners', icon: 'households', label: 'Partners’ hours', detail: 'Partners do not change how much they work' },
  { id: 'redundancy', icon: 'pay', label: 'Redundancy pay', detail: 'No redundancy payments are counted' },
  { id: 'savings', icon: 'savings', label: 'Running down savings', detail: 'Households do not draw on their savings' },
  { id: 'jsa', icon: 'takeUp', label: 'New-style JSA by default', detail: 'Central case: none for the newly displaced' },
  { id: 'corp', icon: 'tax', label: 'Corporation tax', detail: 'Profits replacing lost wages untaxed; capital rise kept apart' },
  { id: 'young', icon: 'age', label: 'Fewer young hires', detail: 'Reduced hiring lies outside a job-displacement framework' },
  { id: 'self', icon: 'business', label: 'Self-employed', detail: 'Outside the labour-market shocks' },
  { id: 'occ', icon: 'occupations', label: 'Only 9 occupation groups', detail: 'AI exposure varies across nine groups only' },
];

function LeftOutGrid() {
  const [ref, seen] = useInView();
  const reduce = useReducedMotion();
  return (
    <ul ref={ref} className="p3-out-grid" aria-label="What this one-year test leaves out">
      {LEFT_OUT.map((t, i) => (
        <li key={t.id} className={`p3-out-tile reveal${seen || reduce ? ' is-in' : ''}`} style={{ '--reveal-delay': reduce ? '0ms' : `${i * 60}ms` }} data-tile={t.id}>
          <div className="p3-out-btn">
            <Icon name={iconFor(t.icon)} size={22} className="p3-out-icon" />
            <span className="p3-out-label">{t.label}</span>
            <span className="p3-out-detail">{t.detail}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export const CLOSING_SUB = {
  title: 'What the study leaves out',
  icon: 'excluded',
  question: 'What does the study leave out?',
  takeaway: 'Responses such as re-employment, redundancy pay and drawing on savings are outside the test',
};

export default function Closing() {
  return (
    <aside className="p3-close" aria-labelledby="p3-close-h">
      <SceneHead id="p3-close-h" {...CLOSING_SUB} />
      <p className="p3-chip-frame">
        <Ico c="caveat" size={14} /> A one-year stress test, not a forecast
      </p>
      <LeftOutGrid />
    </aside>
  );
}
