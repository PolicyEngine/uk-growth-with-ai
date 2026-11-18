'use client';

import { hy } from '@/components/story/Hy.jsx';
import { useEntry, useSnap } from '@/components/story/motion.js';
import { NavLink } from '@/lib/nav.jsx';

// The end of part 3: not sticky, no figures. What the one-year test leaves
// out (paper discussion.tex and results.tex; Method > Household method,
// #hm-out, has the full list), as one plain two-column table in three
// groups: what is left out, and what the study assumes in its place (item
// 33). No tint, no icons, no kicker: the lead says why the list matters.
// Corporation tax is not repeated here: the three-channels scene says, where
// it matters, that dividend tax is counted and corporation tax is not.
// Re-employment's home is this list (Two lenses names only the years after
// the first). The groups fade in in turn as the table enters (useEntry,
// reversible; final on a jump; static under reduced motion).
export const OUT_GROUPS = [
  { id: 'respond', title: 'How people respond' },
  { id: 'pay', title: 'Payments' },
  { id: 'cover', title: 'Who is covered' },
];

// `text` keeps the whole row as one line (16 words or fewer) for tests.
export const LEFT_OUT = [
  { id: 'reemploy', group: 'respond', left: 'Finding another job', assumes: 'Everyone who loses a job stays out of work all year' },
  { id: 'partners', group: 'respond', left: 'Partners working more', assumes: 'Partners’ hours do not change' },
  { id: 'savings', group: 'respond', left: 'Drawing on savings', assumes: 'No household runs down its savings' },
  { id: 'redundancy', group: 'pay', left: 'Redundancy pay', assumes: 'None is paid' },
  // reported awards are paid; only the newly jobless get none (discussion.tex:14)
  { id: 'jsa', group: 'pay', left: 'New-style Jobseeker’s Allowance for the newly jobless', assumes: 'Paid only where the survey already records it' },
  { id: 'young', group: 'cover', left: 'Fewer young people hired', assumes: 'Only existing jobs are lost, not jobs never offered' },
  { id: 'self', group: 'cover', left: 'The self-employed', assumes: 'Job loss and pay changes apply to employees only' },
  { id: 'occ', group: 'cover', left: 'Differences within an occupation group', assumes: 'AI exposure is one score for each of nine groups' },
].map((t) => ({ ...t, text: `${t.left}: ${t.assumes}` }));

// A level-(b) topic header (item 1).
export const CLOSING_SUB = {
  title: 'What this one-year test leaves out',
};

export default function Closing() {
  const [ref, entry] = useEntry({ line: 0.85 });
  const snap = useSnap(ref, entry);
  return (
    <aside className="p3-close" aria-labelledby="p3-close-h">
      <header className="scene-head topic-head p3-close-head" data-scene={CLOSING_SUB.title} id="q-p3-close">
        <h3 className="scene-head-q" id="p3-close-h">
          {hy(CLOSING_SUB.title)}
        </h3>
      </header>
      <div ref={ref} className={`p3-close-card${entry.entered ? ' is-in' : ''}${snap ? ' is-snap' : ''}`}>
        <p className="p3-close-lead">
          The household study leaves these out, so its results show the first year after the assumed job loss, before households or employers respond: a test, not a forecast.
        </p>
        <table className="p3-out">
          <caption className="visually-hidden">{CLOSING_SUB.title}</caption>
          <thead>
            <tr>
              <th scope="col">Left out</th>
              <th scope="col">What the study assumes</th>
            </tr>
          </thead>
          {OUT_GROUPS.map((g, i) => (
            <tbody key={g.id} data-group={g.id} style={{ '--i': i }}>
              <tr className="p3-out-group">
                <th scope="rowgroup" colSpan={2}>
                  {g.title}
                </th>
              </tr>
              {LEFT_OUT.filter((t) => t.group === g.id).map((t) => (
                <tr key={t.id} data-item={t.id}>
                  <th scope="row" className="p3-out-left">
                    {t.left}
                  </th>
                  <td className="p3-out-assumes">{t.assumes}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
        <p className="p3-close-foot">
          With full take-up and Jobseeker’s Allowance:{' '}
          <NavLink tab="explore" sub="households" anchor="hh-ladder">
            Explore, households
          </NavLink>
          . Every limit:{' '}
          <NavLink tab="method" sub="households" anchor="hm-out">
            Household method
          </NavLink>
          .
        </p>
      </div>
    </aside>
  );
}
