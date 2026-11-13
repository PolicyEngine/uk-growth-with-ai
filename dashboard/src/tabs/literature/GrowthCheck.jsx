'use client';

import Icon from '@/components/ab/Icon.jsx';
import { TipBox } from '@/components/ab/Tip.jsx';
import F from '@/data/methodFacts.json';
import { OBR_GROWTH, SOURCES } from '@/data/literature.js';
import { CENTRAL } from '@/tabs/ai/surprise.js';
import { ext, useHover } from '../shared/ui.jsx';

// One KPI: the OBR-central path's average GDP growth over 2027-2030 against the
// OBR's, with the four years as hoverable bars. Ours is generated from the
// committed baseline solve (methodFacts.json); the OBR's is EFO March 2026.
export default function GrowthCheck() {
  const g = F.baseline_growth[CENTRAL];
  const { hi, ref, bind } = useHover();
  const max = Math.max(OBR_GROWTH.value, ...g.growth_pct) * 1.15;
  const y = (v) => 100 - (v / max) * 100;
  const span = `${g.years[0]}–${g.years[g.years.length - 1]}`;
  return (
    <div className="info-card mx-card mx-kpi" ref={ref}>
      <h3 className="info-card-title">
        <Icon name="gauge" size={18} />
        <span>The OG-UK baseline against the OBR</span>
      </h3>
      <div className="mx-kpi-body">
        <div className="mx-kpi-figs">
          <div>
            <span className="mx-kpi-k">OG-UK baseline</span>
            <span className="mx-kpi-v">{g.mean_pct.toFixed(2)}%</span>
          </div>
          <div>
            <span className="mx-kpi-k">OBR, March 2026</span>
            <span className="mx-kpi-v is-ref">{OBR_GROWTH.value.toFixed(1)}%</span>
          </div>
          <p className="mx-sub">
            Average GDP growth a year, {span}. The OBR publishes one decimal place ({ext(OBR_GROWTH.url, SOURCES[OBR_GROWTH.src].short)}, {OBR_GROWTH.loc}).
          </p>
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
    </div>
  );
}
