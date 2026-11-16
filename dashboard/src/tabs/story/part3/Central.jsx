'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import Scrolly from '@/components/story/Scrolly.jsx';
import { TileField } from '@/components/story/primitives.jsx';
import CountUp from '@/components/story/CountUp.jsx';
import { fmtBn, fmtGini, fmtInputPct, fmtMillions, fmtPct1, fmtPp } from './format.js';
import { AxisTitle, BASELINE_LABEL, D, DrawsChip, FigureHead, Fold, MODEL_YEAR, InputFig, Num, NumMarker, Key, MarkProvider, Source, Ico, entryClass, markProps, useBeat, asLines } from './shared.jsx';
import { Ref, Sec } from './sources.jsx';
import { RECAP as P2_RECAP } from '../Part2.jsx';

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
  {
    key: 'displaced',
    icon: 'jobLoss',
    value: fmtMillions(H.central_displaced.value),
    label: 'employees assumed displaced',
  },
  {
    key: 'cost',
    icon: 'cost',
    value: fmtBn(H.central_cost.value),
    label: 'cost to the public finances, a year',
    sub: `standard deviation ${fmtBn(H.central_cost.sd)}`,
  },
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
  {
    key: 'gini',
    icon: 'inequality',
    value: fmtPp(H.central_gini.value),
    label: 'Gini coefficient, in points',
    sub: `from ${fmtGini(B.gini.value)}`,
  },
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
  // each fact a mark (data-mark="f-<key>"); the count-up restarts when the
  // entry beat plays (after the topic opener), not while it covers the figure
  const facts = FACTS.map((f) => ({
    ...f,
    value: <CountUp key={`${e.run}-${e.on}`} value={f.value} />,
  }));
  return (
    <figure className={entryClass(e, `p3-figure p3-scene`)}>
      <FigureHead icon="jobLoss" title={`The central case, ${MODEL_YEAR}`} unit={<DrawsChip>{H.central_cost.draws} draws</DrawsChip>} replay={e.replay} />
      {/* the poverty basis, said once for the part: before housing costs */}
      <p className="p3-pov-basis" title="Every poverty figure in this part is before housing costs (BHC); the after-housing-costs rise is shown once, as a secondary figure">
        <Ico c="poverty" size={13} /> Poverty: before housing costs (default)
      </p>
      <div className="p3-central">
        <div {...markProps('displaced', 'p3-central-tiles')}>
          <p className="p3-tile-heads">
            <AxisTitle axis="x">
              <Ico c="workers" size={12} /> Employees
            </AxisTitle>
            <span className="p3-tile-head-out">
              <NumMarker n={1} /> Assumed displaced
            </span>
          </p>
          <TileField tiles={tiles} width={10 + 1 + GAP_COLS} height={10} size={14} gap={3} label="Tile grid of employees; the tiles set apart in ink are those assumed displaced in the central case" />
          <p className="p3-tile-key p3-iconed" data-axis="">
            <Ico c="measure" size={12} /> <AxisTitle axis="y">Share of employees, one tile = 1%</AxisTitle>
          </p>
        </div>
        <ul className="story-facts p3-facts">
          {facts.map((f) => (
            <li key={f.key} {...markProps(`f-${f.key}`, 'story-fact')}>
              <Icon name={iconFor(f.icon)} size={18} className="story-fact-icon" />
              <span className="story-fact-value">{f.value}</span>
              <span className="story-fact-label">{f.label}</span>
              {f.sub ? <span className="story-fact-sub">{f.sub}</span> : null}
            </li>
          ))}
        </ul>
      </div>
      <p className="p3-key p3-iconed">
        <Ico c="poverty" size={12} /> After housing costs (secondary): absolute poverty {fmtPp(H.central_poverty_ahc.value)}
      </p>
      <Source files={[H.central_cost.file, B.absolute_bhc_pct.file, B.gini.file]} />
    </figure>
  );
}

// The topic opener: a neutral question the block answers, its hint, the
// answer chip (the scene's own figures, by the same formatters) and the
// takeaway (no figures), the words from the signs of the headline results.
const up = (v) => (v > 0 ? 'raises' : v < 0 ? 'lowers' : 'leaves unchanged');
const COSTS = H.central_cost.value > 0;
export const CENTRAL_SUB = {
  title: 'The central case',
  icon: 'jobLoss',
  question: 'What happens in the central case?',
  hint: 'Watch who steps out of the grid',
  // the part's first topic takes the full pinned question screen (Fable)
  pin: 'full',
  // part 2's recap as the transition into part 3 (Fable)
  recap: P2_RECAP,
  key: 'central',
  answerTo: 'p3-central-step',
  answer: `${fmtBn(H.central_cost.value)} a year; poverty ${fmtPp(H.central_poverty.value)}`,
  takeaway: `A year of assumed job loss ${COSTS ? 'costs the public finances' : 'adds to net receipts'}, ${up(H.central_poverty.value)} poverty and ${up(H.central_gini.value)} inequality`,
};

// The fold: the assumptions with their sources, then the caveats and
// definitions (prose; the inputs are quoted, data-input).
const CENTRAL_FOLD = [
  {
    label: 'Assumed',
    items: [
      <>
        <Ref id="doorley">Doorley et al. (2026)</Ref>: wages of those still employed rise <InputFig path="method.survivor_wage_pct">{fmtInputPct(M.survivor_wage_pct)}</InputFig>
      </>,
      <>
        Their capital return rises <span data-input="">+{RETURN_PP}</span> points on <span data-input="">{Number(RETURN_BASE.toFixed(3))}%</span>: interest and dividends{' '}
        <InputFig path="method.capital_uplift_pct">+{fmtPct1(M.capital_uplift_pct)}</InputFig>
      </>,
      'Job loss is likelier in occupations more exposed to AI (C-AIOE index)',
      <>
        C-AIOE: <Ref id="felten" /> exposure, <Ref id="pizzinelli" /> adjustment, mapped to the UK by <Ref id="dfe" />
      </>,
    ],
  },
  {
    label: 'Caveat',
    items: [
      <>
        An upper bound, says <Sec id="results">the study</Sec>: the displaced are jobless all year
      </>,
      <>
        Doorley et al. draw on Goldman Sachs (Briggs and Kodnani, 2023), which spreads displacement over about a decade (<Sec id="method">paper</Sec>)
      </>,
      'Applied in one year, the study’s choice: an impact-year stress test',
    ],
  },
  {
    label: 'Definitions',
    items: [
      <>Cost: income tax, NI and benefits, no corporation tax. Baselines: {BASELINE_LABEL}, not DWP’s published rates</>,
      <>
        <Ref id="hbai">HBAI</Ref> income; the absolute line is fixed at its no-shock value, the relative line is <span data-input="">60%</span> of the median
      </>,
    ],
  },
];

// Two steps, each one sentence about the marks it highlights.
export const CENTRAL_STEPS = [
  {
    id: 'p3-central-step',
    kicker: 'Step 1 · The central case',
    icon: 'jobLoss',
    highlight: ['displaced', 'f-displaced'],
    title: (
      <>
        <Num n={1} mark="displaced" />{' '}
        {CENTRAL_RATE != null ? (
          <InputFig path="headline.central_displaced.note" mark="displaced">
            {fmtInputPct(CENTRAL_RATE)}
          </InputFig>
        ) : (
          'A share'
        )}{' '}
        of employees are <Key id="displaced">jobless all year</Key>, the rate from <Ref id="doorley">Doorley et al. (2026)</Ref>
      </>
    ),
  },
  {
    id: 'p3-central-step-2',
    icon: 'cost',
    highlight: ['f-cost', 'f-poverty', 'f-relative', 'f-gini'],
    title: (
      <>
        <Num n={2} mark="f-cost" /> The year {COSTS ? 'costs the public finances' : 'adds to net receipts'}, {up(H.central_poverty.value)} poverty and {up(H.central_gini.value)} inequality
      </>
    ),
    body: <Fold groups={CENTRAL_FOLD} />,
  },
];

// The scene's marks, for the colour-keyed words.
const CENTRAL_MARKS = {
  displaced: {
    color: 'var(--pe-gray-800)',
    shape: 'square',
    label: 'Employees assumed displaced',
  },
  'f-cost': {
    color: 'var(--pe-gray-800)',
    shape: 'none',
    label: 'Cost to the public finances',
  },
};

export default function Central() {
  return (
    <MarkProvider marks={CENTRAL_MARKS}>
      <Scrolly
        id="p3-central"
        sub={CENTRAL_SUB}
        steps={asLines(CENTRAL_STEPS)}
        graphic={(i, r, ctx) => <CentralFigure ctx={ctx} />}
        label="The central case: people displaced, cost, poverty and inequality, beside their baselines"
      />
    </MarkProvider>
  );
}
