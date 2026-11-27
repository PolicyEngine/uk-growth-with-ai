'use client';

import { useState } from 'react';
import ChartHover from '@/components/story/chart/ChartHover.jsx';
import { SCENARIOS, KORINEK_FULL, HEADLINE_YEAR } from '@/tabs/ai/surprise.js';
import { useSvgScale } from '@/lib/svgScale.js';

// The four scenarios on one map: productivity gain (x) against labour-share
// fall (y), both the levels reached in the headline year, read from
// the active data file. Hover, tap or reach a point by the arrow keys for its
// inputs (the one tooltip, ChartHover, M4).
const ROLE = {
  uk_low: 'Derived from the OBR J-curve path (Briefing paper No.9, ¶B.12)',
  uk_central: 'Headline: year 4 read off IMF SIP/2026/072 Figure 9, with the share fall derived from its 27% cost saving (¶44). Not an IMF pair',
  uk_high: 'Derived from the OBR’s high alternative and upper-end share path (FRS 2026, Box 4.1)',
  korinek: 'A US case used as the upper case, not calibrated to the UK',
};
const W = 560;
// The bottom margin leaves room for the tick row and the axis title at the
// phone's larger type (19 units), where they met at 44.
const H = 272;
const M0 = { l: 82, r: 24, t: 18, b: 56 };

export const scenarioTable = () => ({
  columns: ['Scenario', `Labour-share fall by ${HEADLINE_YEAR} (pp)`, `Gain in output at fixed inputs by ${HEADLINE_YEAR} (%)`, 'Capital share γ reached'],
  rows: SCENARIOS.map((s) => [s.label, s.labour_share_fall_pp, s.tfp_gain_pct, s.gamma_terminal]),
});

export default function ScenarioMap({ caption = true }) {
  const [at, setAt] = useState(null);
  const hi = at == null ? null : SCENARIOS[at]?.id;
  // the viewBox is drawn scaled (about 0.84 on desktop, 0.58 on a phone):
  // its text sizes are the chart type scale over the measured scale
  const [svgRef, sz] = useSvgScale(W, 0.838);
  // the left margin holds the widest tick ("−5pp") and the rotated title
  // at the scale's size: wider where the map is drawn small (a phone)
  const M = { ...M0, l: Math.max(M0.l, Math.round(sz.tick * 4.6)) };
  // a long point label on two lines where the map is drawn small
  const split = sz.k < 0.7;
  const xMax = Math.ceil(Math.max(...SCENARIOS.map((s) => s.tfp_gain_pct)) + 0.4);
  const yMax = Math.ceil(Math.max(...SCENARIOS.map((s) => s.labour_share_fall_pp)) + 0.6);
  const sx = (v) => M.l + (v / xMax) * (W - M.l - M.r);
  const sy = (v) => M.t + (v / yMax) * (H - M.t - M.b);
  const xt = Array.from({ length: xMax + 1 }, (_, i) => i);
  const yt = Array.from({ length: yMax + 1 }, (_, i) => i);
  const uk = SCENARIOS.filter((s) => s.id !== 'korinek');
  const tips = SCENARIOS.map((s, i) => ({
    head: s.id === 'korinek' ? KORINEK_FULL : s.label,
    rows: [
      { name: `Labour-share fall by ${HEADLINE_YEAR}`, value: `${s.labour_share_fall_pp}pp`, icon: 'scenario', path: `scenarios.${i}.labour_share_fall_pp` },
      { name: `Output gain at fixed inputs by ${HEADLINE_YEAR}`, value: `+${s.tfp_gain_pct}%`, icon: 'gdp', path: `scenarios.${i}.tfp_gain_pct` },
    ],
    unit: ROLE[s.id],
    kind: 'input',
  }));
  return (
    <figure className="mx-map">
      {caption ? (
        <figcaption className="mx-fig-cap">
          <span className="mx-fig-title">Scenario inputs, {HEADLINE_YEAR}</span>
          <span className="mx-fig-sub">Labour-share fall, pp, against output gain, %</span>
        </figcaption>
      ) : null}
      <div className="mx-map-body">
      <ChartHover className="mx-map-plot" label="Map of the four scenarios' inputs" items={tips} onActive={setAt}>
        <svg ref={svgRef} style={{ '--svg-k': sz.k }} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of the four scenarios' inputs">
          {xt.map((t) => (
            <g key={`x${t}`}>
              <line className="mx-grid" x1={sx(t)} x2={sx(t)} y1={M.t} y2={H - M.b} />
              {/* the first tick starts at the axis, clear of the y labels beside it */}
              <text className="mx-tick" x={sx(t)} y={H - M.b + 20} textAnchor={t === 0 ? 'start' : 'middle'}>
                +{t}%
              </text>
            </g>
          ))}
          {yt.map((t) => (
            <g key={`y${t}`}>
              <line className="mx-grid" x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} />
              <text className="mx-tick" x={M.l - 8} y={sy(t) + 4} textAnchor="end">
                {t === 0 ? '0' : `−${t}pp`}
              </text>
            </g>
          ))}
          <text className="mx-axis-title" data-axis-title="x" x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle">
            Gain in output at fixed inputs, % →
          </text>
          <text
            className="mx-axis-title"
            data-axis-title="y"
            x={-(M.t + (H - M.t - M.b) / 2)}
            y={Math.max(16, Math.round(sz.tick * 0.95))}
            transform="rotate(-90)"
            textAnchor="middle"
          >
            Labour-share fall, pp ←
          </text>
          {/* the UK range as a band through its three points */}
          <polyline
            className="mx-map-range"
            points={uk.map((s) => `${sx(s.tfp_gain_pct)},${sy(s.labour_share_fall_pp)}`).join(' ')}
          />
          {SCENARIOS.map((s) => {
            const x = sx(s.tfp_gain_pct);
            const y = sy(s.labour_share_fall_pp);
            const up = s.id === 'korinek';
            return (
              <g
                key={s.id}
                className={`mx-map-pt${up ? ' is-upper' : ''}${s.id === 'uk_central' ? ' is-head' : ''}${hi === s.id ? ' is-hi' : ''}`}
                data-tip={SCENARIOS.indexOf(s)}
              >
                {/* r = 23 keeps the tap target at least 24px where the map is drawn about 300px wide on a phone;
                    the halo shown on hover stays at r = 14 */}
                <circle cx={x} cy={y} r="23" className="mx-hit mx-hit-area" />
                <circle cx={x} cy={y} r="14" className="mx-hit" />
                <circle cx={x} cy={y} r={s.id === 'uk_central' ? 7 : 6} />
                <text x={up ? x - 12 : x + 12} y={y + 4} textAnchor={up ? 'end' : 'start'} className="mx-pt-label">
                  {split && s.label.includes(', ') ? (
                    <>
                      <tspan x={up ? x - 12 : x + 12}>{s.label.slice(0, s.label.indexOf(', ') + 1)}</tspan>
                      <tspan x={up ? x - 12 : x + 12} dy="1.15em">
                        {s.label.slice(s.label.indexOf(', ') + 2)}
                      </tspan>
                    </>
                  ) : (
                    s.label
                  )}
                </text>
              </g>
            );
          })}
        </svg>
      </ChartHover>
      <ul className="mx-map-read">
        <li>
          <span data-icon="" className="mx-key is-range" aria-hidden="true" />
          <span>The line joins the UK scenarios, derived from OBR and IMF figures.</span>
        </li>
        <li>
          <span data-icon="" className="mx-key" aria-hidden="true" />
          <span>UK central, the darker point, is the headline scenario.</span>
        </li>
        <li>
          <span data-icon="" className="mx-key is-upper" aria-hidden="true" />
          <span>Korinek et al., substantial (US): the upper case, beyond UK range.</span>
        </li>
      </ul>
      </div>
    </figure>
  );
}
