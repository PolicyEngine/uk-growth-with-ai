'use client';

import { Ico } from './shared.jsx';

// The end of part 3: not sticky, no figures. What the one-year test leaves
// out (docs/story/part3-notes.md, Caveats), as one plain two-column list of
// short items with dot markers under the scene header. Corporation tax is
// not repeated here: the three-channels scene says, where it matters, that
// dividend tax is counted and corporation tax is not.

// Each item is one short line, 12 words or fewer.
export const LEFT_OUT = [
  {
    id: 'reemploy',
    text: 'Re-employment: the displaced stay out of work all year',
  },
  { id: 'partners', text: 'Partners’ hours: unchanged' },
  { id: 'redundancy', text: 'Redundancy pay: none counted' },
  {
    id: 'savings',
    text: 'Running down savings: households do not draw on them',
  },
  { id: 'jsa', text: 'New-style JSA: none in the central case' },
  {
    id: 'young',
    text: 'Fewer young hires: outside a job-displacement framework',
  },
  { id: 'self', text: 'The self-employed: outside the labour-market shocks' },
  { id: 'occ', text: 'AI exposure: varies across nine occupation groups only' },
];

export const CLOSING_SUB = {
  title: 'What the study leaves out',
  icon: 'excluded',
};

export default function Closing() {
  return (
    <aside className="p3-close" aria-labelledby="p3-close-h" id="q-p3-close">
      <h3 className="p3-close-h" id="p3-close-h">
        <Ico c={CLOSING_SUB.icon} size={16} /> {CLOSING_SUB.title}
      </h3>
      <ul className="p3-out-list" aria-label="What this one-year test leaves out">
        {LEFT_OUT.map((t) => (
          <li key={t.id} data-item={t.id}>
            {t.text}
          </li>
        ))}
      </ul>
    </aside>
  );
}
