'use client';

import { TipBox } from '@/components/ab/Tip.jsx';
import { useHover } from '../shared/ui.jsx';

// The overlapping-generations idea: at any date many cohorts coexist, each at
// a different stage of life. A schematic (bar heights are illustrative, not
// data): earnings rise to mid-career and fall into retirement. Hover, tap or
// focus a stage for what it does in the model.
const STAGES = [
  { id: 'young', label: 'Young', ages: '20–30', bars: [62, 70, 78], text: 'Entering work with little wealth, so income is almost all wages.' },
  { id: 'mid', label: 'Mid-career', ages: '31–50', bars: [86, 94, 100, 98], text: 'Peak earnings and the most saving: a lower labour share hits this group’s income most directly.' },
  { id: 'pre', label: 'Late career', ages: '51–65', bars: [90, 78, 66], text: 'Holding the most wealth, so a higher return on capital raises their income.' },
  { id: 'old', label: 'Retired', ages: '66–99', bars: [44, 34, 26], text: 'Drawing pensions and running down wealth; leaving bequests to younger cohorts.' },
];

export default function Cohorts() {
  const { hi, ref, bind } = useHover();
  return (
    <figure className="mx-olg" ref={ref}>
      <div className="mx-olg-plot" aria-hidden="false">
        {STAGES.map((s) => (
          <div
            key={s.id}
            className={`mx-olg-stage st-${s.id}${hi === s.id ? ' is-hi' : ''}`}
            {...bind(s.id, `${s.label}, ages ${s.ages}: ${s.text}`)}
          >
            <div className="mx-olg-bars">
              {s.bars.map((h, i) => (
                <span key={i} className="mx-olg-bar" style={{ height: `${h}%` }} />
              ))}
            </div>
            <span className="mx-olg-label">{s.label}</span>
            <span className="mx-olg-ages">{s.ages}</span>
            {hi === s.id ? (
              <TipBox className="mx-tip">
                <b>
                  {s.label}, {s.ages}
                </b>
                <span>{s.text}</span>
              </TipBox>
            ) : null}
          </div>
        ))}
      </div>
      <figcaption className="mx-fig-note">
        Schematic of earnings by age at one date; heights are illustrative. The model&rsquo;s cohorts and ability types
        are under Households, above.
      </figcaption>
    </figure>
  );
}
