'use client';

import Card from '@/components/ui/Card.jsx';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { cssColour, esc } from '@/lib/download.js';
import { TipBox } from '@/components/ab/Tip.jsx';
import F from '@/data/methodFacts.json';
import { OBR_GROWTH, SOURCES } from '@/data/literature.js';
import { CENTRAL } from '@/tabs/ai/surprise.js';
import { ext, useHover } from '../shared/ui.jsx';

// One KPI: the OBR-central path's average GDP growth over 2027-2030 against the
// OBR's, with the four years as hoverable bars. Ours is generated from the
// committed baseline solve (methodFacts.json); the OBR's is EFO March 2026.
// The bars as SVG from the data, for the PNG and SVG downloads.
function growthSvg(g, max) {
  const C = CHART_COLOURS;
  const W = 560;
  const H = 220;
  const base = H - 24;
  const Y = (v) => base - (v / max) * (base - 10);
  const bw = 70;
  const gapX = (W - 60 - g.years.length * bw) / (g.years.length - 1);
  const bar = cssColour('var(--c-highlight)');
  let out = `<line x1="40" x2="${W}" y1="${base}" y2="${base}" stroke="${C.axis}"/>`;
  g.years.forEach((yr, i) => {
    const x = 50 + i * (bw + gapX);
    out += `<rect x="${x}" y="${Y(g.growth_pct[i])}" width="${bw}" height="${base - Y(g.growth_pct[i])}" rx="3" fill="${bar}"/>`;
    out += `<text x="${x + bw / 2}" y="${Y(g.growth_pct[i]) - 6}" font-size="12" text-anchor="middle" fill="${C.ink}">${g.growth_pct[i].toFixed(2)}%</text>`;
    out += `<text x="${x + bw / 2}" y="${base + 16}" font-size="11" text-anchor="middle" fill="${C.tick}">${yr}</text>`;
  });
  out += `<line x1="40" x2="${W}" y1="${Y(OBR_GROWTH.value)}" y2="${Y(OBR_GROWTH.value)}" stroke="${C.ink}" stroke-dasharray="4 3"/>`;
  out += `<text x="0" y="${Y(OBR_GROWTH.value) + 4}" font-size="11" fill="${C.ink}">${esc(`OBR ${OBR_GROWTH.value.toFixed(1)}%`)}</text>`;
  return { w: W, h: H, markup: out };
}

export default function GrowthCheck() {
  const g = F.baseline_growth[CENTRAL];
  const { hi, ref, bind } = useHover();
  const max = Math.max(OBR_GROWTH.value, ...g.growth_pct) * 1.15;
  const y = (v) => 100 - (v / max) * 100;
  const span = `${g.years[0]}–${g.years[g.years.length - 1]}`;
  return (
    <Card
      id="growth-check"
      icon="gauge"
      title="The OG-UK baseline against the OBR"
      className="mx-kpi"
      finding={`Without the shock, OG-UK grows at about the OBR’s central rate over ${span}. Hover, tap or tab to a year for its figure.`}
      about={{
        how: 'Ours: GDP growth each year on the committed OG-UK baseline (central closure), from methodFacts.json.',
        sources: (
          <p>
            {ext(OBR_GROWTH.url, SOURCES[OBR_GROWTH.src].short)}, {OBR_GROWTH.loc}. The OBR publishes one decimal place.
          </p>
        ),
      }}
      download={{
        title: 'The OG-UK baseline against the OBR',
        context: () => `GDP growth a year, ${span}, %`,
        table: () => ({ columns: ['Year', 'OG-UK baseline growth (%)', 'OBR average (%)'], rows: g.years.map((yr, i) => [yr, g.growth_pct[i], OBR_GROWTH.value]) }),
        svg: () => growthSvg(g, max),
        legend: () => [{ label: 'OG-UK baseline', color: cssColour('var(--c-highlight)'), shape: 'box' }, { label: `OBR average, ${span}`, color: CHART_COLOURS.ink, dashed: true }],
      }}
    >
      <div className="mx-kpi-body" ref={ref}>
        <div className="mx-kpi-figs">
          <div>
            <span className="mx-kpi-k">OG-UK baseline</span>
            <span className="mx-kpi-v">{g.mean_pct.toFixed(2)}%</span>
          </div>
          <div>
            <span className="mx-kpi-k">OBR, March 2026</span>
            <span className="mx-kpi-v is-ref">{OBR_GROWTH.value.toFixed(1)}%</span>
          </div>
          <p className="mx-sub">Average GDP growth a year, {span}.</p>
        </div>
        <div className="mx-kpi-chart" aria-label={`OG-UK growth by year, ${span}`}>
          <div className="mx-kpi-plot">
            <span className="mx-kpi-ref" style={{ top: `${y(OBR_GROWTH.value)}%` }}>
              <span>OBR {OBR_GROWTH.value.toFixed(1)}%</span>
            </span>
            {g.years.map((yr, i) => (
              <span
                key={yr}
                className={`mx-kpi-col${hi === yr ? ' is-hi' : ''}`}
                {...bind(yr, `${yr}: ${g.growth_pct[i].toFixed(2)}%`)}
              >
                <span className="mx-kpi-bar" style={{ height: `${100 - y(g.growth_pct[i])}%` }} />
                {hi === yr ? (
                  <TipBox className="mx-tip">
                    <b>{yr}</b>
                    <span>OG-UK growth {g.growth_pct[i].toFixed(2)}%</span>
                  </TipBox>
                ) : null}
              </span>
            ))}
          </div>
          <div className="mx-kpi-years" aria-hidden="true">
            {g.years.map((yr) => (
              <span key={yr}>{yr}</span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
