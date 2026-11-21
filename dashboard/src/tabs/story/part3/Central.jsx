'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { TileField } from '@/components/story/primitives.jsx';
import CountUp from '@/components/story/CountUp.jsx';
import { fmtBn, fmtMillions, fmtPct1, fmtPp, fmtPpSpread } from './format.js';
import { fmtGiniLevel, fmtGiniPts, giniLevel } from '@/tabs/households/figures.js';
import { Essential } from '@/components/ui/SourceLine.jsx';
import { AxisTitle, D, FigureHead, MODEL_YEAR, Key, MarkProvider, Source, entryClass, markProps, useBeat, asLines } from './shared.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { ChartHover } from '@/components/story/chart/index.js';

// Step 1, the main case (results.tex, "The central scenario"). The
// scoreboard is the home of the headline figures, each beside its baseline:
// a number, one label, one sub-line, no icons. Its notes say, once each, that
// the cost is net of two assumed gains (their sizes are in the next scene)
// and that "upper bound" qualifies the poverty rise, not the cost.

const H = D.headline;
// the title is a finding (story-finding-titles-fable.md), true of the
// study's two poverty measures (both before housing costs)
const POVERTY_FINDING = H.central_poverty.value > H.central_poverty_relative.value && H.central_poverty_relative.value > 0;
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

// The scoreboard: number, a short label and the baseline as `sub`; the
// cost's spread across draws sits under the cost.
const FACTS = [
  {
    key: 'displaced',
    value: fmtMillions(H.central_displaced.value),
    label: 'employees assumed displaced',
  },
  {
    key: 'cost',
    value: fmtBn(H.central_cost.value),
    label: 'cost to government, a year',
    // the spread is across random draws of who loses their job, not across
    // assumptions (Maria M2; the SD of the draws in the data): said in full
    // in the figure's notes, the fact keeps to 12 words
    sub: `varies by about ${fmtBn(H.central_cost.sd)} across draws`,
  },
  {
    key: 'poverty',
    value: fmtPp(H.central_poverty.value),
    label: 'absolute poverty, before housing costs',
    sub: `from ${fmtPct1(B.absolute_bhc_pct.value)} of people`,
  },
  {
    key: 'relative',
    value: fmtPp(H.central_poverty_relative.value),
    label: 'relative poverty, before housing costs',
    sub: `from ${fmtPct1(B.relative_bhc_pct.value)}`,
  },
  {
    key: 'gini',
    // the change and its level on one scale, 0 to 100 (review round 1, R1-06)
    value: fmtGiniPts(H.central_gini.value),
    label: 'Gini coefficient, 0 to 100',
    sub: `from ${fmtGiniLevel(giniLevel(B.gini))}`,
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
      // round 2 (B9): employees in a mid grey, so the grid reads on white
      color: out && on ? 'var(--pe-gray-800)' : 'var(--pe-gray-300)',
      group: out ? 'displaced' : 'employees',
      delay: out ? y * 80 : 0,
    };
  });
}

const TILE_TIPS = [
  {
    head: 'Employees assumed displaced',
    rows: [
      { name: 'People', value: fmtMillions(H.central_displaced.value), icon: 'jobLoss' },
      ...(CENTRAL_RATE == null ? [] : [{ name: 'Share of employees', value: `${CENTRAL_RATE}%`, icon: 'jobLoss' }]),
    ],
    unit: `Main case, ${MODEL_YEAR}; one tile is one per cent of employees. The household study.`,
    kind: 'input',
  },
];

function CentralFigure({ ctx }) {
  const { attach, ...e } = useBeat(ctx?.entered ?? true);
  const tiles = centralTiles(e.on);
  // each fact a mark (data-mark="f-<key>"); the count-up restarts when the
  // entry beat plays (after the topic opener), not while it covers the figure
  const facts = FACTS.map((f) => ({
    ...f,
    value: <CountUp key={`${e.run}-${e.on}`} value={f.value} />,
  }));
  return (
    <figure ref={attach} className={entryClass(e, `p3-figure p3-scene`)}>
      <FigureHead
        icon="jobLoss"
        title={POVERTY_FINDING ? 'Absolute poverty rises more than relative poverty' : `The main case, ${MODEL_YEAR}`}
        fallback={!POVERTY_FINDING}
        unit={
          // phones: two lines (phone-type-vs-sticky-fable.md); the tile key
          // under the tiles and the source line carry the rest
          <>
            <span className="p3-long">{`One tile is one per cent of employees; changes against the study’s baseline, ${MODEL_YEAR}. Mean of ${H.central_cost.draws} draws. The household study.`}</span>
            <span className="p3-short">{`Changes against the study’s baseline, ${MODEL_YEAR}. Mean of ${H.central_cost.draws} draws.`}</span>
          </>
        }
        replay={e.replay}
        source={<CentralSource />}
      />
      <div className="p3-central">
        {/* hover (M4): the tile grid's one quantity, from the data */}
        <ChartHover label="Employees assumed displaced in the main case" items={TILE_TIPS}>
        <div {...markProps('displaced', 'p3-central-tiles')} data-tip={0}>
          <p className="p3-tile-heads">
            <AxisTitle axis="x">Employees</AxisTitle>
            <span className="p3-tile-head-out">Assumed displaced</span>
          </p>
          <TileField tiles={tiles} width={10 + 1 + GAP_COLS} height={10} size={14} gap={3} label="Tile grid of employees; the tiles set apart in ink are those assumed displaced in the main case" />
          <p className="p3-tile-key" data-axis="">
            <AxisTitle axis="y">
              <span className="p3-long">Share of employees, one tile = 1%</span>
              <span className="p3-short">One tile = 1%</span>
            </AxisTitle>
          </p>
        </div>
        </ChartHover>
        <ul className="story-facts p3-facts">
          {facts.map((f) => (
            <li key={f.key} {...markProps(`f-${f.key}`, 'story-fact')}>
              <span className="story-fact-value">{f.value}</span>{' '}
              <span className="story-fact-label">{f.label}</span>
              {f.sub ? <>{' '}<span className="story-fact-sub">{f.sub}</span></> : null}
            </li>
          ))}
        </ul>
      </div>
      <Essential icon="limit">Poverty rise is an upper bound: the displaced are jobless all year</Essential>
    </figure>
  );
}

// The topic opener: a neutral question the block answers, its hint, and the
// closing line (the scene's own figures, by the same formatters).
const moveBy = (v) => (v > 0 ? 'rises by' : v < 0 ? 'falls by' : 'changes by');
const COSTS = H.central_cost.value > 0;
// whether full take-up costs more than the main case on the same draws
const lad = (id) => D.ladder.find((r) => r.id === id)?.cost_bn;
const TAKEUP_RAISES = lad('takeup') > lad('central_20');
export const CENTRAL_SUB = {
  title: 'The main case',
  icon: 'jobLoss',
  question: 'What happens in the main case?',
  hint: 'Watch who steps out of the grid',
  // beat B4 (the 7%) sits above this scene, so its question takes the
  // in-figure form, not the full pinned screen (story-beats-fable.md)
  key: 'central',
  answerTo: 'p3-central-step',
  answer: `${fmtBn(H.central_cost.value)} a year; poverty ${fmtPp(H.central_poverty.value)}`,
};

// Two steps, each one sentence about the marks it highlights; no folds.
export const CENTRAL_STEPS = [
  {
    id: 'p3-central-step',
    icon: 'jobLoss',
    highlight: ['displaced', 'f-displaced'],
    title: (
      // the rate is beat B4's numeral (its home); the step does not print
      // it. Its source (Doorley et al.) is in the figure's notes.
      CENTRAL_RATE != null ? (
        <>
          The study assumes these employees lose their jobs to AI and stay <Key id="displaced">jobless all year</Key>
        </>
      ) : (
        <>
          A share of employees are <Key id="displaced">jobless all year</Key>
        </>
      )
    ),
  },
  {
    id: 'p3-central-step-2',
    icon: 'cost',
    highlight: ['f-cost', 'f-poverty', 'f-relative', 'f-gini'],
    // T14; the two figures restate the tiles they light (their home): data-axis
    title: (
      <>
        After assumed pay and capital-income gains, the {COSTS ? 'cost' : 'gain'} is <span data-axis="">{fmtBn(Math.abs(H.central_cost.value))}</span> a year. Absolute poverty{' '}
        {moveBy(H.central_poverty.value)} <span data-axis="">{fmtPpSpread(H.central_poverty.value)}</span>
      </>
    ),
  },
];

// The scene's marks, for the colour-keyed words.
const CENTRAL_MARKS = {
  'f-displaced': { color: 'var(--pe-gray-800)', shape: 'none', label: 'their number' },
  'f-poverty': { color: 'var(--pe-gray-800)', shape: 'none', label: 'absolute poverty' },
  'f-relative': { color: 'var(--pe-gray-800)', shape: 'none', label: 'relative poverty' },
  'f-gini': { color: 'var(--pe-gray-800)', shape: 'none', label: 'Gini coefficient' },
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

// The figure's notes and sources, behind its "Sources and notes" button.
function CentralSource() {
  return (
    <Source
      files={[H.central_cost.file, B.absolute_bhc_pct.file, B.gini.file]}
      refs={['doorley']}
      groups={[
        {
          title: 'Assumptions',
          notes: [
            {
              icon: 'jobLoss',
              text: (
                <>
                  Where the rate comes from, and its range:{' '}
                  <NavLink tab="method" sub="households" anchor="hm-shock">
                    Method, the shock
                  </NavLink>
                </>
              ),
            },
          ],
        },
        {
          title: 'How it’s counted',
          notes: [
            {
              icon: 'draws',
              text: 'The cost’s spread is across random draws of who loses their job, not across assumptions.',
            },
            { icon: 'poverty', text: <>After housing costs, absolute poverty {fmtPp(H.central_poverty_ahc.value)}.</> },
            {
              icon: 'takeUp',
              text: (
                <>
                  {TAKEUP_RAISES ? 'The cost is not an upper bound: fuller benefit take-up raises it' : 'Fuller benefit take-up moves the cost'} (
                  <NavLink tab="explore" sub="households" anchor="hh-ladder">
                    Explore, households
                  </NavLink>
                  ).
                </>
              ),
            },
          ],
        },
      ]}
    />
  );
}

export default function Central() {
  return (
    <MarkProvider marks={CENTRAL_MARKS}>
      <Scrolly
        id="p3-central"
        scene
        sub={CENTRAL_SUB}
        steps={asLines(CENTRAL_STEPS)}
        graphic={(i, r, ctx) => <CentralFigure ctx={ctx} />}
        label="The main case: people displaced, cost, poverty and inequality, beside their baselines"
      />
    </MarkProvider>
  );
}
