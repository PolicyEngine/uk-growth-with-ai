'use client';

import CountUp from '@/components/story/CountUp.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { TileGrid } from '@/components/story/primitives.jsx';
import { fmtBn, fmtGini, fmtInputPct, fmtMillions, fmtPct1, fmtPp } from './format.js';
import { About, D, FigureHead, MODEL_YEAR, Source } from './shared.jsx';

// Step 1, the central case (results.tex, "The central scenario"). The
// scoreboard is the home of the headline figures, each beside its baseline;
// its key and source line carry the after-housing-costs rise, the cost's
// basis and its spread; the card carries the assumptions, with the design
// and the upper-bound reading in its "About these figures" disclosure.

const H = D.headline;
const B = D.baseline;
const M = D.method;
// The prescribed displacement rate, from the note on the displaced count.
export const CENTRAL_RATE = Number(/([\d.]+)% prescribed/.exec(H.central_displaced.note)?.[1] ?? NaN);

const STATS = [
  { id: 'displaced', value: fmtMillions(H.central_displaced.value), label: 'employees assumed displaced for the year' },
  { id: 'cost', value: fmtBn(H.central_cost.value), label: 'cost to the public finances, a year' },
  {
    id: 'poverty',
    value: fmtPp(H.central_poverty.value),
    label: 'absolute poverty before housing costs',
    base: `from ${fmtPct1(B.absolute_bhc_pct.value)} of people`,
  },
  {
    id: 'relative',
    value: fmtPp(H.central_poverty_relative.value),
    label: 'relative poverty before housing costs',
    base: `from ${fmtPct1(B.relative_bhc_pct.value)}`,
  },
  { id: 'gini', value: fmtPp(H.central_gini.value), label: 'Gini coefficient, in points', base: `from ${fmtGini(B.gini.value)}` },
];

function Graphic() {
  const tiles = Array.from({ length: 100 }, (_, k) => ({
    key: k,
    x: k % 10,
    y: Math.floor(k / 10),
    color: k < Math.round(CENTRAL_RATE) ? 'var(--series-2)' : 'var(--pe-gray-200)',
    delay: k * 4,
  }));
  return (
    <figure className="p3-figure">
      <FigureHead title={`The central case, ${MODEL_YEAR}`} unit={`Mean of ${H.central_cost.draws} random draws of who is displaced`} />
      <div className="p3-central">
        <div className="p3-central-tiles">
          <TileGrid tiles={tiles} width={10} height={10} size={14} gap={3} label="Tile grid of employees; the coloured tiles are those assumed displaced in the central case" />
          <p className="p3-tile-key" data-axis="">
            One tile = 1% of employees
          </p>
        </div>
        <ul className="p3-stats">
          {STATS.map((s) => (
            <li key={s.id} className="p3-stat" data-stat={s.id}>
              <span className="p3-stat-value">
                <CountUp value={s.value} />
              </span>{' '}
              <span className="p3-stat-label">{s.label}</span>
              {s.base ? <span className="p3-stat-base">{s.base}</span> : null}
            </li>
          ))}
        </ul>
      </div>
      <p className="p3-key">
        After housing costs, absolute poverty rises by {fmtPp(H.central_poverty_ahc.value)}. The study reads the poverty rise as an
        upper bound, because every displaced worker is out of work all year. Poverty lines as in the HBAI statistics: the
        absolute line is held at its baseline value; the relative line is <span data-input="">60%</span> of the median.
      </p>
      <Source>
        cost: the fall in the government balance (income tax, employee and employer NI, and benefits; no corporation tax), standard deviation
        across draws {fmtBn(H.central_cost.sd)}
      </Source>
    </figure>
  );
}

export default function Central() {
  const steps = [
    {
      id: 'p3-central-step',
      kicker: '1 · The central case',
      title: 'A year in which a share of employees lose their jobs',
      body: (
        <>
          <p>
            The study assumes that{' '}
            <span data-input="" data-path="headline.central_displaced.note">
              {fmtInputPct(CENTRAL_RATE)}
            </span>{' '}
            of employees lose their job for all of {MODEL_YEAR}, more often in occupations more exposed to AI. Wages of those who keep their
            jobs rise by{' '}
            <span data-input="" data-path="method.survivor_wage_pct">
              {fmtInputPct(M.survivor_wage_pct)}
            </span>{' '}
            on average, and interest and dividend income by{' '}
            <span data-input="" data-path="method.capital_uplift_pct">
              {fmtPct1(M.capital_uplift_pct)}
            </span>
            .
          </p>
          <About>
            <p>
              Each employee’s chance of displacement is in proportion to their occupation’s AI exposure. The displacement rate and the wage
              rise follow the Irish design of Doorley et al. (2026), drawn from one investment-bank scenario exercise of displacement over
              about a decade; applying it all in one year makes the central case an impact-year stress test.
            </p>
          </About>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-central" steps={steps} graphic={Graphic} label="The central case: people displaced, cost, poverty and inequality, beside their baselines" />;
}
