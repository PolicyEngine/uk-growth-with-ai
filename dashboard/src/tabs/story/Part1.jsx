'use client';

import { useEffect } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Items, KeyFacts } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import NextPart from '@/components/story/NextPart.jsx';
import PartHead from './PartHead.jsx';
import { DSIT_AROUND, EXPOSURE_GROUPS, FACTS, LINKS, MODEL_BASE_VINTAGE, OBR, OBR_LABEL, OBR_MARCH_2026, OBR_VINTAGE, SERIES, SOURCES, pageOf, sourceOfPath } from './part1/data.js';
import { AiUseChart, ExposureTiles, LabourBoard, OutputCanvas } from './part1/charts.jsx';
import { Ext, SourceLine, Swap } from './part1/frame.jsx';
import Vitals from './part1/vitals.jsx';
import { dateLong, dirOf, dirWord, pct1, share0 } from './part1/format.js';

// Part 1: where the UK economy and labour market stand as AI arrives, from
// official published data only (ukContext.json); no forecasts or modelling
// of ours, and the one forecast shown is the OBR's. Part 1 is the home of
// these statistics: each figure is printed once, in a step card, and the
// graphics carry no value labels (axis ticks are marked data-axis). Every
// printed figure has an entry in ukContextChecks.json, read there from the
// primary file. Calendar-year series stop at the last full year; the
// current year appears only as quarters or months, labelled as such.
// Three scenes (scene plan 1A, 1B, 1C), each one scrolly block: the
// output canvas (annual bars, the OBR's forecast, then a zoom to this
// year's quarters), the labour board (five series, one in focus per step)
// and AI arrives (business use, then the exposure tiles). Every old step id
// is kept; old block ids that are now inside a scene (p1-quarters, p1-pay,
// p1-productivity, p1-share, p1-exposure) sit on an anchor at the top of
// the step where that figure first shows, so old links still land on it.
// Each card is a short title (with its concept icon), a key-facts row
// holding its figures (each marked with its data-path), and short icon
// items; caveats with no figure go in an "About these figures" disclosure.
// Growth rates carry a small arrow from their sign.
// Under reduced motion the step logic is kept (story.css): a chart part that
// is .is-on shows at once and one that is not stays hidden; only the motion
// goes.

const F = FACTS;
const last = (a) => a[a.length - 1];

// An old block id, kept as a link target at the top of a merged step.
const Anchor = ({ id }) => <span id={id} className="p1-anchor" aria-hidden="true" />;

// A caveat under a card, closed by default, as short items. No figures in
// here: the number check reads the page's rendered text.
const About = ({ items }) => (
  <details className="p1-about">
    <summary>
      <Icon name={iconFor('caveat')} size={14} /> About these figures
    </summary>
    <Items items={items} />
  </details>
);

// A printed figure, marked with its path in ukContext.json and linked to
// its source's readable page (never the CSV download).
const V = ({ path, children }) => (
  <Ext href={pageOf(sourceOfPath(path))} className="p1-val-link">
    <span data-path={path}>{children}</span>
  </Ext>
);

// An attributed caveat: its text linked to the page that says it.
const L = ({ to, children }) => <Ext href={LINKS[to]?.url ?? pageOf(to)}>{children}</Ext>;

// A pointer from a card to its figure's tile in the UK vitals panel (each
// figure is printed once, there).
const Tile = ({ k }) => <a href={`#p1-vital-${k}`}>Latest figure: UK vitals, above</a>;

// A growth rate. Its fact's icon is the arrow for its sign (format.js
// dirOf: icon: dirOf(v)); the arrow is hidden from screen readers, so the
// fact's sub line says the same in words (dirWord).
const Growth = ({ v, path }) => (
  <Ext href={pageOf(sourceOfPath(path))} className="p1-val-link">
    <span className="p1-growth" data-dir={dirOf(v)} data-path={path}>
      {pct1(v)}
    </span>
  </Ext>
);

// (a) Output: annual growth, the OBR's forecast, then this year's quarters.
function outputSteps() {
  const g = F.gdp_growth_latest;
  const gs = SERIES.gdp_growth;
  const low = gs.x[gs.y.indexOf(Math.min(...gs.y))];
  const high = gs.x[gs.y.indexOf(Math.max(...gs.y))];
  const q = F.gdp_quarterly_latest;
  const y = F.gdp_quarterly_yoy;
  const year = q.period.slice(0, 4);
  const obr = [0, 1, OBR.y.length - 1];
  return [
    {
      id: 'p1-output-0',
      icon: 'gdp',
      title: 'How fast the economy has grown',
      body: (
        <>
          <KeyFacts
            className="p1-facts"
            facts={[{ icon: dirOf(g.value), value: <Growth v={g.value} path="facts.gdp_growth_latest.value" />, label: 'real GDP growth', sub: `${g.period}, output ${dirWord(g.value)} on a year earlier` }]}
          />
          <Items
            items={[
              { icon: 'period', text: 'The latest full calendar year the ONS has published' },
              { icon: 'why', text: `The fall in ${low} and rebound in ${high}: the pandemic` },
            ]}
          />
          <About items={[{ icon: 'revision', text: <L to="ons_revisions">The ONS revises recent years as new data arrive</L> }]} />
        </>
      ),
    },
    {
      id: 'p1-output-1',
      icon: 'forecast',
      title: 'The OBR’s forecast',
      body: (
        <>
          <KeyFacts
            className="p1-facts is-three"
            facts={obr.map((i) => ({
              key: OBR.x[i],
              icon: dirOf(OBR.y[i]),
              value: <Growth v={OBR.y[i]} path={`series.obr_gdp_forecast.y.${i === OBR.y.length - 1 ? -1 : i}`} />,
              label: `growth in ${OBR.x[i]}`,
              sub: `forecast, output ${dirWord(OBR.y[i])}`,
            }))}
          />
          <Items
            items={[
              { icon: 'forecast', text: `The OBR’s central forecast, published ${OBR_VINTAGE}` },
              { icon: 'path', text: 'Dashed, with open dots: forecast years' },
              { icon: 'link', text: <>Part 2’s no-shock path uses the <Ext href={OBR_MARCH_2026}>OBR’s {MODEL_BASE_VINTAGE}</Ext> productivity growth</> },
            ]}
          />
          <About
            items={[
              { icon: 'revision', text: `Drawn apart: the OBR starts from an older ${last(gs.x)} estimate` },
              { icon: 'period', text: `${OBR.x[OBR.x.length - 1]} is the last year it covers` },
              { icon: 'forecast', text: `${OBR_VINTAGE} is the OBR’s latest forecast; part 2 uses ${MODEL_BASE_VINTAGE}` },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p1-quarters-0',
      icon: 'period',
      title: `${year} so far`,
      body: (
        <>
          <Anchor id="p1-quarters" />
          <KeyFacts
            className="p1-facts"
            facts={[{ icon: dirOf(y.value), value: <Growth v={y.value} path="facts.gdp_quarterly_yoy.value" />, label: 'real GDP, on a year earlier', sub: `${q.period}, first estimate, ${dirWord(y.value)}` }]}
          />
          <Items
            items={[
              { icon: 'period', text: `${year} is not yet complete: no calendar-year figure` },
              { icon: 'revision', text: <L to="ons_gdp_first">These are the ONS’s first estimates</L> },
              { icon: 'compare', text: 'This year’s quarters in dark, earlier ones in grey' },
            ]}
          />
        </>
      ),
    },
  ];
}

// (b) Work, pay and productivity: one labour board, five series in turn.
function workSteps() {
  return [
    {
      id: 'p1-work-0',
      icon: 'labour',
      title: 'Employment',
      body: (
        <>
          <Items
            items={[
              { icon: 'labour', text: <Tile k="employment" /> },
              { icon: 'measure', text: `People aged 16 to 64 in work; each point a three-month average` },
              { icon: 'survey', text: <L to="ons_lms_bulletin">The ONS says response has improved, but some volatility remains</L> },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p1-work-1',
      icon: 'labour',
      title: 'Unemployment',
      body: (
        <>
          <Items
            items={[
              { icon: 'labour', text: <Tile k="unemployment" /> },
              { icon: 'measure', text: <L to="ons_lm_guide">ILO definition, used by the ONS: jobless, looking, able to start</L> },
              { icon: 'survey', text: 'Both rates come from the Labour Force Survey' },
              { icon: 'caveat', text: <L to="ons_lms_bulletin">The ONS advises focusing on long-term movements, not short-term changes</L> },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p1-pay-0',
      icon: 'pay',
      title: 'Pay',
      body: (
        <>
          <Anchor id="p1-pay" />
          <Items
            items={[
              { icon: 'pay', text: <Tile k="pay" /> },
              { icon: 'excluded', text: 'Regular pay leaves out bonuses and arrears' },
              { icon: 'measure', text: 'On a year earlier, before adjusting for inflation' },
              { icon: 'survey', text: <L to="ons_awe_qmi">From the ONS’s Monthly Wages and Salaries Survey of employers</L> },
            ]}
          />
        </>
      ),
    },
    ...productivitySteps(),
  ];
}

// (c) Productivity, then the labour share.
function productivitySteps() {
  const p = F.productivity_oph_latest;
  const s = F.labour_share_latest;
  return [
    {
      id: 'p1-productivity-0',
      icon: 'productivity',
      title: 'Output per hour worked',
      body: (
        <>
          <Anchor id="p1-productivity" />
          <Items
            items={[
              { icon: 'productivity', text: <Tile k="productivity" /> },
              { icon: 'measure', text: <L to="ons_productivity">The ONS’s headline measure of labour productivity</L> },
              { icon: 'gdp', text: 'Output divided by total hours worked' },
              { icon: 'period', text: `${p.period}: the latest quarter in the ${dateLong(SOURCES[p.source].released)} release` },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p1-share-0',
      icon: 'labourShare',
      title: 'What employees are paid, as a share of GDP',
      body: (
        <>
          <Anchor id="p1-share" />
          <Items
            items={[
              { icon: 'labourShare', text: <Tile k="share" /> },
              { icon: 'measure', text: `Computed from two ONS series: compensation of employees over GDP` },
              { icon: 'period', text: `${s.period}, the latest full calendar year` },
              { icon: 'excluded', text: 'Leaves out the self-employed’s income' },
            ]}
          />
          <About
            items={[
              { icon: 'pay', text: 'Wages, salaries and employers’ contributions' },
              { icon: 'caveat', text: 'So lower than measures of labour’s share that count it' },
            ]}
          />
        </>
      ),
    },
  ];
}

// (d) AI: business use (all, then 10+), then the exposure tiles (one
// block, then the three groups).
function aiSteps() {
  const a = F.business_ai_use;
  const b = F.business_ai_use_10plus;
  const [hh, hl, lo] = EXPOSURE_GROUPS;
  const when = F[hh.id].period.replace(/^IMF estimates?,\s*/, '');
  const wave = a.period.match(/\((.*)\)/)?.[1];
  return [
    {
      id: 'p1-ai-0',
      icon: 'ai',
      title: 'Businesses using AI',
      body: (
        <>
          <Items
            items={[
              { icon: 'business', text: <Tile k="ai" /> },
              { icon: 'survey', text: 'The ONS’s Business Insights and Conditions Survey' },
              { icon: 'ai', text: 'At least one AI technology, in current use' },
            ]}
          />
          <About
            items={[
              { icon: 'caveat', text: 'AI tools such as text generation or machine learning' },
              { icon: 'business', text: 'Private sector, weighted by count; some industries left out' },
              wave ? { icon: 'period', text: wave } : null,
              { icon: 'excluded', text: 'Left out: agriculture, finance and insurance, public administration, among others' },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p1-ai-1',
      icon: 'business',
      title: 'Larger businesses',
      body: (
        <>
          <KeyFacts className="p1-facts" facts={[{ icon: 'business', value: <V path="facts.business_ai_use_10plus.value">{pct1(b.value)}</V>, label: 'with 10 or more employees', sub: 'the same survey wave' }]} />
          <Items
            items={[
              { icon: 'caveat', text: 'The ONS also reports this group' },
              { icon: 'why', text: <L to="ons_bics_qmi">The ONS notes the smallest businesses carry large survey weights</L> },
              { icon: 'survey', text: 'The same survey and question, for a subset of businesses' },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p1-exposure-0',
      icon: 'workers',
      title: 'UK workers',
      body: (
        <>
          <Anchor id="p1-exposure" />
          <Items
            items={[
              { icon: 'workers', text: 'Each tile in the grid is one per cent of UK workers' },
              { icon: 'source', text: <>IMF estimates (<L to="imf_upskilling">{when}</L>), reported by <L to="dsit_ai_capabilities_2026">DSIT and the AI Security Institute</L></> },
              { icon: 'ai', text: 'Sorted by how exposed their occupations are to AI' },
              { icon: 'caveat', text: <L to="dsit_ai_capabilities_2026">Such indices are indicative rather than precise, DSIT notes</L> },
            ]}
          />
          <About items={[{ icon: 'limit', text: 'DSIT’s report gives no table by major occupation group' }]} />
        </>
      ),
    },
    {
      id: 'p1-exposure-1',
      icon: 'ai',
      title: 'Workers by exposure to AI',
      body: (
        <>
          <KeyFacts
            className="p1-facts is-three"
            facts={[
              { icon: 'complement', value: <V path={`facts.${hh.id}.value`}>{share0(hh.value)}</V>, label: 'high exposure, high complementarity' },
              { icon: 'ai', value: <V path={`facts.${hl.id}.value`}>{share0(hl.value)}</V>, label: 'high exposure, low complementarity' },
              { icon: 'workers', value: <V path={`facts.${lo.id}.value`}>{share0(lo.value)}</V>, label: 'low exposure' },
            ]}
          />
          <Items
            items={[
              { icon: 'compare', text: <>The two high-exposure groups sum to <V path={`facts.${hh.id}.value + facts.${hl.id}.value`}>{share0(hh.value + hl.value)}</V></> },
              { icon: 'source', text: <>DSIT’s text says around <V path={`facts.${hh.id}.note`}>{share0(DSIT_AROUND)}</V>, citing <L to="imf_genai">IMF (January 2024)</L></> },
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

// A click on a sparkline does what that step's dot does (Scrolly): on
// desktop and in a sticky phone scene it scrolls to the step, and where the
// figure is drawn once it sets the state.
function pickWork(i) {
  document.querySelectorAll('#p1-work .scrolly-dots button')[i]?.click();
}

// Old ids that are now steps inside a scene: a link to one lands on its
// card (the anchor), then does what that step's dot does, so the scene is
// in the right state however Scrolly maps scroll to steps.
const ANCHOR_STEP = {
  'p1-quarters': ['p1-output', 2],
  'p1-pay': ['p1-work', 2],
  'p1-productivity': ['p1-work', 3],
  'p1-share': ['p1-work', 4],
  'p1-exposure': ['p1-ai', 2],
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

// Each topic's one-line takeaway (Scrolly's opener shows sub.takeaway). No
// new figures; each comparison holds over the series drawn on the page, and
// part1.test.jsx checks it against the data file, so a refresh that breaks
// one fails the tests.
export const OUTPUT_TAKEAWAY = 'Since the pandemic rebound, annual growth has been below most 2010s rates; each quarter of this year has grown.';
export const WORK_TAKEAWAY = 'Unemployment has eased this year and pay growth has slowed from its 2023 peak; output per hour is back at its 2023 level.';
export const AI_TAKEAWAY = 'Business AI use has risen every September since 2023, faster in larger firms; most UK workers are in highly exposed jobs (IMF).';

export default function Part1({ part }) {
  useAnchorSteps();
  return (
    <>
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
        sub={{ title: 'Output', icon: 'gdp', question: 'How fast has the UK economy grown?', takeaway: OUTPUT_TAKEAWAY }}
        label={`Real GDP growth: by calendar year (ONS outturn), the ${OBR_LABEL}, and by quarter`}
        steps={outputSteps()}
        graphic={(i) => <OutputCanvas state={i} />}
      />
      <Scrolly
        id="p1-work"
        scene
        sub={{ title: 'Work, pay and productivity', icon: 'labour', question: 'How are UK jobs, pay and productivity doing, and who gets the income?', takeaway: WORK_TAKEAWAY }}
        label="Employment, unemployment, regular pay growth, output per hour worked and employees’ share of GDP"
        steps={workSteps()}
        graphic={(i) => <LabourBoard focus={i} onPick={pickWork} />}
      />
      <Scrolly
        id="p1-ai"
        scene
        sub={{ title: 'AI arrives', icon: 'ai', question: 'How widely are UK businesses using AI, and which workers are exposed?', takeaway: AI_TAKEAWAY }}
        label="Businesses using AI, and UK workers by exposure to AI"
        steps={aiSteps()}
        graphic={(i, reduce, ctx) => (
          <Swap active={i < 2 ? 0 : 1}>
            <AiUseChart state={Math.min(i, 1)} />
            <ExposureTiles state={i >= 3 ? 1 : 0} source={exposureSource()} entered={ctx?.entered ?? true} />
          </Swap>
        )}
      />
      <NextPart n={2} title="What a model of the whole economy projects" to="story-part-2">
        Part 2 turns from what has been measured to what happens if AI
        arrives as a shock.
      </NextPart>
    </>
  );
}
