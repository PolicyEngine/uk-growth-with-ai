'use client';

import { useState } from 'react';
import ChartHover from '@/components/story/chart/ChartHover.jsx';
import IconText from './IconText.jsx';
import MoreInfo from '@/components/ui/MoreInfo.jsx';

// The overlapping-generations idea: at any date many cohorts coexist, each at
// a different stage of life. A schematic (bar heights are illustrative, not
// data): earnings rise to mid-career and fall into retirement. Hover, tap or
// focus a stage for what it does in the model.
const STAGES = [
  { id: 'young', label: 'Young', ages: '20–30', bars: [62, 70, 78], text: 'In the model, little wealth yet, so income is mostly wages.' },
  { id: 'mid', label: 'Mid-career', ages: '31–50', bars: [86, 94, 100, 98], text: 'In the model, peak earnings and the most saving.' },
  { id: 'pre', label: 'Late career', ages: '51–65', bars: [90, 78, 66], text: 'In the model, wealth peaks late in working life.' },
  { id: 'old', label: 'Retired', ages: '66–99', bars: [44, 34, 26], text: 'In the model, running down wealth and leaving bequests.' },
];

export default function Cohorts() {
  // the one tooltip (ChartHover, M4): each stage's ages and what it does
  const [at, setAt] = useState(null);
  const hi = at == null ? null : STAGES[at]?.id;
  const tips = STAGES.map((s) => ({ head: s.label, rows: [{ name: 'Ages', value: s.ages, icon: 'age' }], unit: s.text }));
  return (
    <figure className="mx-olg">
      <ChartHover label="The life cycle in four stages" items={tips} onActive={setAt}>
      <div className="mx-olg-plot" aria-hidden="false">
        {STAGES.map((s) => (
          <div
            key={s.id}
            className={`mx-olg-stage st-${s.id}${hi === s.id ? ' is-hi' : ''}`}
            data-tip={STAGES.indexOf(s)}
          >
            <div className="mx-olg-bars">
              {s.bars.map((h, i) => (
                <span key={i} className="mx-olg-bar" style={{ height: `${h}%` }} />
              ))}
            </div>
            <span className="mx-olg-label">{s.label}</span>
            <span className="mx-olg-ages">{s.ages}</span>
          </div>
        ))}
      </div>
      </ChartHover>
      <figcaption className="mx-fig-note">
        <IconText icon="caveat">Earnings by age at one date; heights illustrative</IconText>
      </figcaption>
      {/* item 36 (M3): the pointer to the cohorts and ability types, in the
          figure's one closed More info */}
      <MoreInfo id="m-generations-more" groups={[{ key: 'read', title: 'How to read', items: [{ key: 'types', head: 'Cohorts and ability types', text: 'The Households block above.' }] }]} />
    </figure>
  );
}
