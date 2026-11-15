'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import Reveal from '@/components/story/Reveal.jsx';
import PartHead from './PartHead.jsx';
import { DSIT_AROUND, EXPOSURE_GROUPS, FACTS, MODEL_BASE_VINTAGE, OBR, OBR_LABEL, OBR_VINTAGE } from './part1/data.js';
import { AiUseChart, ExposureTiles, GdpChart, LabourPanels, LabourShareChart, ProductivityChart } from './part1/charts.jsx';
import { SourceLine } from './part1/frame.jsx';
import { idx1, pct1, share0 } from './part1/format.js';

// Part 1: where the UK economy and labour market stand as AI arrives, from
// official published data only (ukContext.json); no forecasts or modelling
// of ours, and the one forecast shown is the OBR's. Part 1 is the home of
// these statistics: each figure is printed once, in a step card, and the
// graphics carry no value labels (axis ticks are marked data-axis).
// Under reduced motion story.css shows every line at once, so the stateful
// graphics are given their last state there, keeping legends and labels in
// step with what is drawn.

const F = FACTS;
const last = (a) => a[a.length - 1];

function outputSteps() {
  const g = F.gdp_growth_latest;
  return [
    {
      id: 'p1-output-0',
      kicker: 'Output',
      title: 'How fast the economy has grown',
      body: (
        <p>
          Real GDP, the volume of everything the UK produces, grew by <strong>{pct1(g.value)}</strong> in {g.period}, the latest calendar
          year the ONS has published. Each bar is one year&rsquo;s growth; the latest years are open to revision.
        </p>
      ),
    },
    {
      id: 'p1-output-1',
      kicker: 'Output',
      title: 'The OBR’s forecast',
      body: (
        <>
          <p>
            The Office for Budget Responsibility&rsquo;s central forecast, published in {OBR_VINTAGE}, has growth of <strong>{pct1(OBR.y[0])}</strong> in{' '}
            {OBR.x[0]}, <strong>{pct1(OBR.y[1])}</strong> in {OBR.x[1]} and <strong>{pct1(last(OBR.y))}</strong> in {last(OBR.x)}, the last
            year it covers. Every year on the dashed line is a forecast.
          </p>
          <p>
            The OBR&rsquo;s table starts from an earlier estimate of {g.period} growth than the ONS&rsquo;s latest, so the two are drawn
            apart, not joined. The modelling in part 2 starts from the OBR&rsquo;s {MODEL_BASE_VINTAGE} forecast.
          </p>
        </>
      ),
    },
  ];
}

function productivitySteps() {
  const p = F.productivity_oph_latest;
  return [
    {
      id: 'p1-productivity-0',
      kicker: 'Productivity',
      title: 'Output per hour worked',
      body: (
        <p>
          Output per hour worked, the main measure of labour productivity, stood at <strong>{idx1(p.value)}</strong> in {p.period}, on an
          index where 2023 = 100. The chart shows annual values; the latest reading is for a later quarter.
        </p>
      ),
    },
  ];
}

function workSteps() {
  const e = F.employment_rate_latest;
  const u = F.unemployment_rate_latest;
  return [
    {
      id: 'p1-work-0',
      kicker: 'Work',
      title: 'Employment',
      body: (
        <p>
          The employment rate for people aged 16 to 64 was <strong>{pct1(e.value)}</strong> in {e.period}. The panels show annual values;
          the latest readings are three-month averages.
        </p>
      ),
    },
    {
      id: 'p1-work-1',
      kicker: 'Work',
      title: 'Unemployment',
      body: (
        <>
          <p>
            The unemployment rate for people aged 16 and over was <strong>{pct1(u.value)}</strong> in {u.period}.
          </p>
          <p className="p1-lfs">
            Both rates come from the Labour Force Survey. The ONS advises focusing on long-term movements in its figures rather than
            short-term changes: response has improved, but some volatility remains.
          </p>
        </>
      ),
    },
  ];
}

function shareSteps() {
  const s = F.labour_share_latest;
  return [
    {
      id: 'p1-share-0',
      kicker: 'Labour’s share',
      title: 'What employees are paid, as a share of GDP',
      body: (
        <p>
          Compensation of employees (wages, salaries and employers&rsquo; contributions) was <strong>{pct1(s.value)}</strong> of GDP in{' '}
          {s.period}. It leaves out the income of the self-employed, so it is lower than measures of labour&rsquo;s share that count that
          income.
        </p>
      ),
    },
  ];
}

function aiSteps() {
  const a = F.business_ai_use;
  const b = F.business_ai_use_10plus;
  return [
    {
      id: 'p1-ai-0',
      kicker: 'AI arrives',
      title: 'Businesses using AI',
      body: (
        <>
          <p>
            In {a.period}, <strong>{pct1(a.value)}</strong> of businesses told the ONS&rsquo;s Business Insights and Conditions Survey they
            currently use at least one AI technology, such as text generation with large language models or machine learning on data.
          </p>
          <p>
            The survey covers private-sector businesses and leaves out some industries, among them agriculture, finance and insurance, and
            public administration.
          </p>
        </>
      ),
    },
    {
      id: 'p1-ai-1',
      kicker: 'AI arrives',
      title: 'Larger businesses',
      body: (
        <p>
          Among businesses with 10 or more employees the share was <strong>{pct1(b.value)}</strong> in {b.period}. The ONS often leads with
          this group, because results for the smallest businesses carry large survey weights.
        </p>
      ),
    },
  ];
}

function exposureSteps() {
  const [hh, hl, lo] = EXPOSURE_GROUPS;
  const when = F[hh.id].period.replace(/^IMF estimates?,\s*/, '');
  return [
    {
      id: 'p1-exposure-0',
      kicker: 'AI arrives',
      title: 'UK workers, in a hundred tiles',
      body: <p>Each tile in the grid is one per cent of UK workers.</p>,
    },
    {
      id: 'p1-exposure-1',
      kicker: 'AI arrives',
      title: 'Workers by exposure to AI',
      body: (
        <>
          <p>
            Estimates from the IMF ({when}), reported by the Department for Science, Innovation and Technology and the AI Security
            Institute, put <strong>{share0(hh.value)}</strong> of UK workers in occupations with high exposure to AI and high
            complementarity. A further{' '}
            <strong>{share0(hl.value)}</strong> are in highly exposed occupations with low complementarity, and{' '}
            <strong>{share0(lo.value)}</strong> in occupations with low exposure.
          </p>
          <p>The department notes that such indices are indicative rather than precise. No official table gives exposure by major occupation group.</p>
        </>
      ),
    },
  ];
}

function exposureSource() {
  const [hh, hl] = EXPOSURE_GROUPS;
  return (
    <SourceLine
      items={[{ id: F[hh.id].source, name: 'Assessment of AI capabilities and the impact on the UK labour market', detail: 'Figure 2' }]}
      note={`Citing IMF, Gen-AI: Artificial Intelligence and the Future of Work. The two high-exposure groups sum to ${share0(hh.value + hl.value)}; the DSIT text says around ${share0(DSIT_AROUND)}.`}
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
      <Scrolly id="p1-output" label={`Real GDP growth, ONS outturn, and the ${OBR_LABEL}`} steps={outputSteps()} graphic={(i, reduce) => <GdpChart state={reduce ? 1 : i} />} />
      <Scrolly id="p1-productivity" label="Output per hour worked" steps={productivitySteps()} graphic={() => <ProductivityChart />} />
      <Scrolly id="p1-work" label="Employment and unemployment rates" steps={workSteps()} graphic={(i, reduce) => <LabourPanels state={reduce ? 1 : i} />} />
      <Scrolly id="p1-share" label="Compensation of employees as a share of GDP" steps={shareSteps()} graphic={() => <LabourShareChart />} />
      <Scrolly id="p1-ai" label="Businesses using AI" steps={aiSteps()} graphic={(i, reduce) => <AiUseChart state={reduce ? 1 : i} />} />
      <Scrolly
        id="p1-exposure"
        label="UK workers by exposure to AI"
        steps={exposureSteps()}
        graphic={(i) => <ExposureTiles state={i} source={exposureSource()} />}
      />
      <Reveal as="p" className="p1-bridge">
        Part 2 turns from what has been measured to what a model of the whole economy projects if AI arrives as a shock.
      </Reveal>
    </>
  );
}
