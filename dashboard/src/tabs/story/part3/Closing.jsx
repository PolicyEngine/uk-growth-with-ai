'use client';

import { TopicHead } from '@/components/story/QStage.jsx';

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
  { id: 'jsa', text: 'New-style Jobseeker’s Allowance (JSA): none in the central case' },
  {
    id: 'young',
    text: 'Fewer young hires: the study counts jobs lost, not jobs never offered',
  },
  { id: 'self', text: 'The self-employed: the shocks apply to employees only' },
  { id: 'occ', text: 'AI exposure: varies across nine occupation groups only' },
];

// A level-(b) topic header (typography spec): the question, the list in a
// framed card under it.
export const CLOSING_SUB = {
  title: 'What the study leaves out',
  question: 'What does the study leave out?',
};

export default function Closing() {
  return (
    <aside className="p3-close" aria-labelledby="p3-close-h">
      <TopicHead id="p3-close" sub={CLOSING_SUB} titleId="p3-close-h" />
      <div className="story-frame p3-close-card">
        <ul className="p3-out-list" aria-label="What this one-year test leaves out">
          {LEFT_OUT.map((t) => (
            <li key={t.id} data-item={t.id}>
              {t.text}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
