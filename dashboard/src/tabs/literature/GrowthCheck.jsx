'use client';

import { useState } from 'react';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import IconText from '@/tabs/method/IconText.jsx';
import { Items } from '@/components/story/Items.jsx';

import Card from '@/components/ui/Card.jsx';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { cssColour, esc } from '@/lib/download.js';
import ChartHover from '@/components/story/chart/ChartHover.jsx';
import { METHOD_FACTS as F } from '@/lib/dataKeys.js';
import { OBR_GROWTH, SOURCES } from '@/data/literature.js';
import { code, SRC } from '@/tabs/method/sources.js';
import { CENTRAL } from '@/tabs/ai/surprise.js';
import { ext } from '../shared/ui.jsx';
import './evidence.css';

// One KPI: the OG-UK baseline's GDP growth each year against the OBR's
// forecast for the same years, as bars with the OBR's figure marked on each.
// Ours is generated from the committed baseline solve (methodFacts.json); the
// OBR's is the October 2026 EFO, Table A.1 (literature.js OBR_GROWTH). Both
// averages are computed here from the yearly figures.
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const spread = (xs) => Math.max(...xs) - Math.min(...xs);

// The years both cover, with each side's figure.
export function growthPairs(g = F.baseline_growth[CENTRAL]) {
  return g.years
    .map((yr, i) => ({ yr, ours: g.growth_pct[i], obr: OBR_GROWTH.growth_pct[OBR_GROWTH.years.indexOf(yr)] }))
    .filter((p) => p.obr != null);
}

// The bars and markers as SVG from the data, for the PNG and SVG downloads.
function growthSvg(pairs, max) {
  const C = CHART_COLOURS;
  const W = 560;
  const H = 220;
  const base = H - 24;
  const Y = (v) => base - (v / max) * (base - 10);
  const bw = 70;
  const gapX = (W - 60 - pairs.length * bw) / (pairs.length - 1);
  const bar = cssColour('var(--series-2)');
  let out = `<line x1="40" x2="${W}" y1="${base}" y2="${base}" stroke="${C.axis}"/>`;
  pairs.forEach((p, i) => {
    const x = 50 + i * (bw + gapX);
    out += `<rect x="${x}" y="${Y(p.ours)}" width="${bw}" height="${base - Y(p.ours)}" rx="3" fill="${bar}"/>`;
    out += `<line x1="${x - 6}" x2="${x + bw + 6}" y1="${Y(p.obr)}" y2="${Y(p.obr)}" stroke="${C.ink}" stroke-width="2.5"/>`;
    out += `<text x="${x + bw / 2}" y="${Math.min(Y(p.ours), Y(p.obr)) - 6}" font-size="11" text-anchor="middle" fill="${C.ink}">${esc(`${p.ours.toFixed(2)}% · OBR ${p.obr.toFixed(1)}%`)}</text>`;
    out += `<text x="${x + bw / 2}" y="${base + 16}" font-size="11" text-anchor="middle" fill="${C.tick}">${p.yr}</text>`;
  });
  return { w: W, h: H, markup: out };
}

export default function GrowthCheck() {
  const g = F.baseline_growth[CENTRAL];
  const pairs = growthPairs(g);
  // the one tooltip (ChartHover, M4): each year's two growth rates
  const [at, setAt] = useState(null);
  const max = Math.max(...pairs.flatMap((p) => [p.ours, p.obr])) * 1.15;
  const y = (v) => 100 - (v / max) * 100;
  const span = `${pairs[0].yr}–${pairs[pairs.length - 1].yr}`;
  const ours = mean(pairs.map((p) => p.ours));
  const obr = mean(pairs.map((p) => p.obr));
  const src = SOURCES[OBR_GROWTH.src];
  const smoother = spread(pairs.map((p) => p.ours)) < spread(pairs.map((p) => p.obr));
  return (
    <Card
      id="growth-check"
      icon={iconFor('path')}
      title="OG-UK’s forecast path against the OBR’s growth forecast"
      replication={{ code: 'https://github.com/PolicyEngine/uk-growth-with-ai/blob/dashboard/story/dashboard/scripts/build_method_facts.py', result: code('analysis/rerun/output/zk0.1/baseline_p1.json') }}
      className="mx-kpi"
      finding={<IconText icon="compare">{`Without the shock, OG-UK’s average ${span} GDP growth is ${ours.toFixed(2)}%, against ${obr.toFixed(1)}% in the OBR’s October 2026 forecast${smoother ? '; smoother year by year' : ''}.`}</IconText>}
      about={{
        how: (
          <Items
            items={[
              { icon: 'model', text: 'OG-UK: GDP growth each year on the committed forecast path (some foreign capital).' },
              { icon: 'forecast', text: <>The forecast path takes two OBR March 2026 inputs: trend productivity ({ext(SRC.efoMarPath.url, '¶1.2')}) and 2030 debt/GDP.</> },
              { icon: 'timing', text: 'So the forecast path is March 2026; this check uses October 2026.' },
              { icon: 'excluded', text: 'It is not fitted to the OBR’s growth path.' },
              { icon: 'path', text: 'OBR: real GDP growth by calendar year.' },
              { icon: 'measure', text: 'Both averages are of the years shown.' },
            ]}
          />
        ),
        sources: (
          <Items
            items={[
              { icon: 'source', text: <>{ext(OBR_GROWTH.url, src.short)}, {OBR_GROWTH.loc}.</> },
              { icon: 'data', text: <>OG-UK: {ext(code('analysis/rerun/output/zk0.1/baseline_p1.json'), 'baseline_p1.json')}, the committed baseline solve.</> },
            ]}
          />
        ),
        // a reading note, in More info (c0-rulings-opus.md ruling 4)
        read: 'The OBR publishes one decimal place.',
      }}
      download={{
        title: 'OG-UK’s forecast path against the OBR’s growth forecast',
        context: () => `Real GDP growth a year, ${span}, %; OBR: ${src.short}, ${OBR_GROWTH.loc}`,
        table: () => ({ columns: ['Year', 'OG-UK’s forecast path growth (%)', `${OBR_GROWTH.label} (%)`], rows: pairs.map((p) => [p.yr, p.ours, p.obr]) }),
        svg: () => growthSvg(pairs, max),
        legend: () => [{ label: 'OG-UK’s forecast path', color: cssColour('var(--series-2)'), shape: 'box' }, { label: OBR_GROWTH.label, color: CHART_COLOURS.ink, shape: 'tick' }],
      }}
    >
      <div className="mx-kpi-body">
        <div className="mx-kpi-figs">
          <div>
            <span className="mx-kpi-k">
              <Icon name={iconFor('model')} size={14} className="mx-dt-icon" />
              OG-UK’s forecast path
            </span>
            <a className="mx-kpi-v ev-kpi-ours" href={code('analysis/rerun/output/zk0.1/baseline_p1.json')} target="_blank" rel="noreferrer">
              {ours.toFixed(2)}%
            </a>
          </div>
          <div>
            <span className="mx-kpi-k">
              <Icon name={iconFor('forecast')} size={14} className="mx-dt-icon" />
              {OBR_GROWTH.label}
            </span>
            <a className="mx-kpi-v is-ref" href={OBR_GROWTH.url} target="_blank" rel="noreferrer">
              {obr.toFixed(1)}%
            </a>
          </div>
          <p className="mx-sub">
            <IconText icon="measure">Average GDP growth a year, {span}.</IconText>
          </p>
        </div>
        <div className="mx-kpi-chart" aria-label={`GDP growth by year, ${span}: OG-UK’s forecast path bars, OBR forecast marks`}>
          <ul className="ev-kpi-key" aria-hidden="true">
            <li>
              <span className="ev-kpi-key-bar" /> OG-UK’s forecast path
            </li>
            <li>
              <span className="ev-kpi-key-obr" /> {OBR_GROWTH.label}
            </li>
          </ul>
          <p className="mx-axis-title ev-kpi-axis">
            <IconText icon="measure">
              <span data-axis-title="y">Real GDP growth, % a year</span>
            </IconText>
          </p>
          <ChartHover
            className="mx-kpi-plot"
            label={`GDP growth by year, ${span}`}
            onActive={setAt}
            items={pairs.map((p) => ({
              head: String(p.yr),
              rows: [
                { name: 'OG-UK’s forecast path', value: `${p.ours.toFixed(2)}%`, icon: 'model' },
                { name: OBR_GROWTH.label, value: `${p.obr.toFixed(1)}%`, icon: 'forecast' },
              ],
              unit: 'Real GDP growth, % a year.',
            }))}
          >
            {pairs.map((p, i) => (
              <span key={p.yr} className={`mx-kpi-col${at === i ? ' is-hi' : ''}`} data-tip={i}>
                <span className="mx-kpi-bar ev-kpi-bar" style={{ height: `${100 - y(p.ours)}%` }} />
                <span className="ev-kpi-obr" style={{ bottom: `${100 - y(p.obr)}%` }} />
              </span>
            ))}
          </ChartHover>
          <div className="mx-kpi-years" aria-hidden="true">
            {pairs.map((p) => (
              <span key={p.yr}>{p.yr}</span>
            ))}
          </div>
          <p className="mx-axis-title ev-kpi-axis is-x">
            <IconText icon="timing">
              <span data-axis-title="x">Calendar year</span>
            </IconText>
          </p>
          <div className="mx-kpi-years ev-kpi-vals">
            {pairs.map((p) => (
              <span key={p.yr}>
                <b className="ev-kpi-ours">{p.ours.toFixed(2)}%</b>{' '}
                <span>OBR {p.obr.toFixed(1)}%</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
