'use client';

import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Items, KeyFacts } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import NextPart from '@/components/story/NextPart.jsx';
import PartHead from './PartHead.jsx';
import { DSIT_AROUND, EXPOSURE_GROUPS, FACTS, MODEL_BASE_VINTAGE, OBR, OBR_LABEL, OBR_VINTAGE, SERIES } from './part1/data.js';
import { AiUseChart, ExposureTiles, LabourBoard, OutputCanvas } from './part1/charts.jsx';
import { SourceLine, Swap } from './part1/frame.jsx';
import { dirOf, dirWord, idx1, pct1, share0 } from './part1/format.js';

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

// A printed figure, marked with its path in ukContext.json.
const V = ({ path, children }) => <span data-path={path}>{children}</span>;

// A growth rate. Its fact's icon is the arrow for its sign (format.js
// dirOf: icon: dirOf(v)); the arrow is hidden from screen readers, so the
// fact's sub line says the same in words (dirWord).
const Growth = ({ v, path }) => (
  <span className="p1-growth" data-dir={dirOf(v)} data-path={path}>
    {pct1(v)}
  </span>
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
          <About items={[{ icon: 'revision', text: 'The latest years are open to revision' }]} />
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
              sub: `output ${dirWord(OBR.y[i])}`,
            }))}
          />
          <Items
            items={[
              { icon: 'forecast', text: `The OBR’s central forecast, published ${OBR_VINTAGE}` },
              { icon: 'link', text: `Part 2’s modelling starts from the OBR’s ${MODEL_BASE_VINTAGE} forecast` },
            ]}
          />
          <About
            items={[
              { icon: 'path', text: 'Every year on the dashed line is a forecast' },
              { icon: 'revision', text: `Drawn apart: the OBR starts from an older ${last(gs.x)} estimate` },
              { icon: 'period', text: `${OBR.x[OBR.x.length - 1]} is the last year it covers` },
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
            facts={[
              { icon: dirOf(q.value), value: <Growth v={q.value} path="facts.gdp_quarterly_latest.value" />, label: 'real GDP, on the previous quarter', sub: `${q.period}, output ${dirWord(q.value)}` },
              { icon: dirOf(y.value), value: <Growth v={y.value} path="facts.gdp_quarterly_yoy.value" />, label: 'real GDP, on a year earlier', sub: `${q.period}, output ${dirWord(y.value)}` },
            ]}
          />
          <Items
            items={[
              { icon: 'period', text: `${year} is not yet complete: no calendar-year figure` },
              { icon: 'revision', text: 'These are the ONS’s first estimates' },
            ]}
          />
        </>
      ),
    },
  ];
}

// (b) Work, pay and productivity: one labour board, five series in turn.
function workSteps() {
  const e = F.employment_rate_latest;
  const u = F.unemployment_rate_latest;
  const p = F.pay_growth_latest;
  return [
    {
      id: 'p1-work-0',
      icon: 'labour',
      title: 'Employment',
      body: (
        <>
          <KeyFacts className="p1-facts" facts={[{ icon: 'labour', value: <V path="facts.employment_rate_latest.value">{pct1(e.value)}</V>, label: 'employment rate', sub: `aged 16 to 64, ${e.period}` }]} />
          <Items items={[{ icon: 'measure', text: 'Each point is a three-month average' }]} />
        </>
      ),
    },
    {
      id: 'p1-work-1',
      icon: 'labour',
      title: 'Unemployment',
      body: (
        <>
          <KeyFacts className="p1-facts" facts={[{ icon: 'labour', value: <V path="facts.unemployment_rate_latest.value">{pct1(u.value)}</V>, label: 'unemployment rate', sub: `aged 16 and over, ${u.period}` }]} />
          <Items
            items={[
              { icon: 'survey', text: 'Both rates come from the Labour Force Survey' },
              { icon: 'caveat', text: 'The ONS advises focusing on long-term movements, not short-term changes' },
            ]}
          />
          <About items={[{ icon: 'survey', text: 'Survey response has improved, but some volatility remains' }]} />
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
          <KeyFacts className="p1-facts" facts={[{ icon: dirOf(p.value), value: <Growth v={p.value} path="facts.pay_growth_latest.value" />, label: 'regular pay growth', sub: `${p.period}, pay ${dirWord(p.value)}` }]} />
          <Items
            items={[
              { icon: 'excluded', text: 'Regular pay leaves out bonuses' },
              { icon: 'measure', text: 'On a year earlier, before adjusting for inflation' },
              { icon: 'survey', text: 'From employers’ payrolls, not a household survey' },
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
          <KeyFacts className="p1-facts" facts={[{ icon: 'productivity', value: <V path="facts.productivity_oph_latest.value"> {idx1(p.value)} </V>, label: 'output per hour worked', sub: `${p.period}, index 2023 = 100` }]} />
          <Items
            items={[
              { icon: 'measure', text: 'The main measure of labour productivity' },
              { icon: 'period', text: 'The latest quarter published' },
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
          <KeyFacts className="p1-facts" facts={[{ icon: 'labourShare', value: <V path="facts.labour_share_latest.value">{pct1(s.value)}</V>, label: 'of GDP paid to employees', sub: `${s.period}, the latest full year` }]} />
          <Items
            items={[
              { icon: 'measure', text: 'Compensation of employees divided by GDP at current prices' },
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
  const month = a.period.replace(/\s*\(.*$/, '');
  const wave = a.period.match(/\((.*)\)/)?.[1];
  return [
    {
      id: 'p1-ai-0',
      icon: 'ai',
      title: 'Businesses using AI',
      body: (
        <>
          <KeyFacts className="p1-facts" facts={[{ icon: 'business', value: <V path="facts.business_ai_use.value">{pct1(a.value)}</V>, label: 'of businesses use AI', sub: month }]} />
          <Items
            items={[
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
              { icon: 'caveat', text: 'The ONS often leads with this group' },
              { icon: 'why', text: 'Results for the smallest businesses carry large survey weights' },
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
              { icon: 'source', text: `IMF estimates (${when}), reported by the science department (DSIT)` },
              { icon: 'ai', text: 'Sorted by how exposed their occupations are to AI' },
            ]}
          />
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
              { icon: 'source', text: <>DSIT’s text says around <V path={`facts.${hh.id}.note`}>{share0(DSIT_AROUND)}</V></> },
            ]}
          />
          <About
            items={[
              { icon: 'caveat', text: 'Such indices are indicative rather than precise, DSIT notes' },
              { icon: 'limit', text: 'No official table gives exposure by major occupation group' },
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
      note="Citing IMF, Gen-AI: Artificial Intelligence and the Future of Work."
    />
  );
}

// The labour board's steps, in focus order: a click on a sparkline brings
// that step across the trigger line (useActiveStep: 55% of the viewport on
// desktop, 88% at 900px and below), the same as scrolling to it.
const WORK_STEPS = ['p1-work-0', 'p1-work-1', 'p1-pay-0', 'p1-productivity-0', 'p1-share-0'];
function pickWork(i) {
  const el = document.getElementById(WORK_STEPS[i]);
  if (!el) return;
  const phone = window.matchMedia?.('(max-width: 900px)').matches;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const line = window.innerHeight * (phone ? 0.88 : 0.55);
  const r = el.getBoundingClientRect();
  // the step's top a little above the line, so its box crosses it
  const top = r.top + window.scrollY - line + Math.min(40, r.height / 2);
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
}

export default function Part1({ part }) {
  return (
    <>
      <PartHead
        part={part}
        extra={
          <Items
            className="p1-head-items"
            items={[
              { icon: 'source', text: 'Official statistics, as published' },
              { icon: 'excluded', text: 'Nothing in this part is modelled by PolicyEngine' },
              { icon: 'forecast', text: 'The one forecast shown is the OBR’s own' },
            ]}
          />
        }
      >
        <Icon name={iconFor('gdp')} size={16} className="p1-text-icon" /> The UK economy and labour market as AI arrives.
      </PartHead>
      <Scrolly
        id="p1-output"
        scene
        sub={{ title: 'Output', icon: 'gdp' }}
        label={`Real GDP growth: by calendar year (ONS outturn), the ${OBR_LABEL}, and by quarter`}
        steps={outputSteps()}
        graphic={(i) => <OutputCanvas state={i} />}
      />
      <Scrolly
        id="p1-work"
        scene
        sub={{ title: 'Work, pay and productivity', icon: 'labour' }}
        label="Employment, unemployment, regular pay growth, output per hour worked and the labour share"
        steps={workSteps()}
        graphic={(i) => <LabourBoard focus={i} onPick={pickWork} />}
      />
      <Scrolly
        id="p1-ai"
        scene
        sub={{ title: 'AI arrives', icon: 'ai' }}
        label="Businesses using AI, and UK workers by exposure to AI"
        steps={aiSteps()}
        graphic={(i) => (
          <Swap active={i < 2 ? 0 : 1}>
            <AiUseChart state={Math.min(i, 1)} />
            <ExposureTiles state={i >= 3 ? 1 : 0} source={exposureSource()} />
          </Swap>
        )}
      />
      <NextPart n={2} title="What a model of the whole economy projects" to="story-part-2">
        <Icon name={iconFor('shock')} size={16} className="p1-text-icon" /> Part 2 turns from what has been measured to what happens if AI
        arrives as a shock.
      </NextPart>
    </>
  );
}
