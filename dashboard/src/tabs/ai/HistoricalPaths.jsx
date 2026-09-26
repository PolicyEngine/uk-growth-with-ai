'use client';

import { useState } from 'react';
import Select from '@/components/Select.jsx';
import PlotPanel from '@/components/PlotPanel.jsx';
import data from '@/data/ukAiPaths.json';

// Each panel carries the OBR outturn/forecast line from 2000, then the three
// model paths branching at 2026. The model solves in abstract units, so each
// scenario is rebased onto the OBR value at 2026 — levels are indicative,
// the divergence between the three is the result.
const OPTIONS = data.panels.map((p) => ({
  value: p.title,
  label: p.title.replace(' (% GDP)', '').replace(' (£bn)', '').replace('Gov. Consumption', 'Government'),
}));

export default function HistoricalPaths() {
  const [shown, setShown] = useState(OPTIONS[OPTIONS.length - 1].value); // GDP first

  return (
    <section className="section-card">
      <div className="section-heading">UK paths, 2000&ndash;2029</div>
      <p className="section-description">
        History and OBR forecast to 2025, then the three scenarios from 2026. The dotted line marks the end
        of outturn; the gold line is where the AI scenarios begin.
      </p>

      <div className="results-toolbar">
        <Select label="Show" options={OPTIONS} value={shown} onChange={setShown} />
      </div>

      <div className="panel-grid cols-1">
        {data.panels.map((panel, i) => (
          <PlotPanel key={i} panel={panel} visible={panel.title === shown} />
        ))}
      </div>

      <p className="obr-source">
        Outturn and forecast: OBR, as carried in the og-model-dashboard template. Scenario paths: OG-UK,
        1&nbsp;sector, rebased to the OBR level at 2026 — compare the divergence, not the levels.
      </p>
    </section>
  );
}
