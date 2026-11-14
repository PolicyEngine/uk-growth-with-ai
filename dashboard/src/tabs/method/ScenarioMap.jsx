'use client';

import { TipBox } from '@/components/ab/Tip.jsx';
import { SCENARIOS, KORINEK_FULL, HEADLINE_YEAR } from '@/tabs/ai/surprise.js';
import { useHover } from '../shared/ui.jsx';

// The four scenarios on one map: productivity gain (x) against labour-share
// fall (y), both the levels reached in the headline year, read from
// surprise2028.json. Hover, tap or focus a point for its inputs.
const ROLE = {
  uk_low: 'Lower end of the UK sources',
  uk_central: 'Headline: the IMF UK year-4 pair',
  uk_high: 'OBR upper-end share path, high productivity',
  korinek: 'US inputs, kept as an upper case',
};
const W = 560;
// The bottom margin leaves room for the tick row and the axis title at the
// phone's larger type (19 units), where they met at 44.
const H = 272;
const M = { l: 52, r: 24, t: 18, b: 56 };

export default function ScenarioMap() {
  const { hi, ref, bind } = useHover();
  const xMax = Math.ceil(Math.max(...SCENARIOS.map((s) => s.tfp_gain_pct)) + 0.4);
  const yMax = Math.ceil(Math.max(...SCENARIOS.map((s) => s.labour_share_fall_pp)) + 0.6);
  const sx = (v) => M.l + (v / xMax) * (W - M.l - M.r);
  const sy = (v) => M.t + (v / yMax) * (H - M.t - M.b);
  const xt = Array.from({ length: xMax + 1 }, (_, i) => i);
  const yt = Array.from({ length: yMax + 1 }, (_, i) => i);
  const uk = SCENARIOS.filter((s) => s.id !== 'korinek');
  const h = SCENARIOS.find((s) => s.id === hi);
  return (
    <figure className="mx-map" ref={ref}>
      <figcaption className="mx-fig-cap">
        <span className="mx-fig-title">Scenario inputs, {HEADLINE_YEAR}</span>
        <span className="mx-fig-sub">Labour-share fall (pp, downwards) against the gain in output at fixed inputs (%)</span>
      </figcaption>
      <div className="mx-map-body">
      <div className="mx-map-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of the four scenarios' inputs">
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
          <text className="mx-axis-title" x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle">
            Output at fixed inputs →
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
                {...bind(s.id, `${s.label}: labour share −${s.labour_share_fall_pp}pp, output at fixed inputs +${s.tfp_gain_pct}%`)}
              >
                {/* r = 23 keeps the tap target at least 24px where the map is drawn about 300px wide on a phone;
                    the halo shown on hover stays at r = 14 */}
                <circle cx={x} cy={y} r="23" className="mx-hit mx-hit-area" />
                <circle cx={x} cy={y} r="14" className="mx-hit" />
                <circle cx={x} cy={y} r={s.id === 'uk_central' ? 7 : 6} />
                <text x={up ? x - 12 : x + 12} y={y + 4} textAnchor={up ? 'end' : 'start'} className="mx-pt-label">
                  {s.label}
                </text>
              </g>
            );
          })}
        </svg>
        {h ? (
          <span
            className="mx-tip-anchor"
            style={{ left: `${(sx(h.tfp_gain_pct) / W) * 100}%`, top: `${(sy(h.labour_share_fall_pp) / H) * 100}%` }}
          >
            <TipBox className="mx-tip">
              <b>{h.id === 'korinek' ? KORINEK_FULL : h.label}</b>
              <span>{ROLE[h.id]}</span>
            </TipBox>
          </span>
        ) : null}
      </div>
      <ul className="mx-map-read">
        <li>
          <span className="mx-key is-range" aria-hidden="true" />
          <span>The line joins the three UK scenarios. Each pairs a labour-share fall with the productivity gain the same sources imply, so they move together.</span>
        </li>
        <li>
          <span className="mx-key" aria-hidden="true" />
          <span>UK central, the darker point, is the headline scenario.</span>
        </li>
        <li>
          <span className="mx-key is-upper" aria-hidden="true" />
          <span>Korinek et al.&rsquo;s US &ldquo;substantial&rdquo; case lies beyond the UK range on both inputs and is kept as a labelled upper case.</span>
        </li>
      </ul>
      </div>
    </figure>
  );
}
