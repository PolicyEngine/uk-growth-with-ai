'use client';

import { TipBox } from '@/components/ab/Tip.jsx';
import { useHover } from '../shared/ui.jsx';
import IconText from './IconText.jsx';
import MoreInfo from '@/components/ui/MoreInfo.jsx';

// The overlapping-generations idea: at any date many cohorts coexist, each at
// a different stage of life. A schematic (bar heights are illustrative, not
// data): earnings rise to mid-career and fall into retirement. Hover, tap or
// focus a stage for what it does in the model.
const STAGES = [
  { id: 'young', label: 'Young', ages: '20–30', bars: [62, 70, 78], text: 'In OG-UK, little wealth yet, so income is mostly wages.' },
  { id: 'mid', label: 'Mid-career', ages: '31–50', bars: [86, 94, 100, 98], text: 'In OG-UK, peak earnings and the most saving.' },
  { id: 'pre', label: 'Late career', ages: '51–65', bars: [90, 78, 66], text: 'In OG-UK, wealth peaks late in working life.' },
  { id: 'old', label: 'Retired', ages: '66–99', bars: [44, 34, 26], text: 'In OG-UK, running down wealth and leaving bequests.' },
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
        <IconText icon="caveat">Earnings by age at one date; heights illustrative</IconText>
      </figcaption>
      {/* item 36 (M3): the pointer to the cohorts and ability types, in the
          figure's one closed More info */}
      <MoreInfo id="m-generations-more" groups={[{ key: 'read', title: 'How to read', items: [{ key: 'types', head: 'Cohorts and ability types', text: 'The Households block above.' }] }]} />
    </figure>
  );
}
