'use client';

import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { TileGrid } from '@/components/story/primitives.jsx';
import { fmtBn, fmtGini, fmtInputPct, fmtMillions, fmtPct1, fmtPp } from './format.js';
import { D, FigureHead, MODEL_YEAR, Source } from './shared.jsx';

// Step 1, the central case (results.tex, "The central scenario"). The
// scoreboard is the home of the headline figures, each beside its baseline;
// the card carries the assumptions, the basis and the after-housing-costs rise.

const H = D.headline;
const B = D.baseline;
const M = D.method;
// The prescribed displacement rate, from the note on the displaced count.
export const CENTRAL_RATE = Number(/([\d.]+)% prescribed/.exec(H.central_displaced.note)?.[1] ?? NaN);

const STATS = [
  { id: 'displaced', icon: 'users', value: fmtMillions(H.central_displaced.value), label: 'employees displaced for the year' },
  { id: 'cost', icon: 'landmark', value: fmtBn(H.central_cost.value), label: 'cost to the public finances, a year' },
  {
    id: 'poverty',
    icon: 'home',
    value: fmtPp(H.central_poverty.value),
    label: 'absolute poverty before housing costs',
    base: `from ${fmtPct1(B.absolute_bhc_pct.value)} of people`,
  },
  {
    id: 'relative',
    icon: 'home',
    value: fmtPp(H.central_poverty_relative.value),
    label: 'relative poverty before housing costs',
    base: `from ${fmtPct1(B.relative_bhc_pct.value)}`,
  },
  { id: 'gini', icon: 'scale', value: fmtPp(H.central_gini.value), label: 'Gini coefficient, in points', base: `from ${fmtGini(B.gini.value)}` },
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
            <li key={s.id} className="p3-stat is-reached" data-stat={s.id}>
              <Icon name={s.icon} size={18} />
              <span className="p3-stat-value">{s.value}</span> <span className="p3-stat-label">{s.label}</span>
              {s.base ? <span className="p3-stat-base">{s.base}</span> : null}
            </li>
          ))}
        </ul>
      </div>
      <p className="p3-key">
        Poverty lines as in the HBAI statistics: the absolute line is held at its baseline value; the relative line is{' '}
        <span data-input="">60%</span> of the median.
      </p>
      <Source />
    </figure>
  );
}

export default function Central() {
  const steps = [
    {
      id: 'p3-central',
      kicker: '1 · The central case',
      title: 'A year in which a share of employees lose their jobs',
      body: (
        <>
          <p>
            The study assumes that{' '}
            <span data-input="" data-path="headline.central_displaced.note">
              {fmtInputPct(CENTRAL_RATE)}
            </span>{' '}
            of employees lose their job for the whole of {MODEL_YEAR}, each with a chance in proportion to their occupation’s AI exposure.
            The wages of those who keep their jobs rise by{' '}
            <span data-input="" data-path="method.survivor_wage_pct">
              {fmtInputPct(M.survivor_wage_pct)}
            </span>{' '}
            on average, and interest and dividend income by{' '}
            <span data-input="" data-path="method.capital_uplift_pct">
              {fmtPct1(M.capital_uplift_pct)}
            </span>
            .
          </p>
          <p>
            The cost is the fall in the government balance: income tax, employee and employer National Insurance, and benefits, with no
            corporation tax. Across the draws its standard deviation is {fmtBn(H.central_cost.sd)}.
          </p>
          <p>
            Because every displaced worker is out of work all year, the study reads the poverty rise as an upper bound for this way of
            choosing who loses the job. After housing costs, absolute poverty rises by {fmtPp(H.central_poverty_ahc.value)}.
          </p>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-central" steps={steps} graphic={Graphic} label="The central case: people displaced, cost, poverty and inequality, beside their baselines" />;
}
