'use client';

import Icon from '@/components/ab/Icon.jsx';
import { hy } from '@/components/story/Hy.jsx';
import { useEntry, useSnap } from '@/components/story/motion.js';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';

// After part 3, its own section (StoryTab, push D Q4: a full-width band
// between part 3 and the bridge to part 4, with a section-level h2): not
// sticky, no figures. What the one-year test leaves
// out (paper discussion.tex and results.tex; Method > Household method,
// #hm-out, has the full list), in three labelled groups, each a small
// section (an h4 with one plain icon, then a list of what is left out and
// what the study assumes in its place; item 33, item dc-B). The title is
// said once, by the heading. Centred on the column; no tint, no box, no
// kicker: the lead says why the list matters.
// Corporation tax is not repeated here: the three-channels scene says, where
// it matters, that dividend tax is counted and corporation tax is not.
// Re-employment's home is this list (Two lenses names only the years after
// the first). The groups fade in in turn as the list enters (useEntry,
// reversible; final on a jump; static under reduced motion). One "See
// also" line carries the two links onward.
export const OUT_GROUPS = [
  { id: 'respond', title: 'How people respond', icon: 'households' },
  { id: 'pay', title: 'Payments', icon: 'benefits' },
  { id: 'cover', title: 'Who is covered', icon: 'labour' },
];

// `text` keeps the whole row as one line (16 words or fewer) for tests.
export const LEFT_OUT = [
  { id: 'reemploy', group: 'respond', left: 'Finding another job', assumes: 'Everyone who loses a job stays out of work all year' },
  { id: 'partners', group: 'respond', left: 'Partners working more', assumes: 'Partners’ hours do not change' },
  { id: 'savings', group: 'respond', left: 'Drawing on savings', assumes: 'No household runs down its savings' },
  { id: 'redundancy', group: 'pay', left: 'Redundancy pay', assumes: 'None is paid' },
  // reported awards are paid; only the newly jobless get none (discussion.tex:14)
  { id: 'jsa', group: 'pay', left: 'New-style Jobseeker’s Allowance', assumes: 'Paid only where the survey already records it' },
  { id: 'young', group: 'cover', left: 'Fewer young people hired', assumes: 'Only existing jobs are lost, not jobs never offered' },
  { id: 'self', group: 'cover', left: 'The self-employed', assumes: 'Job loss and pay changes apply to employees only' },
  { id: 'occ', group: 'cover', left: 'Differences within each job group', assumes: 'AI exposure is one score for each of nine groups' },
].map((t) => ({ ...t, text: `${t.left}: ${t.assumes}` }));

// A level-(b) topic header (item 1).
export const CLOSING_SUB = {
  title: 'What this one-year test leaves out',
};

export default function Closing() {
  const [ref, entry] = useEntry({ line: 0.85 });
  const snap = useSnap(ref, entry);
  return (
    <div className="p3-close">
      <header className="scene-head topic-head p3-close-head" data-scene={CLOSING_SUB.title} id="q-p3-close">
        <h2 className="scene-head-q" id="p3-close-h">
          {hy(CLOSING_SUB.title)}
        </h2>
      </header>
      <div ref={ref} className={`p3-close-card${entry.entered ? ' is-in' : ''}${snap ? ' is-snap' : ''}`}>
        <p className="p3-close-lead">
          Leaving these out, the household study shows the first year after the assumed job loss, before households or employers respond: a test, not a forecast.
        </p>
        <div className="p3-out" role="group" aria-labelledby="p3-close-h">
          <div className="p3-out-heads">
            <span>Left out</span>
            <span>What the study assumes</span>
          </div>
          {OUT_GROUPS.map((g, i) => (
            <section key={g.id} className="p3-out-group" data-group={g.id} aria-labelledby={`p3-out-${g.id}`} style={{ '--i': i }}>
              <h4 className="p3-out-group-h" id={`p3-out-${g.id}`}>
                <Icon name={iconFor(g.icon)} size={16} />
                {g.title}
              </h4>
              <dl className="p3-out-rows">
                {LEFT_OUT.filter((t) => t.group === g.id).map((t) => (
                  <div key={t.id} className="p3-out-row" data-item={t.id}>
                    <dt className="p3-out-left">{t.left}</dt>
                    <dd className="p3-out-assumes">{t.assumes}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <p className="p3-close-foot">
          <span className="p3-close-see">See also:</span>{' '}
          <NavLink tab="explore" sub="households" anchor="hh-ladder">
            Explore, households
          </NavLink>
          , with full take-up and Jobseeker’s Allowance;{' '}
          <NavLink tab="method" sub="households" anchor="hm-out">
            Household method
          </NavLink>
          , for every limit.
        </p>
      </div>
    </div>
  );
}
