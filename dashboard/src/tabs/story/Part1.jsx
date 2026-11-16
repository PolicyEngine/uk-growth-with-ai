'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import NextPart from '@/components/story/NextPart.jsx';
import PartHead from './PartHead.jsx';
import { DSIT_AROUND, EXPOSURE_GROUPS, FACTS, MODEL_BASE_VINTAGE, OBR, OBR_LABEL, OBR_VINTAGE, SERIES } from './part1/data.js';
import { AiUseChart, ExposureTiles, GdpChart, GdpQuartersChart, LabourPanels, LabourShareChart, PayChart, ProductivityChart } from './part1/charts.jsx';
import { SourceLine, Swap } from './part1/frame.jsx';
import { idx1, pct1, share0 } from './part1/format.js';

// Part 1: where the UK economy and labour market stand as AI arrives, from
// official published data only (ukContext.json); no forecasts or modelling
// of ours, and the one forecast shown is the OBR's. Part 1 is the home of
// these statistics: each figure is printed once, in a step card, and the
// graphics carry no value labels (axis ticks are marked data-axis). Every
// printed figure has an entry in ukContextChecks.json, read there from the
// primary file. Calendar-year series stop at the last full year; the
// current year appears only as quarters or months, labelled as such.
// Four scrolly blocks (output, work, productivity and the labour share, AI);
// each holds several figures in one sticky graphic (Swap, frame.jsx), and
// every state carries its own title, unit and source line. The blocks take
// the first old block id; the others (p1-quarters, p1-pay, p1-share,
// p1-exposure) sit on an anchor at the top of the step where that figure
// first shows, so old links still land on it. Caveats sit in the figures'
// source lines or in an "About these figures" disclosure under a card.
// Under reduced motion the step logic is kept (story.css): a chart part that
// is .is-on shows at once and one that is not stays hidden; only the motion
// goes.

const F = FACTS;
const last = (a) => a[a.length - 1];

// An old block id, kept as a link target at the top of a merged step.
const Anchor = ({ id }) => <span id={id} className="p1-anchor" aria-hidden="true" />;

// A caveat under a card, closed by default. No figures in here: the number
// check reads the page's rendered text.
const About = ({ children }) => (
  <details className="p1-about">
    <summary>About these figures</summary>
    {children}
  </details>
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
  return [
    {
      id: 'p1-output-0',
      kicker: 'Output',
      title: 'How fast the economy has grown',
      body: (
        <p>
          Real GDP, the volume of everything the UK produces, grew by <strong>{pct1(g.value)}</strong> in {g.period}, the latest full
          calendar year the ONS has published. Each bar is one year&rsquo;s growth; the latest years are open to revision. The fall in {low}{' '}
          and the rebound in {high} came with the pandemic.
        </p>
      ),
    },
    {
      id: 'p1-output-1',
      kicker: 'Output',
      title: 'The OBR’s forecast',
      body: (
        <p>
          The Office for Budget Responsibility&rsquo;s central forecast, published in {OBR_VINTAGE}, has growth of <strong>{pct1(OBR.y[0])}</strong> in{' '}
          {OBR.x[0]}, <strong>{pct1(OBR.y[1])}</strong> in {OBR.x[1]} and <strong>{pct1(last(OBR.y))}</strong> in {last(OBR.x)}, the last
          year it covers. Every year on the dashed line is a forecast. The modelling in part 2 starts from the OBR&rsquo;s {MODEL_BASE_VINTAGE}{' '}
          forecast.
        </p>
      ),
    },
    {
      id: 'p1-quarters-0',
      kicker: 'Output',
      title: `${year} so far`,
      body: (
        <>
          <Anchor id="p1-quarters" />
          <p>
            {year} is not yet complete, so it has no calendar-year figure. In {q.period}, the latest quarter, real GDP grew by{' '}
            <strong>{pct1(q.value)}</strong> on the previous quarter and was <strong>{pct1(y.value)}</strong> larger than a year earlier. These
            are the ONS&rsquo;s first estimates.
          </p>
        </>
      ),
    },
  ];
}

// (b) Work: employment, unemployment, then pay.
function workSteps() {
  const e = F.employment_rate_latest;
  const u = F.unemployment_rate_latest;
  const p = F.pay_growth_latest;
  return [
    {
      id: 'p1-work-0',
      kicker: 'Work',
      title: 'Employment',
      body: (
        <p>
          The employment rate for people aged 16 to 64 was <strong>{pct1(e.value)}</strong> in {e.period}. Each point on the panels is a
          three-month average.
        </p>
      ),
    },
    {
      id: 'p1-work-1',
      pin: 'bottom',
      kicker: 'Work',
      title: 'Unemployment',
      body: (
        <>
          <p>
            The unemployment rate for people aged 16 and over was <strong>{pct1(u.value)}</strong> in {u.period}.
          </p>
          <About>
            <p>
              Both rates come from the Labour Force Survey. The ONS advises focusing on long-term movements in its figures rather than
              short-term changes: response has improved, but some volatility remains.
            </p>
          </About>
        </>
      ),
    },
    {
      id: 'p1-pay-0',
      kicker: 'Work',
      title: 'Pay',
      body: (
        <>
          <Anchor id="p1-pay" />
          <p>
            Regular pay, which leaves out bonuses, was <strong>{pct1(p.value)}</strong> higher in {p.period} than a year earlier, before
            adjusting for inflation.
          </p>
        </>
      ),
    },
  ];
}

// (c) Productivity, then the labour share.
function productivitySteps() {
  const p = F.productivity_oph_latest;
  const s = F.labour_share_latest;
  return [
    {
      id: 'p1-productivity-0',
      kicker: 'Productivity',
      title: 'Output per hour worked',
      body: (
        <p>
          Output per hour worked, the main measure of labour productivity, stood at <strong>{idx1(p.value)}</strong> in {p.period}, the latest
          quarter published, on an index where 2023 = 100.
        </p>
      ),
    },
    {
      id: 'p1-share-0',
      kicker: 'Labour’s share',
      title: 'What employees are paid, as a share of GDP',
      body: (
        <>
          <Anchor id="p1-share" />
          <p>
            Compensation of employees (wages, salaries and employers&rsquo; contributions) was <strong>{pct1(s.value)}</strong> of GDP in{' '}
            {s.period}, the latest full year.
          </p>
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
  return [
    {
      id: 'p1-ai-0',
      kicker: 'AI arrives',
      title: 'Businesses using AI',
      body: (
        <p>
          In {a.period}, <strong>{pct1(a.value)}</strong> of businesses told the ONS&rsquo;s Business Insights and Conditions Survey they
          currently use at least one AI technology, such as text generation with large language models or machine learning on data.
        </p>
      ),
    },
    {
      id: 'p1-ai-1',
      kicker: 'AI arrives',
      title: 'Larger businesses',
      body: (
        <p>
          Among businesses with 10 or more employees the share was <strong>{pct1(b.value)}</strong> in the same wave. The ONS often leads
          with this group, because results for the smallest businesses carry large survey weights.
        </p>
      ),
    },
    {
      id: 'p1-exposure-0',
      kicker: 'AI arrives',
      title: 'UK workers',
      body: (
        <>
          <Anchor id="p1-exposure" />
          <p>
            Each tile in the grid is one per cent of UK workers. Estimates from the IMF ({when}), reported by the Department for Science,
            Innovation and Technology and the AI Security Institute, sort them by how exposed their occupations are to AI.
          </p>
        </>
      ),
    },
    {
      id: 'p1-exposure-1',
      kicker: 'AI arrives',
      title: 'Workers by exposure to AI',
      body: (
        <>
          <p>
            The estimates put <strong>{share0(hh.value)}</strong> of UK workers in occupations with high exposure to AI and high
            complementarity, <strong>{share0(hl.value)}</strong> in highly exposed occupations with low complementarity and{' '}
            <strong>{share0(lo.value)}</strong> in occupations with low exposure. The two high-exposure groups sum to {share0(hh.value + hl.value)};
            the department&rsquo;s text says around {share0(DSIT_AROUND)}.
          </p>
          <About>
            <p>The department notes that such indices are indicative rather than precise. No official table gives exposure by major occupation group.</p>
          </About>
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

export default function Part1({ part }) {
  return (
    <>
      <PartHead part={part}>
        The UK economy and labour market as AI arrives, from official statistics as published. Nothing in this part is modelled by
        PolicyEngine; the one forecast shown is the OBR&rsquo;s own.
      </PartHead>
      <Scrolly
        id="p1-output"
        label={`Real GDP growth: by calendar year (ONS outturn), the ${OBR_LABEL}, and by quarter`}
        steps={outputSteps()}
        graphic={(i) => (
          <Swap active={i < 2 ? 0 : 1}>
            <GdpChart state={Math.min(i, 1)} />
            <GdpQuartersChart on={i >= 2} />
          </Swap>
        )}
      />
      <Scrolly
        id="p1-work"
        label="Employment and unemployment rates, and regular pay growth"
        steps={workSteps()}
        graphic={(i) => (
          <Swap active={i < 2 ? 0 : 1}>
            <LabourPanels state={Math.min(i, 1)} />
            <PayChart on={i >= 2} />
          </Swap>
        )}
      />
      <Scrolly
        id="p1-productivity"
        label="Output per hour worked, and compensation of employees as a share of GDP"
        steps={productivitySteps()}
        graphic={(i) => (
          <Swap active={i < 1 ? 0 : 1}>
            <ProductivityChart />
            <LabourShareChart on={i >= 1} />
          </Swap>
        )}
      />
      <Scrolly
        id="p1-ai"
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
        Part 2 turns from what has been measured to what happens if AI arrives as a shock.
      </NextPart>
    </>
  );
}
