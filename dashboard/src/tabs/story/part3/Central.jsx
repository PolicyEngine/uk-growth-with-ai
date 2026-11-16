'use client';

import Icon from '@/components/ab/Icon.jsx';
import CountUp from '@/components/story/CountUp.jsx';
import { iconFor } from '@/lib/concepts.js';
import Scrolly from '@/components/story/Scrolly.jsx';
import { TileGrid } from '@/components/story/primitives.jsx';
import { Items, KeyFacts } from '@/components/story/Items.jsx';
import { fmtBn, fmtGini, fmtInputPct, fmtMillions, fmtPct1, fmtPp } from './format.js';
import { About, D, FigureHead, MODEL_YEAR, Source, Ico } from './shared.jsx';

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

// The scoreboard: icon, number, a short label and the baseline as `sub`.
// The cost's spread across draws sits under the cost; the upper-bound
// reading stays visible beside the poverty tile (it qualifies a headline).
const FACTS = [
  { key: 'displaced', icon: 'jobLoss', value: fmtMillions(H.central_displaced.value), label: 'employees assumed displaced' },
  { key: 'cost', icon: 'cost', value: fmtBn(H.central_cost.value), label: 'cost to the public finances, a year', sub: `standard deviation ${fmtBn(H.central_cost.sd)}` },
  {
    key: 'poverty',
    icon: 'poverty',
    value: fmtPp(H.central_poverty.value),
    label: 'absolute poverty, before housing costs',
    sub: (
      <>
        from {fmtPct1(B.absolute_bhc_pct.value)} of people
        <span className="p3-fact-flag">
          <Icon name={iconFor('caveat')} size={12} /> upper bound
        </span>
      </>
    ),
  },
  {
    key: 'relative',
    icon: 'poverty',
    value: fmtPp(H.central_poverty_relative.value),
    label: 'relative poverty, before housing costs',
    sub: `from ${fmtPct1(B.relative_bhc_pct.value)}`,
  },
  { key: 'gini', icon: 'inequality', value: fmtPp(H.central_gini.value), label: 'Gini coefficient, in points', sub: `from ${fmtGini(B.gini.value)}` },
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
      <FigureHead icon="jobLoss" title={`The central case, ${MODEL_YEAR}`} unit={`Mean of ${H.central_cost.draws} random draws of who is displaced`} />
      <div className="p3-central">
        <div className="p3-central-tiles">
          <TileGrid tiles={tiles} width={10} height={10} size={14} gap={3} label="Tile grid of employees; the coloured tiles are those assumed displaced in the central case" />
          <p className="p3-tile-key p3-iconed" data-axis="">
            <Ico c="measure" size={12} /> One tile = 1% of employees
          </p>
        </div>
        <KeyFacts className="p3-facts" facts={FACTS.map((f) => ({ ...f, value: <CountUp value={f.value} /> }))} />
      </div>
      <Items
        className="p3-key-items"
        items={[
          { icon: 'caveat', text: 'Upper bound, says the study: the displaced are jobless all year' },
          { icon: 'poverty', text: <>After housing costs, absolute poverty rises by {fmtPp(H.central_poverty_ahc.value)}</> },
          {
            icon: 'measure',
            text: (
              <>
                HBAI poverty lines: absolute held at baseline, relative <span data-input="">60%</span> of median
              </>
            ),
          },
          { icon: 'cost', text: 'Cost: income tax, NI and benefits; no corporation tax' },
        ]}
      />
      <Source />
    </figure>
  );
}

export default function Central() {
  const steps = [
    {
      id: 'p3-central-step',
      kicker: '1 · The central case',
      title: 'A year in which a share of employees lose their jobs',
      icon: 'jobLoss',
      body: (
        <>
          <Items
            items={[
              {
                icon: 'jobLoss',
                text: (
                  <>
                    Assumed:{' '}
                    <span data-input="" data-path="headline.central_displaced.note">
                      {fmtInputPct(CENTRAL_RATE)}
                    </span>{' '}
                    of employees lose their job for all of {MODEL_YEAR}
                  </>
                ),
              },
              { icon: 'ai', text: 'More often in occupations more exposed to AI' },
              {
                icon: 'pay',
                text: (
                  <>
                    Wages of those who keep their jobs rise{' '}
                    <span data-input="" data-path="method.survivor_wage_pct">
                      {fmtInputPct(M.survivor_wage_pct)}
                    </span>{' '}
                    on average
                  </>
                ),
              },
              {
                icon: 'capital',
                text: (
                  <>
                    Interest and dividend income rise{' '}
                    <span data-input="" data-path="method.capital_uplift_pct">
                      {fmtPct1(M.capital_uplift_pct)}
                    </span>
                  </>
                ),
              },
            ]}
          />
          <About>
            <Items
              items={[
                { icon: 'measure', text: 'Each employee’s chance is in proportion to their occupation’s AI exposure' },
                { icon: 'source', text: 'Rate and wage rise follow Doorley et al. (2026), an Irish design' },
                { icon: 'scenario', text: 'Drawn from one investment-bank scenario of displacement over about a decade' },
                { icon: 'oneYear', text: 'Applied in one year: an impact-year stress test' },
              ]}
            />
          </About>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-central" steps={steps} graphic={Graphic} label="The central case: people displaced, cost, poverty and inequality, beside their baselines" />;
}
