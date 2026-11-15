'use client';

import Card from '@/components/ui/Card.jsx';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { cssColour, esc } from '@/lib/download.js';
import { TipBox } from '@/components/ab/Tip.jsx';
import F from '@/data/methodFacts.json';
import { OBR_GROWTH, SOURCES } from '@/data/literature.js';
import { CENTRAL } from '@/tabs/ai/surprise.js';
import { ext, useHover } from '../shared/ui.jsx';
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
  const { hi, ref, bind } = useHover();
  const max = Math.max(...pairs.flatMap((p) => [p.ours, p.obr])) * 1.15;
  const y = (v) => 100 - (v / max) * 100;
  const span = `${pairs[0].yr}–${pairs[pairs.length - 1].yr}`;
  const ours = mean(pairs.map((p) => p.ours));
  const obr = mean(pairs.map((p) => p.obr));
  const src = SOURCES[OBR_GROWTH.src];
  const close = Math.abs(ours - obr) < 0.15;
  const smoother = spread(pairs.map((p) => p.ours)) < spread(pairs.map((p) => p.obr));
  return (
    <Card
      id="growth-check"
      icon="gauge"
      title="The OG-UK baseline against the OBR’s growth forecast"
      className="mx-kpi"
      finding={`Without the shock, OG-UK’s average GDP growth over ${span} is ${close ? 'close to' : 'not close to'} the OBR’s October 2026 forecast${smoother ? ', but its path is smoother year by year' : ''}. Each year’s figures are under its bar.`}
      about={{
        how: 'Ours: GDP growth each year on the committed OG-UK baseline (central closure), from methodFacts.json. The baseline takes some inputs from the OBR but is not fitted to its growth path. OBR: real GDP growth by calendar year. Both averages are of the years shown.',
        sources: (
          <p>
            {ext(OBR_GROWTH.url, src.short)}, {OBR_GROWTH.loc}. The OBR publishes one decimal place.
          </p>
        ),
      }}
      download={{
        title: 'The OG-UK baseline against the OBR’s growth forecast',
        context: () => `Real GDP growth a year, ${span}, %; OBR: ${src.short}, ${OBR_GROWTH.loc}`,
        table: () => ({ columns: ['Year', 'OG-UK baseline growth (%)', `${OBR_GROWTH.label} (%)`], rows: pairs.map((p) => [p.yr, p.ours, p.obr]) }),
        svg: () => growthSvg(pairs, max),
        legend: () => [{ label: 'OG-UK baseline', color: cssColour('var(--series-2)'), shape: 'box' }, { label: OBR_GROWTH.label, color: CHART_COLOURS.ink, shape: 'tick' }],
      }}
    >
      <div className="mx-kpi-body" ref={ref}>
        <div className="mx-kpi-figs">
          <div>
            <span className="mx-kpi-k">OG-UK baseline</span>
            <span className="mx-kpi-v ev-kpi-ours">{ours.toFixed(2)}%</span>
          </div>
          <div>
            <span className="mx-kpi-k">{OBR_GROWTH.label}</span>
            <span className="mx-kpi-v is-ref">{obr.toFixed(1)}%</span>
          </div>
          <p className="mx-sub">Average GDP growth a year, {span}.</p>
        </div>
        <div className="mx-kpi-chart" aria-label={`GDP growth by year, ${span}: OG-UK baseline bars, OBR forecast marks`}>
          <ul className="ev-kpi-key" aria-hidden="true">
            <li>
              <span className="ev-kpi-key-bar" /> OG-UK baseline
            </li>
            <li>
              <span className="ev-kpi-key-obr" /> {OBR_GROWTH.label}
            </li>
          </ul>
          <div className="mx-kpi-plot">
            {pairs.map((p) => (
              <span key={p.yr} className={`mx-kpi-col${hi === p.yr ? ' is-hi' : ''}`} {...bind(p.yr, `${p.yr}: OG-UK ${p.ours.toFixed(2)}%, OBR ${p.obr.toFixed(1)}%`)}>
                <span className="mx-kpi-bar ev-kpi-bar" style={{ height: `${100 - y(p.ours)}%` }} />
                <span className="ev-kpi-obr" style={{ bottom: `${100 - y(p.obr)}%` }} />
                {hi === p.yr ? (
                  <TipBox className="mx-tip">
                    <b>{p.yr}</b>
                    <span>OG-UK baseline {p.ours.toFixed(2)}%</span>
                    <span>
                      {OBR_GROWTH.label} {p.obr.toFixed(1)}%
                    </span>
                  </TipBox>
                ) : null}
              </span>
            ))}
          </div>
          <div className="mx-kpi-years" aria-hidden="true">
            {pairs.map((p) => (
              <span key={p.yr}>{p.yr}</span>
            ))}
          </div>
          <div className="mx-kpi-years ev-kpi-vals">
            {pairs.map((p) => (
              <span key={p.yr}>
                <b className="ev-kpi-ours">{p.ours.toFixed(2)}%</b>
                <span>OBR {p.obr.toFixed(1)}%</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
