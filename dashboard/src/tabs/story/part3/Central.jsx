'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import Scrolly from '@/components/story/Scrolly.jsx';
import { TileField } from '@/components/story/primitives.jsx';
import CountUp from '@/components/story/CountUp.jsx';
import { Items, KeyFacts } from '@/components/story/Items.jsx';
import { fmtBn, fmtGini, fmtInputPct, fmtMillions, fmtPct1, fmtPp } from './format.js';
import { About, D, FigureHead, MODEL_YEAR, Source, Ico, entryClass, useBeat } from './shared.jsx';

// Step 1, the central case (results.tex, "The central scenario"). The
// scoreboard is the home of the headline figures, each beside its baseline;
// its key and source line carry the after-housing-costs rise, the cost's
// basis and its spread; the card carries the assumptions, with the design
// and the upper-bound reading in its "About these figures" disclosure.

const H = D.headline;
const B = D.baseline;
const M = D.method;
// The prescribed displacement rate. The data carry it only in the note on
// the displaced count ("7% prescribed displacement rate"), so it is read
// from there and checked: a rate that cannot be read is null (the tiles then
// show no displaced group and the card omits the clause), and a test fails.
export function centralRate(note = H.central_displaced.note) {
  const v = Number(/([\d.]+)% prescribed/.exec(note ?? '')?.[1]);
  return Number.isFinite(v) && v > 0 && v < 100 ? v : null;
}
export const CENTRAL_RATE = centralRate();
// Whole tiles of 100 (one tile = 1% of employees) for the displaced group.
export const DISPLACED_TILES = CENTRAL_RATE == null ? 0 : Math.round(CENTRAL_RATE);

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

// The tiles (scene 3-1, plan section 2): 100 employees in grey; after the
// hold, the displaced peel out of the right-hand column to a group two
// columns away, 80ms apart, turning ink as they land (F's TileField). Positions only; the group carries
// no number (the rate's home is the card).
const GAP_COLS = 2;
export function centralTiles(on) {
  return Array.from({ length: 100 }, (_, k) => {
    const x = k % 10;
    const y = Math.floor(k / 10);
    // the displaced: the top DISPLACED_TILES tiles of the right-hand column
    const out = x === 9 && y < DISPLACED_TILES;
    return {
      key: k,
      x: out && on ? 9 + 1 + GAP_COLS : x,
      y,
      out,
      color: out && on ? 'var(--pe-gray-800)' : 'var(--pe-gray-200)',
      group: out ? 'displaced' : 'employees',
      delay: out ? y * 80 : 0,
    };
  });
}

function CentralFigure({ ctx }) {
  const e = useBeat(ctx?.entered ?? true);
  const tiles = centralTiles(e.on);
  return (
    <figure className={entryClass(e, 'p3-figure p3-scene')}>
      <FigureHead icon="jobLoss" title={`The central case, ${MODEL_YEAR}`} unit={`Mean of ${H.central_cost.draws} random draws of who is displaced`} replay={e.replay} />
      <div className="p3-central">
        <div className="p3-central-tiles">
          <p className="p3-tile-heads" aria-hidden="true">
            <span>Employees</span>
            <span className="p3-tile-head-out">Assumed displaced</span>
          </p>
          <TileField
            tiles={tiles}
            width={10 + 1 + GAP_COLS}
            height={10}
            size={14}
            gap={3}
            label="Tile grid of employees; the tiles set apart in ink are those assumed displaced in the central case"
          />
          <p className="p3-tile-key p3-iconed" data-axis="">
            <Ico c="measure" size={12} /> One tile = 1% of employees
          </p>
        </div>
        <KeyFacts className="p3-facts" facts={FACTS.map((f) => ({ ...f, value: <CountUp key={e.run} value={f.value} /> }))} />
      </div>
      <Source />
    </figure>
  );
}

// The figure's key, moved under the step card (balanced layout, addendum A2.5).
function KeyCard() {
  return (
    <Items
      className="p3-key-card"
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
              CENTRAL_RATE != null && {
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
          <KeyCard />
          <About>
            <Items
              items={[
                { icon: 'measure', text: 'Each employee’s chance is in proportion to their occupation’s AI exposure' },
                { icon: 'source', text: 'Rate and wage rise follow Doorley et al. (2026), an Irish design' },
                { icon: 'scenario', text: 'Drawn from one investment-bank scenario of displacement over about a decade' },
                { icon: 'period', text: 'Applied in one year: an impact-year stress test' },
              ]}
            />
          </About>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-central" steps={steps} graphic={(i, r, ctx) => <CentralFigure ctx={ctx} />} label="The central case: people displaced, cost, poverty and inequality, beside their baselines" />;
}
