'use client';

import { useMemo } from 'react';
import PlotPanel from '@/components/PlotPanel.jsx';
import { Cv } from '@/tabs/ai/scenarioStory.jsx';
import data from '@/data/ukAiPaths.json';
import { ARM_META, FORECAST_COLOR, HISTORY_COLOR, OUTTURN_MARK, SCENARIO_MARK } from '@/tabs/ai/series.js';
import { FIRST_YEAR } from '@/tabs/ai/metrics.js';
import { URLS } from '@/tabs/ai/links.js';

// Each panel carries the OBR/ONS outturn and March 2026 EFO forecast line,
// then the three model paths branching at 2026 (how they are placed on the
// OBR level: caveat-levels). Colours and arm names come from the shared
// series palette, not the JSON.
const ARM_BY_NAME = Object.fromEntries(Object.entries(ARM_META).map(([k, m]) => [m.label, k]));
const FIRST_X = Math.min(...data.panels.flatMap((p) => p.traces[0].x));

function splitHistory(t) {
  const pts = t.x.map((x, i) => [x, t.y[i]]);
  const upTo = pts.filter(([x]) => x <= FIRST_YEAR);
  const from = pts.filter(([x]) => x >= FIRST_YEAR);
  return [
    { ...t, name: 'OBR/ONS outturn and EFO forecast', x: upTo.map((p) => p[0]), y: upTo.map((p) => p[1]), color: HISTORY_COLOR, width: 1.8 },
    {
      ...t,
      name: `OBR forecast after ${FIRST_YEAR} (not a scenario)`,
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
    yTitle: '', // units are in the card subtitle
    traces: panel.traces.flatMap((t, i) => {
      if (i === 0) return splitHistory(t);
      const arm = ARM_BY_NAME[t.name];
      return [arm ? { ...t, name: ARM_META[arm].label, color: ARM_META[arm].color, width: 2.6 } : { ...t, width: 2.6 }];
    }),
    shapes: (panel.shapes || []).map((s) =>
      s.x0 === FIRST_YEAR
        ? { ...s, color: SCENARIO_MARK, label: 'AI scenarios begin' }
        : { ...s, color: OUTTURN_MARK, label: 'End of outturn', labelSide: 'left' },
    ),
  };
}

// Model variable -> the ukAiPaths panel carrying its OBR series.
const PANEL_FOR = {
  Y: /^Real GDP|GDP \(£bn/,
  C: /^Consumption/,
  I: /^Investment/,
  G: /^Government/,
  total_tax_revenue: /^Tax/,
  D: /debt/i,
};
export const panelTitleFor = (v) => (PANEL_FOR[v] ? data.panels.find((p) => PANEL_FOR[v].test(p.title))?.title : null);

// Data notes for the selected panel, one line per item, from its provenance.
function DataNotes({ p }) {
  if (!p) return null;
  const pre = p.pre_2008;
  const items = [
    ['Series', p.definition],
    ['Source', p.table ? `${(p.source || '').replace(/\s*\(file .*$/, '')}, ${p.table}` : p.source],
    pre ? [`${pre.years}`, `ONS ${pre.series.map((x) => x.series_id).join(', ')}: ${pre.formula}`] : null,
    ['Year basis', p.year_basis],
    ['Outturn', p.last_outturn],
  ].filter((x) => x && x[1]);
  return (
    <details className="growth-details data-notes">
      <summary>Data notes</summary>
      <ul className="txt-bullets">
        {items.map(([k, v]) => (
          <li key={k}>
            <b>{k}:</b> {v}
          </li>
        ))}
      </ul>
    </details>
  );
}

// Legend row shared by both chart cards: the three scenarios, plus the
// OBR/ONS history lines on the context chart.
export function ArmLegend({ history = false }) {
  return (
    <div className="plot-legend">
      <div className="legend-group">
        {Object.values(ARM_META).map((m) => (
          <span key={m.label} className="legend-item">
            <span className="legend-line" style={{ borderTopColor: m.color }} />
            {m.label}
          </span>
        ))}
      </div>
      {history ? (
        <div className="legend-group">
          <span className="legend-item">
            <span className="legend-line" style={{ borderTopColor: HISTORY_COLOR, borderTopWidth: 1.8 }} />
            OBR/ONS outturn and EFO forecast
          </span>
          <span className="legend-item">
            <span className="legend-line dotted" style={{ borderTopColor: FORECAST_COLOR }} />
            OBR forecast after {FIRST_YEAR} (not a scenario)
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default function HistoricalPaths({ variable, label, selector }) {
  const shown = panelTitleFor(variable);
  const panels = useMemo(() => data.panels.map(restyle), []);
  const panel = data.panels.find((p) => p.title === shown);

  return (
    <section className="section-card">
      <div className="chart-head">
        <div className="growth-eyebrow">Context</div>
        <h2 className="chart-takeaway">
          {label} since {FIRST_X}
        </h2>
        <p className="chart-subtitle">{shown ? `${shown}; scenarios from ${FIRST_YEAR}` : 'No OBR series'}</p>
      </div>

      {selector}

      <div className="chart-slot">
        <div className="panel-grid cols-1">
          {panels.map((p, i) => (
            <PlotPanel key={i} panel={p} visible={p.title === shown} />
          ))}
        </div>
        {shown ? null : (
          <p className="chart-empty">No OBR series for {label.toLowerCase()}; see the index chart.</p>
        )}
      </div>

      <div className="chart-foot">
        <ArmLegend history />
        <p className="chart-note">
          Sources: OBR March 2026 EFO (
          <a href={URLS.obrEconTables} target="_blank" rel="noreferrer">
            economy tables
          </a>
          ,{' '}
          <a href={URLS.obrPsfDatabank} target="_blank" rel="noreferrer">
            public finances databank
          </a>
          ) and ONS. Scenario paths apply the model&rsquo;s changes to the OBR&rsquo;s {FIRST_YEAR} level (
          <Cv id="levels" />
          ).
        </p>
        <DataNotes p={panel?.provenance} />
      </div>
    </section>
  );
}
