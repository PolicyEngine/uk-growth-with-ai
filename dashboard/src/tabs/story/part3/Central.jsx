'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import Scrolly from '@/components/story/Scrolly.jsx';
import { TileField } from '@/components/story/primitives.jsx';
import CountUp from '@/components/story/CountUp.jsx';
import { Items, KeyFacts } from '@/components/story/Items.jsx';
import { fmtBn, fmtGini, fmtInputPct, fmtMillions, fmtPct1, fmtPp } from './format.js';
import { About, AxisTitle, BASELINE_LABEL, D, FigureHead, MODEL_YEAR, Source, Ico, entryClass, useBeat } from './shared.jsx';
import { Ref, Sec } from './sources.jsx';

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
// Doorley et al.'s return shock and the base it sits on, from the data: the
// income rise is shock / base, so base = shock / rise (1.005% for +0.4pp and
// +39.8%; claim audit P3-15).
export const RETURN_PP = Number(M.return_shock_pp);
export const RETURN_BASE = RETURN_PP / (M.capital_uplift_pct / 100);
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
      {/* the poverty basis, said once for the part: before housing costs */}
      <p className="p3-pov-basis" title="Every poverty figure in this part is before housing costs (BHC); the after-housing-costs rise is shown once, as a secondary figure">
        <Ico c="poverty" size={13} /> Poverty: before housing costs (default)
      </p>
      <div className="p3-central">
        <div className="p3-central-tiles">
          <p className="p3-tile-heads">
            <AxisTitle axis="x">
              <Ico c="workers" size={12} /> Employees
            </AxisTitle>
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
            <Ico c="measure" size={12} /> <AxisTitle axis="y">Share of employees, one tile = 1%</AxisTitle>
          </p>
          <Items
            className="p3-tile-notes"
            items={[
              { icon: 'source', text: <>Baselines: {BASELINE_LABEL}, not DWP’s published rates</> },
              { icon: 'cost', text: 'Cost: income tax, NI and benefits; no corporation tax' },
            ]}
          />
        </div>
        <KeyFacts className="p3-facts" facts={FACTS.map((f) => ({ ...f, value: <CountUp key={e.run} value={f.value} /> }))} />
      </div>
      <Source files={[H.central_cost.file, B.absolute_bhc_pct.file, B.gini.file]} />
    </figure>
  );
}

// The figure's key, moved under the step card (balanced layout, addendum A2.5).
function KeyCard() {
  return (
    <Items
      className="p3-key-card"
      items={[
        { icon: 'caveat', text: <>Upper bound, says <Sec id="results">the study</Sec>: the displaced are jobless all year</> },
        { icon: 'poverty', text: <>After housing costs (secondary): absolute poverty {fmtPp(H.central_poverty_ahc.value)}</> },
        {
          icon: 'measure',
          text: (
            <>
              <Ref id="hbai">HBAI</Ref> income; absolute line fixed at no-shock value, relative <span data-input="">60%</span> of median
            </>
          ),
        },
      ]}
    />
  );
}

// The topic opener: a neutral question the block answers, and its takeaway
// (no figures), the words from the signs of the headline results.
const up = (v) => (v > 0 ? 'raises' : v < 0 ? 'lowers' : 'leaves unchanged');
export const CENTRAL_SUB = {
  title: 'The central case',
  icon: 'jobLoss',
  question: 'What happens in the central case?',
  takeaway: `A year of assumed job loss ${H.central_cost.value > 0 ? 'costs the public finances' : 'adds to net receipts'}, ${up(H.central_poverty.value)} poverty and ${up(H.central_gini.value)} inequality`,
};

export default function Central() {
  const steps = [
    {
      id: 'p3-central-step',
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
                    <Ref id="doorley" />:{' '}
                    <span data-input="" data-path="headline.central_displaced.note">
                      {fmtInputPct(CENTRAL_RATE)}
                    </span>{' '}
                    of employees jobless throughout {MODEL_YEAR}
                  </>
                ),
              },
              {
                icon: 'ai',
                text: (
                  <>
                    More often in occupations more exposed to AI (C-AIOE index)
                  </>
                ),
              },
              {
                icon: 'pay',
                text: (
                  <>
                    Also from Doorley et al.: wages of those still employed rise{' '}
                    <span data-input="" data-path="method.survivor_wage_pct">
                      {fmtInputPct(M.survivor_wage_pct)}
                    </span>
                  </>
                ),
              },
              {
                icon: 'capital',
                text: (
                  <>
                    Their capital return: <span data-input="">+{RETURN_PP}</span> points on{' '}
                    <span data-input="">{Number(RETURN_BASE.toFixed(3))}%</span>; interest and dividends{' '}
                    <span data-input="" data-path="method.capital_uplift_pct">
                      +{fmtPct1(M.capital_uplift_pct)}
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
                { icon: 'ai', text: <>C-AIOE: <Ref id="felten" /> exposure, <Ref id="pizzinelli" /> adjustment</> },
                { icon: 'measure', text: 'Each employee’s chance follows their occupation’s exposure' },
                { icon: 'source', text: <>The study builds the UK series from the <Ref id="dfe" /> mapping</> },
                { icon: 'scenario', text: 'Doorley et al. draw on Goldman Sachs (Briggs and Kodnani, 2023)' },
                { icon: 'period', text: <>That scenario spreads displacement over about a decade (<Sec id="method">paper</Sec>)</> },
                { icon: 'period', text: 'Applied in one year, the study’s choice: an impact-year stress test' },
              ]}
            />
          </About>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-central" sub={CENTRAL_SUB} steps={steps} graphic={(i, r, ctx) => <CentralFigure ctx={ctx} />} label="The central case: people displaced, cost, poverty and inequality, beside their baselines" />;
}
