'use client';

import { TipBox } from '@/components/ab/Tip.jsx';
import { YEARS, FIRST_YEAR, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR } from '@/tabs/ai/surprise.js';
import { useHover } from '../shared/ui.jsx';

// The timing as a horizontal timeline: one column per year, a bar for the
// weight of the γ and Z ramp, and the four dates that matter. Hover, tap or
// focus a year for what happens in it. Below 600px it turns into a list.
// Ramp weights follow from the data file's years: 0 in the starting year,
// 1 in the headline year, linear between (0, .25, .5, .75, 1 over 2027-2031).
const weight = (y) => Math.max(0, Math.min(1, (y - FIRST_YEAR) / (HEADLINE_YEAR - FIRST_YEAR)));

const MARK = {
  [FIRST_YEAR]: 'Starting point',
  [SURPRISE_YEAR]: 'Shock announced',
  [HEADLINE_YEAR]: 'Headline year',
  [LATE_YEAR]: 'Debt rule starts',
};

function phase(y) {
  if (y <= FIRST_YEAR) return 'history';
  if (y <= HEADLINE_YEAR) return 'ramp';
  return 'full';
}

function detail(y) {
  const w = weight(y);
  const ramp = `Ramp weight ${w.toFixed(2)}.`;
  if (y < FIRST_YEAR) return `History: every scenario equals the OBR-central path.`;
  if (y === FIRST_YEAR) return `The single starting point: every scenario equals the OBR-central path, and every chart starts here. ${ramp}`;
  if (y === SURPRISE_YEAR)
    return `AI is announced at the start of the year, unexpected. Households re-plan; the first quarter of the ramp arrives. ${ramp}`;
  if (y < HEADLINE_YEAR) return `Adoption year ${y - FIRST_YEAR}: γ and Z move a further quarter of the way. ${ramp}`;
  if (y === HEADLINE_YEAR) return `Adoption year ${y - FIRST_YEAR}: the ramp reaches full weight. Headline figures are for this year. ${ramp}`;
  if (y === LATE_YEAR) return `The debt rule starts: from here spending closes the budget towards the long-run debt ratio. γ and Z stay at full weight.`;
  return `γ and Z stay at full weight; the economy keeps adjusting.`;
}

export default function Timeline() {
  const { hi, ref, bind } = useHover();
  return (
    <figure className="mx-tl" ref={ref}>
      <figcaption className="mx-fig-cap">
        <span className="mx-fig-title">The timing, {YEARS[0]}–{LATE_YEAR}</span>
        <span className="mx-fig-sub">Bars: weight of the change in &gamma; and Z, from 0 (the OBR-central path) to 1 (full scenario)</span>
      </figcaption>
      <div className="mx-tl-phases" aria-hidden="true">
        <span className="ph-history">Same as the OBR-central path</span>
        <span className="ph-ramp">Ramp: adoption years 1–4</span>
        <span className="ph-full">Full weight</span>
      </div>
      <ol className="mx-tl-cols">
        {YEARS.map((y) => {
          const w = weight(y);
          const m = MARK[y];
          return (
            <li
              key={y}
              className={`mx-tl-col ph-${phase(y)}${m ? ' is-mark' : ''}${hi === y ? ' is-hi' : ''}`}
              style={{ '--w': w }}
              {...bind(y, `${y}: ${detail(y)}`)}
            >
              <span className="mx-tl-mark">{m || ''}</span>
              <span className="mx-tl-track">
                <span className="mx-tl-bar" />
                <span className="mx-tl-w">{phase(y) === 'ramp' || y === FIRST_YEAR ? w.toFixed(2).replace(/0$/, '').replace(/\.0$/, '') : ''}</span>
              </span>
              <span className="mx-tl-year">{y}</span>
              {hi === y ? (
                <TipBox className="mx-tip">
                  <b>{y}</b>
                  {m ? <span className="mx-tip-tag">{m}</span> : null}
                  <span>{detail(y)}</span>
                </TipBox>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mx-fig-note">
        Perfect foresight from {SURPRISE_YEAR}: once announced, the whole path is known. Hover, tap or tab to a year
        for detail.
      </p>
    </figure>
  );
}
