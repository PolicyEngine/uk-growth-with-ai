'use client';

import { useState } from 'react';
import ChartHover from '@/components/story/chart/ChartHover.jsx';
import { YEARS, FIRST_YEAR, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR } from '@/tabs/ai/surprise.js';
import IconText from './IconText.jsx';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { cssColour, esc } from '@/lib/download.js';
import MathSym from '@/components/ui/MathSym.jsx';

// The timing as a horizontal timeline: one column per year, a bar for the
// weight of the γ and Z ramp, and the four dates that matter. Hover, tap or
// focus a year for what happens in it. Below 600px it turns into a list.
// Ramp weights follow from the data file's years: 0 in the starting year,
// 1 in the headline year, linear between (0, .25, .5, .75, 1 over 2027-2031).
const weight = (y) => Math.max(0, Math.min(1, (y - FIRST_YEAR) / (HEADLINE_YEAR - FIRST_YEAR)));

const MARK = {
  [FIRST_YEAR]: 'Starting point',
  [SURPRISE_YEAR]: 'Extra AI starts',
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
  if (y < FIRST_YEAR) return `History: every scenario equals the OBR’s central forecast path.`;
  if (y === FIRST_YEAR) return `The single starting point: every scenario equals the forecast path, and every chart starts here. ${ramp}`;
  if (y === SURPRISE_YEAR)
    return `The scenario’s AI comes in at the start of the year, unexpected. Households re-plan; the first quarter of the ramp applies. ${ramp}`;
  if (y < HEADLINE_YEAR) return `Adoption year ${y - FIRST_YEAR}: γ and Z move a further quarter of the way. ${ramp}`;
  if (y === HEADLINE_YEAR) return `Adoption year ${y - FIRST_YEAR}: the ramp reaches full weight. Headline figures are for this year. ${ramp}`;
  if (y === LATE_YEAR) return `The debt rule starts: from here spending closes the budget towards the long-run debt ratio. γ and Z stay at full weight.`;
  return `γ and Z stay at full weight; the economy keeps adjusting.`;
}

// The timing as data and as SVG, for the downloads.
export const timelineTable = () => ({
  columns: ['Year', 'Ramp weight of γ and Z (0 = the OBR’s central forecast path, 1 = full scenario)', 'Event'],
  rows: YEARS.map((y) => [y, weight(y), MARK[y] ?? '']),
});
export function timelineSvg() {
  const C = CHART_COLOURS;
  const col = cssColour('var(--series-2)');
  const cw = 60;
  const top = 34;
  const bh = 120;
  let out = '';
  YEARS.forEach((y, i) => {
    const x = i * cw;
    const w = weight(y);
    out += `<rect x="${x + 14}" y="${top + bh * (1 - w)}" width="${cw - 28}" height="${Math.max(1, bh * w)}" fill="${col}" opacity="${phase(y) === 'full' ? 0.55 : 0.9}"/>`;
    out += `<text x="${x + cw / 2}" y="${top + bh + 18}" font-size="12" text-anchor="middle" fill="${C.tick}">${y}</text>`;
    if (MARK[y]) out += `<text x="${x + cw / 2}" y="${top - 12}" font-size="11" font-weight="600" text-anchor="middle" fill="${C.ink}">${esc(MARK[y])}</text>`;
  });
  out += `<line x1="0" x2="${YEARS.length * cw}" y1="${top + bh}" y2="${top + bh}" stroke="${C.axis}"/>`;
  return { w: YEARS.length * cw, h: top + bh + 28, markup: out };
}

export default function Timeline({ caption = true }) {
  // the one tooltip (ChartHover, M4): each year's ramp weight and what happens
  const [at, setAt] = useState(null);
  const hi = at == null ? null : YEARS[at];
  const tips = YEARS.map((y) => ({ head: `${y}${MARK[y] ? `: ${MARK[y]}` : ''}`, rows: [{ name: 'Ramp weight of γ and Z', value: weight(y).toFixed(2), icon: 'timing' }], unit: detail(y) }));
  return (
    <figure className="mx-tl">
      {caption ? (
        <figcaption className="mx-fig-cap">
          <span className="mx-fig-title">The timing, {YEARS[0]}–{LATE_YEAR}</span>
          <span className="mx-fig-sub">Ramp weight of <MathSym name="gamma" /> and <MathSym name="Z" />, 0 to 1</span>
        </figcaption>
      ) : null}
      <div className="mx-tl-phases" aria-hidden="true">
        <span className="ph-history">Same as the forecast path</span>
        <span className="ph-ramp">Ramp: adoption years 1–4</span>
        <span className="ph-full">Full weight</span>
      </div>
      <p className="mx-axis-title mx-tl-axis">
        <IconText icon="measure">
          <span data-axis-title="y">Ramp weight of <MathSym name="gamma" /> and <MathSym name="Z" />, 0 to 1</span>
        </IconText>
      </p>
      <ChartHover label={`The timing, ${YEARS[0]} to ${LATE_YEAR}`} items={tips} onActive={setAt}>
      <ol className="mx-tl-cols">
        {YEARS.map((y) => {
          const w = weight(y);
          const m = MARK[y];
          return (
            <li
              key={y}
              className={`mx-tl-col ph-${phase(y)}${m ? ' is-mark' : ''}${hi === y ? ' is-hi' : ''}`}
              style={{ '--w': w }}
              data-tip={YEARS.indexOf(y)}
            >
              <span className="mx-tl-mark">{m || ''}</span>
              <span className="mx-tl-track">
                <span className="mx-tl-bar" data-icon="" />
                <span className="mx-tl-w">{phase(y) === 'ramp' || y === FIRST_YEAR ? w.toFixed(2).replace(/0$/, '').replace(/\.0$/, '') : ''}</span>
              </span>
              <span className="mx-tl-year">{y}</span>
            </li>
          );
        })}
      </ol>
      </ChartHover>
      <p className="mx-axis-title mx-tl-axis is-x">
        <IconText icon="timing">
          <span data-axis-title="x">Calendar year</span>
        </IconText>
      </p>
    </figure>
  );
}
