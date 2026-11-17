'use client';

import { useEffect } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Fig, Key, MarkProvider } from '@/components/story/highlight.jsx';
import PartHead from './PartHead.jsx';
import { DSIT_AROUND, EXPOSURE_GROUPS, FACTS, LINKS, OBR, OBR_LABEL, OBR_VINTAGE, SERIES, SOURCES, pageOf } from './part1/data.js';
import { AiUseChart, ExposureTiles, LabourBoard, OBR_NAMED, OutputCanvas, P1_MARKS } from './part1/charts.jsx';
import { Ext, SourceLine, Swap } from './part1/frame.jsx';
import Vitals from './part1/vitals.jsx';
import { dateLong, pct1, share0 } from './part1/format.js';

// Part 1: where the UK economy and labour market stand as AI arrives, from
// official published data only (ukContext.json); no forecasts or modelling
// of ours, and the one forecast shown is the OBR's. Every printed figure has
// an entry in ukContextChecks.json, read there from the primary file, and is
// printed once: the UK vitals panel is the home of the seven latest
// figures (and GDP's year-on-year growth); the step cards, two chart
// labels and the AI closing line hold the rest.
//
// Three scenes, each a question (Scrolly's question-led sequence) and one
// closing line (sub.answer). A step card is ONE sentence naming the one
// series or mark in focus, with that term emphasised in its mark's colour
// (<Key>). Numbers in a sentence are <Fig>s (data-path) that light their
// mark; they are not links: each figure's sources are in its one source
// line, and its definitions and caveats in that line's "Sources and notes"
// fold (no figures there, since the number check reads the rendered text).
//
// Every old step id and block id stays a link target: a removed step's id
// and a block id now inside a scene sit on an anchor in the card (or the
// vitals tile) that now holds that figure, and a link to one sets that
// step (useAnchorSteps). Under reduced motion the step logic is kept
// (story.css): only the motion goes.

const F = FACTS;
const last = (a) => a[a.length - 1];

// An old id, kept as a link target at the top of the card that now holds it.
const Anchor = ({ id }) => <span id={id} className="p1-anchor" aria-hidden="true" />;

// The one sentence of a step card.
const Say = ({ children }) => <p className="p1-say">{children}</p>;

// A number in a sentence, with its data-path, lighting its chart mark.
const N = ({ path, mark, children }) => (
  <Fig path={path} mark={mark}>
    {children}
  </Fig>
);

// An attributed caveat: its text linked to the page that says it.
const L = ({ to, children }) => <Ext href={LINKS[to]?.url ?? pageOf(to)}>{children}</Ext>;

// (a) Output: the latest full year, then the OBR's forecast. `state` is
// the canvas state (part1/charts.jsx OutputCanvas). This year's quarters
// are in the vitals GDP tile (#p1-quarters is its anchor).
function outputSteps() {
  const g = F.gdp_growth_latest;
  return [
    {
      id: 'p1-output-0',
      icon: 'gdp',
      title: 'The latest full year',
      highlight: ['gdp-latest'],
      state: 0,
      body: (
        <Say>
          Real GDP {g.value >= 0 ? 'grew' : 'changed by'}{' '}
          <N path="facts.gdp_growth_latest.value" mark="gdp-latest">
            {pct1(g.value)}
          </N>{' '}
          in {g.period}, the <Key id="gdp-latest">latest full calendar year</Key>.
        </Say>
      ),
    },
    {
      id: 'p1-output-1',
      icon: 'forecast',
      title: 'The OBR’s forecast',
      highlight: ['obr-forecast'],
      state: 1,
      body: (
        <Say>
          The <Key id="obr-forecast">OBR forecasts</Key> growth of{' '}
          {OBR_NAMED.map((i, n) => (
            <span key={i}>
              {n === OBR_NAMED.length - 1 ? 'and ' : null}
              <N path={`series.obr_gdp_forecast.y.${i === OBR.y.length - 1 ? -1 : i}`} mark="obr-forecast">
                {pct1(OBR.y[i])}
              </N>{' '}
              in {OBR.x[i]}
              {n < OBR_NAMED.length - 1 ? ', ' : '.'}
            </span>
          ))}
        </Say>
      ),
    },
  ];
}

// The output figure's notes (its one fold): what the earlier cards' folds
// said, no figures.
function outputNotes() {
  const gs = SERIES.gdp_growth;
  const low = gs.x[gs.y.indexOf(Math.min(...gs.y))];
  const high = gs.x[gs.y.indexOf(Math.max(...gs.y))];
  return [
    `The fall in ${low} and rebound in ${high}: the pandemic.`,
    <L key="r" to="ons_revisions">
      The ONS revises recent years as new data arrive.
    </L>,
    `The OBR’s latest central forecast, published ${OBR_VINTAGE}; drawn apart from the outturn, as the OBR starts from an older ${last(gs.x)} estimate.`,
  ];
}

// (b) Work, pay and productivity: one panel, three series, one per card.
// `focus` is the series in the panel (charts.jsx boardSeries).
function workSteps() {
  return [
    {
      id: 'p1-work-0',
      icon: 'labour',
      title: 'Jobs',
      highlight: ['employment'],
      focus: 0,
      body: (
        <>
          <Anchor id="p1-work-1" />
          <Say>
            <Key id="employment">Employment</Key> is close to its level a year ago.
          </Say>
        </>
      ),
    },
    {
      id: 'p1-pay-0',
      icon: 'pay',
      title: 'Pay',
      highlight: ['pay'],
      focus: 1,
      body: (
        <>
          <Anchor id="p1-pay" />
          <Say>
            <Key id="pay">Regular pay growth</Key> has slowed since its 2023 peak, before adjusting for inflation.
          </Say>
        </>
      ),
    },
    {
      id: 'p1-productivity-0',
      icon: 'productivity',
      title: 'Productivity',
      highlight: ['productivity'],
      focus: 2,
      body: (
        <>
          <Anchor id="p1-productivity" />
          <Anchor id="p1-share" />
          <Anchor id="p1-share-0" />
          <Say>
            <Key id="productivity">Output per hour</Key> is back at its 2023 level.
          </Say>
        </>
      ),
    },
  ];
}

// The labour board's notes (its one fold), for all three series.
function workNotes() {
  const p = F.productivity_oph_latest;
  return [
    [
      'The employment and unemployment rates come from the Labour Force Survey.',
      <L key="v" to="ons_lms_bulletin">
        The ONS says response has improved, but some volatility remains.
      </L>,
      <L key="l" to="ons_lms_bulletin">
        The ONS advises focusing on long-term movements.
      </L>,
    ],
    [
      'Regular pay leaves out bonuses and arrears.',
      <L key="s" to="ons_awe_qmi">
        The ONS’s Monthly Wages and Salaries Survey of employers.
      </L>,
    ],
    [
      <L key="p" to="ons_productivity">
        Output per hour: the ONS’s headline measure, output over hours worked.
      </L>,
      `${p.period}: the latest quarter in the ${dateLong(SOURCES[p.source].released)} release.`,
    ],
  ].flat();
}

// (c) AI: business use (both lines), then the exposure tiles. `state`: 0
// the AI-use chart, 1 the grouped tiles.
function aiSteps() {
  const [hh, hl, lo] = EXPOSURE_GROUPS;
  return [
    {
      id: 'p1-ai-0',
      icon: 'ai',
      title: 'Businesses using AI',
      highlight: ['ai-all', 'ai-ten'],
      state: 0,
      body: (
        <>
          <Anchor id="p1-ai-1" />
          <Say>
            AI use has risen every September since 2023, fastest in <Key id="ai-ten">larger businesses</Key>.
          </Say>
        </>
      ),
    },
    {
      id: 'p1-exposure-0',
      icon: 'workers',
      title: 'Workers by exposure to AI',
      highlight: 'none',
      highlightWhy: 'One grid of all UK workers: every tile is in one of the three groups the key names, so none is dimmed; the coloured names are the legend.',
      state: 1,
      body: (
        <>
          <Anchor id="p1-exposure" />
          <Anchor id="p1-exposure-1" />
          <Say>
            The IMF sorts UK workers into three groups by AI exposure; DSIT rounds the two high groups to around{' '}
            <N path={`facts.${hh.id}.note`}>{share0(DSIT_AROUND)}</N>.
          </Say>
          <ul className="p1-groups-say">
            {[hh, hl, lo].map((g) => (
              <li key={g.id}>
                <Key id={g.id}>{g.name}</Key>{' '}
                <N path={`facts.${g.id}.value`} mark={g.id}>
                  {share0(g.value)}
                </N>
              </li>
            ))}
          </ul>
        </>
      ),
    },
  ];
}

function aiNotes() {
  const w = F.business_ai_use.period.match(/\((.*)\)/)?.[1];
  return [
    'One or more AI technologies in use: text generation, machine learning, others.',
    w ? `The ONS’s Business Insights and Conditions Survey, ${w}.` : null,
    'Private sector, weighted by count; left out: agriculture, finance and insurance, public administration, and others.',
    'Businesses with 10 or more employees: the same survey and question, for a subset the ONS also reports.',
    <L key="w" to="ons_bics_qmi">
      The ONS notes the smallest businesses carry large survey weights.
    </L>,
  ];
}

function exposureSource() {
  const [hh] = EXPOSURE_GROUPS;
  const when = F[hh.id].period.replace(/^IMF estimates?,\s*/, '');
  return (
    <SourceLine
      items={[
        {
          id: F[hh.id].source,
          name: 'Assessment of AI capabilities and the impact on the UK labour market',
          detail: 'Figure 2',
        },
      ]}
      note={
        <>
          Figure 2 cites IMF, <Ext href={LINKS.imf_upskilling.url}>Upskilling the UK Workforce: United Kingdom</Ext> ({when}); DSIT’s rounded total cites IMF, <Ext href={LINKS.imf_genai.url}>Gen-AI: Artificial Intelligence and the Future of Work</Ext> (January 2024).
        </>
      }
      notes={[
        <L key="i" to="dsit_ai_capabilities_2026">
          Such indices are indicative rather than precise, DSIT notes.
        </L>,
        'DSIT’s report gives no table by major occupation group.',
      ]}
      through={F[hh.id].period}
    />
  );
}

// Old ids that are now inside a scene: a link to one lands on its card (the
// anchor), then goes to that step (Scrolly's 'scrolly-go'), so the scene is in the
// right state however Scrolly maps scroll to steps.
// (#p1-quarters is now an anchor on the vitals GDP tile, a plain link.)
export const ANCHOR_STEP = {
  'p1-work-1': ['p1-work', 0],
  'p1-pay': ['p1-work', 1],
  'p1-productivity': ['p1-work', 2],
  'p1-share': ['p1-work', 2],
  'p1-share-0': ['p1-work', 2],
  'p1-ai-1': ['p1-ai', 0],
  'p1-exposure': ['p1-ai', 1],
  'p1-exposure-1': ['p1-ai', 1],
};
function useAnchorSteps() {
  useEffect(() => {
    let t = 0;
    const go = () => {
      const hit = ANCHOR_STEP[window.location.hash.slice(1)];
      if (!hit) return;
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        document.getElementById(hit[0])?.dispatchEvent(new CustomEvent('scrolly-go', { detail: hit[1] }));
      }, 250);
    };
    go();
    window.addEventListener('hashchange', go);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('hashchange', go);
    };
  }, []);
}

// Each topic's question, hint and closing line. The output and work
// closing lines hold no figures (each holds over the series drawn on the
// page; part1.test.jsx checks them against the data file); the AI line is
// the home of business AI use and the high-exposure total (review T3);
// DSIT's rounded figure is in the exposure card.
export const OUTPUT_Q = 'How fast has the UK economy grown?';
export const WORK_Q = 'How are jobs, pay and productivity doing?';
export const AI_Q = 'Who uses AI, and who is exposed?';
export const OUTPUT_HINT = 'Watch the years after the pandemic';
export const WORK_HINT = 'Three official series, one at a time';
export const AI_HINT = 'Two survey lines, then one grid of workers';
export const OUTPUT_TAKEAWAY = 'Since the pandemic rebound, annual growth has been below most 2010s rates.';
export const WORK_TAKEAWAY = 'A steady labour market: pay growth slowing, output per hour flat since 2023.';

function AiAnswer() {
  const [hh, hl] = EXPOSURE_GROUPS;
  return (
    <>
      <N path="facts.business_ai_use.value" mark="ai-all">
        {pct1(F.business_ai_use.value)}
      </N>{' '}
      of businesses use AI; <N path={`facts.${hh.id}.value + facts.${hl.id}.value`}>{share0(hh.value + hl.value)}</N> of UK workers are in highly exposed jobs (IMF).
    </>
  );
}

// The part's recap, as data: each question with a short form of its answer
// (a chip is at most a dozen words), linking back to its scene. Part 2's
// first pinned screen replays it as the transition.
export const P1_RECAP = [
  { icon: 'gdp', q: OUTPUT_Q, a: `${pct1(F.gdp_growth_latest.value)} in ${F.gdp_growth_latest.period}`, text: OUTPUT_Q, to: 'q-p1-output' },
  { icon: 'labour', q: WORK_Q, a: `Unemployment ${pct1(F.unemployment_rate_latest.value)}, pay growth ${pct1(F.pay_growth_latest.value)}`, text: WORK_Q, to: 'q-p1-work' },
  { icon: 'ai', q: AI_Q, a: `${pct1(F.business_ai_use.value)} of firms; ${share0(EXPOSURE_GROUPS[0].value + EXPOSURE_GROUPS[1].value)} exposed`, text: AI_Q, to: 'q-p1-ai' },
];

export default function Part1({ part }) {
  useAnchorSteps();
  const output = outputSteps();
  const work = workSteps();
  const ai = aiSteps();
  const outNotes = outputNotes();
  const aiN = aiNotes();
  const workN = workNotes();
  return (
    <MarkProvider marks={P1_MARKS}>
      <PartHead part={part}>The UK economy and labour market before the scenario begins, from official statistics only.</PartHead>
      <Vitals />
      <Scrolly
        id="p1-output"
        scene
        sub={{ title: 'Output', icon: 'gdp', pin: 'full', question: OUTPUT_Q, hint: OUTPUT_HINT, key: 'grown', answer: OUTPUT_TAKEAWAY }}
        label={`Real GDP growth: by calendar year (ONS outturn) and the ${OBR_LABEL}`}
        steps={output}
        graphic={(i) => <OutputCanvas state={output[i]?.state ?? 0} notes={outNotes} />}
      />
      <Scrolly
        id="p1-work"
        scene
        sub={{ title: 'Work, pay and productivity', icon: 'labour', question: WORK_Q, hint: WORK_HINT, key: 'jobs', answer: WORK_TAKEAWAY }}
        label="Employment, regular pay growth and output per hour worked"
        steps={work}
        graphic={(i) => <LabourBoard focus={work[i]?.focus ?? 0} notes={workN} />}
      />
      <Scrolly
        id="p1-ai"
        scene
        sub={{ title: 'AI arrives', icon: 'ai', question: AI_Q, hint: AI_HINT, key: 'AI', answer: <AiAnswer /> }}
        label="Businesses using AI, and UK workers by exposure to AI"
        steps={ai}
        graphic={(i, reduce, ctx) => {
          const s = ai[i]?.state ?? 0;
          return (
            <Swap active={s}>
              <AiUseChart notes={aiN} />
              <ExposureTiles state={s} source={exposureSource()} entered={ctx?.entered ?? true} />
            </Swap>
          );
        }}
      />
    </MarkProvider>
  );
}
