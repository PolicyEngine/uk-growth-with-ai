'use client';

import { useMemo, useState } from 'react';
import Select from '@/components/Select.jsx';
import PlotPanel from '@/components/PlotPanel.jsx';
import CaveatLink from '@/tabs/ai/CaveatLink.jsx';
import data from '@/data/ukAiPaths.json';
import { ARM_META, FORECAST_COLOR, HISTORY_COLOR, OUTTURN_MARK, SCENARIO_MARK } from '@/tabs/ai/series.js';

// Each panel carries the OBR outturn/forecast line from 2000, then the three
// model paths branching at 2026. The model solves in abstract units, so each
// scenario is rebased onto the OBR value at 2026 — levels are indicative,
// the divergence between the three is the result.
//
// Colours come from the shared series palette (CSS tokens, resolved by
// PlotPanel), not from the JSON, so this chart matches every other one.
const BY_NAME = Object.fromEntries(Object.values(ARM_META).map((m) => [m.label, m.color]));
const HISTORY_NAME = 'OBR outturn / forecast';
const FORECAST_NAME = 'OBR forecast, 2026–29 — not a scenario';
const SPLIT = 2026;
const isLevels = (panel) => panel.title.includes('£bn');

// The OBR line runs to 2029, past the point where the scenarios begin. From
// 2026 it is drawn as a thin dotted line so it does not read as a fourth
// scenario; for GDP in £bn it is also in cash terms while the scenarios grow
// at the model's real rates, so there it is labelled as not comparable.
function splitHistory(t, panel) {
  const upTo = t.x.map((x, i) => [x, t.y[i]]).filter(([x]) => x <= SPLIT);
  const from = t.x.map((x, i) => [x, t.y[i]]).filter(([x]) => x >= SPLIT);
  return [
    { ...t, x: upTo.map((p) => p[0]), y: upTo.map((p) => p[1]), color: HISTORY_COLOR, width: 1.8 },
    {
      ...t,
      name: isLevels(panel) ? 'OBR forecast, nominal — not a scenario, not comparable' : FORECAST_NAME,
      x: from.map((p) => p[0]),
      y: from.map((p) => p[1]),
      color: FORECAST_COLOR,
      width: 1.4,
      dash: 'dot',
    },
  ];
}

function restyle(panel) {
  return {
    ...panel,
    traces: panel.traces.flatMap((t) =>
      t.name === HISTORY_NAME
        ? splitHistory(t, panel)
        : [{ ...t, color: BY_NAME[t.name] || t.color, width: 2.6 }],
    ),
    shapes: (panel.shapes || []).map((s) =>
      s.x0 === 2026
        ? { ...s, color: SCENARIO_MARK, label: 'AI scenarios begin' }
        : { ...s, color: OUTTURN_MARK, label: 'End of outturn', labelSide: 'left' },
    ),
  };
}

const OPTIONS = data.panels.map((p) => ({
  value: p.title,
  label: p.title.replace(' (% GDP)', '').replace(' (£bn)', '').replace('Gov. Consumption', 'Government'),
}));

export default function HistoricalPaths() {
  const [shown, setShown] = useState(OPTIONS[OPTIONS.length - 1].value); // GDP first
  const panels = useMemo(() => data.panels.map(restyle), []);
  const levels = shown.includes('£bn');

  return (
    <section className="section-card">
      <div className="growth-eyebrow">Context: the same paths in levels since 2000</div>
      <div className="chart-head">
        <h2 className="chart-takeaway">
          The scenarios branch off in 2026; read the divergence between them, not their level
        </h2>
        <p className="chart-subtitle">
          UK paths, 2000&ndash;2029 &middot; OBR outturn to 2023 and forecast to 2029; OG-UK scenarios
          from 2026, rebased to the OBR level at 2026
        </p>
      </div>

      <div className="results-toolbar">
        <Select label="Show" options={OPTIONS} value={shown} onChange={setShown} />
      </div>

      <div className="panel-grid cols-1">
        {panels.map((panel, i) => (
          <PlotPanel key={i} panel={panel} visible={panel.title === shown} />
        ))}
      </div>

      <div className="plot-legend">
        <div className="legend-group">
          <span className="legend-item">
            <span className="legend-line" style={{ borderTopColor: HISTORY_COLOR, borderTopWidth: 1.8 }} />
            {HISTORY_NAME}, to 2026
          </span>
          <span className="legend-item">
            <span className="legend-line dotted" style={{ borderTopColor: FORECAST_COLOR }} />
            {levels ? 'OBR forecast, nominal — not a scenario, not comparable' : FORECAST_NAME}
          </span>
        </div>
        <div className="legend-group">
          {Object.values(ARM_META).map((m) => (
            <span key={m.label} className="legend-item">
              <span className="legend-line" style={{ borderTopColor: m.color }} />
              {m.label}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-note">
        Outturn and forecast: OBR, as carried in the og-model-dashboard template. Scenario paths: OG-UK,
        1&nbsp;sector. Y axes start at zero. Window ends 2029 &mdash; see{' '}
        <CaveatLink id="caveat-window">caveat 5</CaveatLink>; OBR GDP line in cash terms &mdash; see{' '}
        <CaveatLink id="caveat-nominal">caveat 8</CaveatLink>.
      </p>
    </section>
  );
}
