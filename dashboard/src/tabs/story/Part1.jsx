'use client';

import { useEffect } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Items, Recap } from '@/components/story/Items.jsx';
import { Fig, Key, MarkProvider, Num } from '@/components/story/highlight.jsx';
import { iconFor } from '@/lib/concepts.js';
import NextPart from '@/components/story/NextPart.jsx';
import PartHead from './PartHead.jsx';
import { DSIT_AROUND, EXPOSURE_GROUPS, FACTS, LINKS, MODEL_BASE_VINTAGE, OBR, OBR_LABEL, OBR_MARCH_2026, OBR_VINTAGE, SERIES, SOURCES, pageOf, sourceOfPath } from './part1/data.js';
import { AiUseChart, ExposureTiles, LabourBoard, OBR_NAMED, OutputCanvas, P1_MARKS } from './part1/charts.jsx';
import { Ext, SourceLine, Swap } from './part1/frame.jsx';
import Vitals from './part1/vitals.jsx';
import { dateLong, pct1, share0 } from './part1/format.js';

// Part 1: where the UK economy and labour market stand as AI arrives, from
// official published data only (ukContext.json); no forecasts or modelling
// of ours, and the one forecast shown is the OBR's. Every printed figure has
// an entry in ukContextChecks.json, read there from the primary file, and is
// printed once: the UK vitals panel is the home of the seven latest
// figures; the step cards hold the rest.
//
// Three scenes, each a question (Scrolly's question-led sequence), three
// steps and one takeaway. One point per step (Vahid: "someone cannot trace
// the text between the plots"): a step card is a short title, ONE sentence
// of about fifteen words naming what it is about on the chart, and an
// "About these figures" fold whose items are grouped under sub-labels
// (Definition, Caveat, Source, See also; no figures in the fold, since the
// number check reads the rendered text). Each step's `highlight` names the
// chart marks (data-mark, part1/charts.jsx P1_MARKS) its sentence is about;
// the rest dim. Series names in the text are <Key>s in the series colour
// and marker, so they are the legend; numbers in the text are <Fig> chips
// (data-path) that light their mark; where a sentence names several points
// they are numbered (<Num>, NumMark on the chart).
//
// Every old step id and block id stays a link target: a removed step's id
// and a block id now inside a scene sit on an anchor in the card that now
// holds that figure, and a link to one sets that step (useAnchorSteps).
// Under reduced motion the step logic is kept (story.css): only the motion
// goes.

const F = FACTS;
const last = (a) => a[a.length - 1];

// An old id, kept as a link target at the top of the card that now holds it.
const Anchor = ({ id }) => <span id={id} className="p1-anchor" aria-hidden="true" />;

// The one sentence of a step card, led by a plain icon.
const Say = ({ icon, children }) => (
  <p className="p1-say">
    <Icon name={iconFor(icon)} size={16} className="p1-say-icon" />
    <span>{children}</span>
  </p>
);

// Links from a card to the UK vitals tiles that hold its latest figures
// (each figure is printed once, there).
const Latest = ({ tiles }) => (
  <p className="p1-latest">
    <Icon name={iconFor('record')} size={14} className="p1-text-icon" />
    <span>
      Latest in UK vitals:{' '}
      {tiles.map(([k, name], i) => (
        <span key={k}>
          {i ? ' · ' : null}
          <a href={`#p1-vital-${k}`}>{name}</a>
        </span>
      ))}
    </span>
  </p>
);

// "About these figures": closed by default, its items grouped under small
// icon sub-labels. No figures in here.
const FOLD_LABEL = { measure: 'Definition', caveat: 'Caveat', source: 'Source', link: 'See also' };
const About = ({ groups }) => (
  <details className="p1-about">
    <summary>
      <Icon name={iconFor('caveat')} size={14} /> About these figures
    </summary>
    {groups
      .filter((g) => g.items.filter(Boolean).length)
      .map((g) => (
        <div key={g.kind} className="p1-about-group">
          <p className="p1-about-label">
            <Icon name={iconFor(g.kind)} size={13} /> {FOLD_LABEL[g.kind]}
          </p>
          <Items items={g.items.map((text) => (text ? { icon: g.kind, text } : null))} />
        </div>
      ))}
  </details>
);

// A number in a sentence: a chip with its data-path that lights its chart
// mark, linked to its source's readable page (never the CSV download).
const N = ({ path, mark, children }) => (
  <Fig path={path} mark={mark}>
    <Ext href={pageOf(sourceOfPath(path))} className="p1-val-link">
      {children}
    </Ext>
  </Fig>
);

// An attributed caveat: its text linked to the page that says it.
const L = ({ to, children }) => <Ext href={LINKS[to]?.url ?? pageOf(to)}>{children}</Ext>;

const wave = (p) => p.replace(/\s*\(.*$/, '');

// (a) Output: the latest full year, the OBR's forecast, this year's quarters.
// `state` is the canvas state (part1/charts.jsx OutputCanvas).
function outputSteps() {
  const g = F.gdp_growth_latest;
  const gs = SERIES.gdp_growth;
  const low = gs.x[gs.y.indexOf(Math.min(...gs.y))];
  const high = gs.x[gs.y.indexOf(Math.max(...gs.y))];
  const y = F.gdp_quarterly_yoy;
  const lastQ = last(SERIES.gdp_quarterly.x);
  const year = lastQ.slice(0, 4);
  return [
    {
      id: 'p1-output-0',
      icon: 'gdp',
      title: 'The latest full year',
      highlight: ['gdp-latest'],
      state: 0,
      body: (
        <>
          <Say icon="gdp">
            Real GDP {g.value >= 0 ? 'grew' : 'changed by'}{' '}
            <N path="facts.gdp_growth_latest.value" mark="gdp-latest">
              {pct1(g.value)}
            </N>{' '}
            in {g.period}, the <Key id="gdp-latest">latest full calendar year</Key>.
          </Say>
          <About
            groups={[
              { kind: 'measure', items: [`The fall in ${low} and rebound in ${high}: the pandemic`] },
              { kind: 'caveat', items: [<L key="r" to="ons_revisions">The ONS revises recent years as new data arrive</L>] },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p1-output-1',
      icon: 'forecast',
      title: 'The OBR’s forecast',
      highlight: ['obr-forecast'],
      state: 1,
      body: (
        <>
          <Say icon="forecast">
            The <Key id="obr-forecast">OBR forecasts</Key> growth of{' '}
            {OBR_NAMED.map((i, n) => (
              <span key={i}>
                {n === OBR_NAMED.length - 1 ? 'and ' : null}
                <Num n={n + 1} />{' '}
                <N path={`series.obr_gdp_forecast.y.${i === OBR.y.length - 1 ? -1 : i}`} mark="obr-forecast">
                  {pct1(OBR.y[i])}
                </N>{' '}
                in {OBR.x[i]}
                {n < OBR_NAMED.length - 1 ? ', ' : '.'}
              </span>
            ))}
          </Say>
          <About
            groups={[
              { kind: 'source', items: [`The OBR’s central forecast, published ${OBR_VINTAGE}`] },
              { kind: 'caveat', items: [`Drawn apart: the OBR starts from an older ${last(gs.x)} estimate`] },
              {
                kind: 'link',
                items: [
                  <>
                    Part 2’s no-shock path uses the <Ext href={OBR_MARCH_2026}>OBR’s {MODEL_BASE_VINTAGE}</Ext> productivity growth
                  </>,
                ],
              },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p1-quarters-0',
      icon: 'period',
      title: `${year} so far`,
      highlight: ['q-now'],
      state: 2,
      body: (
        <>
          <Anchor id="p1-quarters" />
          <Say icon="period">
            GDP grew in <Key id="q-now">each quarter of {year}</Key>,{' '}
            <N path="facts.gdp_quarterly_yoy.value" mark="q-now">
              {pct1(y.value)}
            </N>{' '}
            {y.value >= 0 ? 'up' : 'down'} on a year earlier by {lastQ.slice(5)}.
          </Say>
          <About groups={[{ kind: 'caveat', items: [<L key="f" to="ons_gdp_first">These are the ONS’s first estimates</L>] }]} />
        </>
      ),
    },
  ];
}

// (b) Work, pay and productivity: one labour board, five series, three
// cards. `focus` is the series in the large panel (charts.jsx boardSeries).
function workSteps() {
  const p = F.productivity_oph_latest;
  return [
    {
      id: 'p1-work-0',
      icon: 'labour',
      title: 'Jobs',
      highlight: ['employment', 'unemployment'],
      focus: 0,
      body: (
        <>
          <Anchor id="p1-work-1" />
          <Say icon="labour">
            <Key id="employment">Employment</Key> is close to its level a year ago; <Key id="unemployment">unemployment</Key> has eased since December.
          </Say>
          <Latest tiles={[['employment', 'employment'], ['unemployment', 'unemployment']]} />
          <About
            groups={[
              { kind: 'measure', items: [<L key="i" to="ons_lm_guide">Unemployment, ILO definition: jobless, looking for work, able to start</L>] },
              { kind: 'source', items: ['Both rates come from the Labour Force Survey'] },
              {
                kind: 'caveat',
                items: [
                  <L key="v" to="ons_lms_bulletin">The ONS says response has improved, but some volatility remains</L>,
                  <L key="l" to="ons_lms_bulletin">The ONS advises focusing on long-term movements</L>,
                ],
              },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p1-pay-0',
      icon: 'pay',
      title: 'Pay',
      highlight: ['pay'],
      focus: 2,
      body: (
        <>
          <Anchor id="p1-pay" />
          <Say icon="pay">
            <Key id="pay">Regular pay growth</Key> has slowed since its 2023 peak, before adjusting for inflation.
          </Say>
          <Latest tiles={[['pay', 'regular pay']]} />
          <About
            groups={[
              { kind: 'measure', items: ['Regular pay leaves out bonuses and arrears'] },
              { kind: 'source', items: [<L key="s" to="ons_awe_qmi">The ONS’s Monthly Wages and Salaries Survey of employers</L>] },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p1-productivity-0',
      icon: 'productivity',
      title: 'Productivity and the employee share',
      highlight: ['productivity', 'share'],
      focus: 3,
      body: (
        <>
          <Anchor id="p1-productivity" />
          <Anchor id="p1-share" />
          <Anchor id="p1-share-0" />
          <Say icon="productivity">
            <Key id="productivity">Output per hour</Key> is back at its 2023 level; the <Key id="share">employee share</Key> of GDP rose in {last(SERIES.labour_share.x)}.
          </Say>
          <Latest tiles={[['productivity', 'output per hour'], ['share', 'employee share']]} />
          <About
            groups={[
              {
                kind: 'measure',
                items: [
                  <L key="p" to="ons_productivity">Output per hour: the ONS’s headline measure, output over hours worked</L>,
                  'Employee share: compensation of employees over GDP, two ONS series',
                  'Compensation: wages, salaries and employers’ contributions',
                ],
              },
              {
                kind: 'caveat',
                items: [`${p.period}: the latest quarter in the ${dateLong(SOURCES[p.source].released)} release`, 'The share leaves out the self-employed’s income'],
              },
            ]}
          />
        </>
      ),
    },
  ];
}

// (c) AI: business use (all, then 10+), then the exposure tiles. `state`:
// 0 and 1 the AI-use chart's states, 2 the grouped tiles.
function aiSteps() {
  const b = F.business_ai_use_10plus;
  const [hh, hl, lo] = EXPOSURE_GROUPS;
  const when = F[hh.id].period.replace(/^IMF estimates?,\s*/, '');
  const w = F.business_ai_use.period.match(/\((.*)\)/)?.[1];
  return [
    {
      id: 'p1-ai-0',
      icon: 'ai',
      title: 'Businesses using AI',
      highlight: ['ai-all'],
      state: 0,
      body: (
        <>
          <Say icon="business">
            AI use among <Key id="ai-all">all businesses</Key> has risen every September since 2023.
          </Say>
          <Latest tiles={[['ai', 'business AI use']]} />
          <About
            groups={[
              { kind: 'measure', items: ['One or more AI technologies in use: text generation, machine learning, others'] },
              { kind: 'source', items: ['The ONS’s Business Insights and Conditions Survey', w ?? null] },
              { kind: 'caveat', items: ['Private sector, weighted by count', 'Left out: agriculture, finance and insurance, public administration, and others'] },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p1-ai-1',
      icon: 'business',
      title: 'Larger businesses',
      highlight: ['ai-ten'],
      state: 1,
      body: (
        <>
          <Say icon="business">
            Use among <Key id="ai-ten">businesses with 10 or more employees</Key> rose faster, to{' '}
            <N path="facts.business_ai_use_10plus.value" mark="ai-ten">
              {pct1(b.value)}
            </N>{' '}
            in {wave(b.period)}.
          </Say>
          <About
            groups={[
              { kind: 'measure', items: ['The same survey and question, for a subset the ONS also reports'] },
              { kind: 'caveat', items: [<L key="w" to="ons_bics_qmi">The ONS notes the smallest businesses carry large survey weights</L>] },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p1-exposure-0',
      icon: 'workers',
      title: 'Workers by exposure to AI',
      highlight: 'none',
      highlightWhy: 'One grid of all UK workers: every tile is in one of the three groups the sentence names, so none is dimmed; the coloured names are the legend.',
      state: 2,
      body: (
        <>
          <Anchor id="p1-exposure" />
          <Anchor id="p1-exposure-1" />
          <Say icon="workers">The IMF sorts UK workers into three groups by their jobs’ exposure to AI:</Say>
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
          <About
            groups={[
              {
                kind: 'source',
                items: [
                  <>
                    IMF estimates (<L to="imf_upskilling">{when}</L>), reported by <L to="dsit_ai_capabilities_2026">DSIT and the AI Security Institute</L>
                  </>,
                ],
              },
              {
                kind: 'caveat',
                items: [<L key="i" to="dsit_ai_capabilities_2026">Such indices are indicative rather than precise, DSIT notes</L>, 'DSIT’s report gives no table by major occupation group'],
              },
            ]}
          />
        </>
      ),
    },
  ];
}

function exposureSource() {
  const [hh] = EXPOSURE_GROUPS;
  return (
    <SourceLine
      items={[{ id: F[hh.id].source, name: 'Assessment of AI capabilities and the impact on the UK labour market', detail: 'Figure 2' }]}
      note={
        <>
          Figure 2 cites IMF, <Ext href={LINKS.imf_upskilling.url}>Upskilling the UK Workforce: United Kingdom</Ext> (July 2024); DSIT’s “around” total cites IMF, <Ext href={LINKS.imf_genai.url}>Gen-AI: Artificial Intelligence and the Future of Work</Ext> (January 2024).
        </>
      }
      through={F[hh.id].period}
    />
  );
}

// Old ids that are now inside a scene: a link to one lands on its card (the
// anchor), then does what that step's dot does, so the scene is in the
// right state however Scrolly maps scroll to steps.
export const ANCHOR_STEP = {
  'p1-quarters': ['p1-output', 2],
  'p1-work-1': ['p1-work', 0],
  'p1-pay': ['p1-work', 1],
  'p1-productivity': ['p1-work', 2],
  'p1-share': ['p1-work', 2],
  'p1-share-0': ['p1-work', 2],
  'p1-exposure': ['p1-ai', 2],
  'p1-exposure-1': ['p1-ai', 2],
};
function useAnchorSteps() {
  useEffect(() => {
    let t = 0;
    const go = () => {
      const hit = ANCHOR_STEP[window.location.hash.slice(1)];
      if (!hit) return;
      window.clearTimeout(t);
      t = window.setTimeout(() => document.querySelectorAll(`#${hit[0]} .scrolly-dots button`)[hit[1]]?.click(), 250);
    };
    go();
    window.addEventListener('hashchange', go);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('hashchange', go);
    };
  }, []);
}

// Each topic's question, hint, takeaway (after the block) and answer chip.
// No new figures: each takeaway holds over the series drawn on the page,
// and part1.test.jsx checks it against the data file. The output and work
// answers restate figures whose home is a step card or the vitals panel, so
// each links there (answerTo: a data-axis link, not a second home); the AI
// answer is the home of the high-exposure total and DSIT's rounded figure.
export const OUTPUT_Q = 'How fast has the UK economy grown?';
export const WORK_Q = 'How are jobs, pay and productivity doing?';
export const AI_Q = 'How widely is AI used, and who is exposed?';
export const OUTPUT_HINT = 'Watch the years after the pandemic';
export const WORK_HINT = 'Five official series, one in focus at a time';
export const AI_HINT = 'Two survey lines, then one grid of workers';
export const OUTPUT_TAKEAWAY = 'Since the pandemic rebound, annual growth has been below most 2010s rates.';
export const WORK_TAKEAWAY = 'A steady labour market, with pay growth slowing and output per hour flat since 2023.';
export const AI_TAKEAWAY = 'Business AI use is rising, fastest in larger firms; most UK workers are in highly exposed jobs (IMF).';

// The answer chips of the output and work scenes, one line each.
export function outputAnswer() {
  const y = F.gdp_quarterly_yoy;
  return `${pct1(F.gdp_growth_latest.value)} in ${F.gdp_growth_latest.period}; ${pct1(y.value)} on a year earlier in ${y.period}`;
}
export function workAnswer() {
  return `Employment ${pct1(F.employment_rate_latest.value)}, unemployment ${pct1(F.unemployment_rate_latest.value)}, pay growth ${pct1(F.pay_growth_latest.value)}`;
}
function AiAnswer() {
  const [hh, hl] = EXPOSURE_GROUPS;
  return (
    <>
      <N path={`facts.${hh.id}.value + facts.${hl.id}.value`}>{share0(hh.value + hl.value)}</N> of UK workers are in highly exposed jobs (IMF);{' '}
      DSIT says around <N path={`facts.${hh.id}.note`}>{share0(DSIT_AROUND)}</N>, citing <L to="imf_genai">IMF (2024)</L>
    </>
  );
}

// The part's recap: each question with a short form of its answer (a chip
// is at most a dozen words), linking back to its scene.
export const p1Recap = () => [
  { icon: 'gdp', q: OUTPUT_Q, a: `${pct1(F.gdp_growth_latest.value)} in ${F.gdp_growth_latest.period}`, text: OUTPUT_Q, to: 'q-p1-output' },
  { icon: 'labour', q: WORK_Q, a: `Unemployment ${pct1(F.unemployment_rate_latest.value)}, pay growth ${pct1(F.pay_growth_latest.value)}`, text: WORK_Q, to: 'q-p1-work' },
  { icon: 'ai', q: AI_Q, a: `${pct1(F.business_ai_use.value)} of businesses`, text: AI_Q, to: 'q-p1-ai' },
];

export default function Part1({ part }) {
  useAnchorSteps();
  const output = outputSteps();
  const work = workSteps();
  const ai = aiSteps();
  return (
    <MarkProvider marks={P1_MARKS}>
      <PartHead
        part={part}
        extra={
          <Items
            className="p1-head-items"
            items={[
              { icon: 'source', text: 'Official statistics; one ratio computed from two ONS series' },
              { icon: 'excluded', text: 'Nothing here is modelled by PolicyEngine; the one forecast is the OBR’s' },
            ]}
          />
        }
      >
        <Icon name={iconFor('gdp')} size={16} className="p1-text-icon" /> The UK economy and labour market before the scenario begins.
      </PartHead>
      <Vitals />
      <Scrolly
        id="p1-output"
        scene
        sub={{ title: 'Output', icon: 'gdp', question: OUTPUT_Q, hint: OUTPUT_HINT, key: 'grown', takeaway: OUTPUT_TAKEAWAY, answer: outputAnswer(), answerTo: 'p1-output-0' }}
        label={`Real GDP growth: by calendar year (ONS outturn), the ${OBR_LABEL}, and by quarter`}
        steps={output}
        graphic={(i) => <OutputCanvas state={output[i]?.state ?? 0} />}
      />
      <Scrolly
        id="p1-work"
        scene
        sub={{ title: 'Work, pay and productivity', icon: 'labour', question: WORK_Q, hint: WORK_HINT, key: 'jobs', takeaway: WORK_TAKEAWAY, answer: workAnswer(), answerTo: 'p1-vitals' }}
        label="Employment, unemployment, regular pay growth, output per hour worked and employees’ share of GDP"
        steps={work}
        graphic={(i) => <LabourBoard focus={work[i]?.focus ?? 0} />}
      />
      <Scrolly
        id="p1-ai"
        scene
        sub={{ title: 'AI arrives', icon: 'ai', question: AI_Q, hint: AI_HINT, key: 'AI', takeaway: AI_TAKEAWAY, answer: <AiAnswer /> }}
        label="Businesses using AI, and UK workers by exposure to AI"
        steps={ai}
        graphic={(i, reduce, ctx) => {
          const s = ai[i]?.state ?? 0;
          return (
            <Swap active={s < 2 ? 0 : 1}>
              <AiUseChart state={Math.min(s, 1)} />
              <ExposureTiles state={s >= 2 ? 1 : 0} source={exposureSource()} entered={ctx?.entered ?? true} />
            </Swap>
          );
        }}
      />
      <Recap items={p1Recap()} />
      <NextPart n={2} title="What a model of the whole economy projects" to="story-part-2">
        Part 2 turns from what has been measured to what happens if AI
        arrives as a shock.
      </NextPart>
    </MarkProvider>
  );
}
