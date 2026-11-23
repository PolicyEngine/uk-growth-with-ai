'use client';

import Card from '@/components/ui/Card.jsx';
import { Items } from '@/components/story/Items.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { iconFor } from '@/lib/concepts.js';
import IconText from '@/tabs/method/IconText.jsx';
import MAP from '@/data/site-evidence-map.json';
import { SCENARIOS, HEADLINE_YEAR, CENTRAL, BOUND, gap } from '@/tabs/ai/surprise.js';
import { ADOPTION, ADOPTION_YEAR } from '@/lib/obrOverlap.js';
import { valueHref } from './pages.js';
import IMF from './imfGap.json';

// GDP around the headline year: the macro model beside the published
// estimates that are a level at or near it (benchmarks review, 22 Nov 2026,
// B6). The published figures stay in data/site-evidence-map.json: the rows
// flagged `near2030` carry this card's measure, horizon, baseline and
// whether the figure is printed or derived, and a joined or derived value
// text where the row's own value is not the level shown. Two figures are
// read from their homes, not typed: the OBR's year-4 level (lib/obrOverlap.js)
// and the IMF's year-4 output (imfGap.json). The macro model's figures come
// from the data (automation + productivity, headline year, common rule).

const pct1 = (x) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(1)}%`;
const pct2 = (x) => `+${x.toFixed(2)}%`;

// the level shown for a flagged row
export function nearValue(r) {
  if (r.id === 'obr-bp9') return ADOPTION ? `${pct2(ADOPTION.lo)} to ${pct2(ADOPTION.hi)}` : null;
  if (r.id === 'imf-sip-y5') return `${pct1(IMF.imf_y4_output_pct)} (year 4); ${r.value} (year 5)`;
  return r.near2030.value ?? r.value;
}

export const NEAR_ROWS = MAP.rows
  .filter((r) => r.near2030 && !r.unverified)
  .sort((a, b) => a.near2030.order - b.near2030.order)
  .map((r) => ({ id: r.id, source: r.near2030.source ?? r.institution, href: r.near2030.page && r.url ? `${r.url}#page=${r.near2030.page}` : valueHref(r), measure: r.near2030.measure, value: nearValue(r), horizon: r.near2030.horizon ?? r.horizon, baseline: r.near2030.baseline ?? r.baseline, kind: r.near2030.kind }));

// the macro model's row: every scenario, some foreign capital, then none
export function ourValue() {
  const at = (cl) => SCENARIOS.map((s) => ({ s, x: gap(s.id, 'tfp', cl, 'Y') }));
  const some = at(CENTRAL);
  const none = at(BOUND);
  if ([...some, ...none].some((c) => c.x == null)) return null;
  return `${some.map((c) => `${c.s.id === 'korinek' ? c.s.short : c.s.label} ${pct1(c.x)}`).join('; ')}. No foreign capital: ${none.map((c) => pct1(c.x)).join(', ')}`;
}

// the headline year is year RAMP_STEPS of the shock (lib/obrOverlap.js)
const YEAR_N = ADOPTION_YEAR;
const COLS = ['Source', 'Measure', 'Level, % above baseline', 'Horizon', 'Baseline', 'Printed or derived'];

export function nearTable() {
  return {
    columns: COLS,
    rows: [
      ['Macro model (this study)', 'GDP, automation + productivity', ourValue() ?? 'not yet solved', `${HEADLINE_YEAR}, year ${YEAR_N}`, 'Forecast path, which already includes the OBR’s AI effect', 'From the data'],
      ...NEAR_ROWS.map((r) => [r.source, r.measure, r.value, r.horizon, r.baseline, r.kind]),
    ],
  };
}

export default function Near2030() {
  const ours = ourValue();
  return (
    <Card
      id="gdp-near-2030"
      icon={iconFor('gdp')}
      title={`GDP around ${HEADLINE_YEAR}: the macro model beside published estimates`}
      className="ev-card ev-near"
      finding={<IconText icon="range">Level above each study’s own baseline, at or near {HEADLINE_YEAR}. No annual growth rate is converted to a level; three figures are derived, and say so.</IconText>}
      logo={false}
      aboutTitle="About this table"
      about={{
        caveats: (
          <Items
            items={[
              { icon: 'excluded', text: 'Left out: the OECD (an annual rate; DSIT’s figure is built from it) and the Bank of England (a firm survey).' },
              { icon: 'excluded', text: 'PwC 2017 stays in the lane above: most of its gain is consumption effects.' },
              { icon: 'excluded', text: 'Acemoglu, Bergeaud, and Aghion and Bunel: ten-year horizons, not the UK.' },
              { icon: 'excluded', text: 'Goldman Sachs: no start date, so no level at this horizon.' },
              { icon: 'excluded', text: 'The OBR’s displacement scenario holds GDP unchanged; compare it with the stress test on Explore, Public finances.' },
            ]}
          />
        ),
        sources: (
          <Items
            items={[
              { icon: 'data', text: 'Published figures: data/site-evidence-map.json, the rows flagged near2030.' },
            ]}
          />
        ),
      }}
      download={{
        title: `GDP around ${HEADLINE_YEAR}`,
        context: `Level above each study’s own baseline; macro model: automation + productivity, ${HEADLINE_YEAR} gap against the OBR’s central forecast path`,
        table: nearTable,
      }}
    >
      <div className="ev-wrap" data-no-axes="A table of published figures">
        <table className="data-table evidence-table ev-table ev-near-table">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="is-ours" data-row="oguk-near">
              <th scope="row" data-label="Source">
                <NavLink tab="explore" sub="economy" anchor="economy-wall">
                  Macro model (this study)
                </NavLink>
              </th>
              <td data-label="Measure">GDP, automation + productivity</td>
              <td data-label="Level" className="ev-value">
                {ours ?? 'not yet solved'}
              </td>
              <td data-label="Horizon">
                {HEADLINE_YEAR}, year {YEAR_N}
              </td>
              <td data-label="Baseline">Forecast path, which already includes the OBR’s AI effect</td>
              <td data-label="Printed or derived">From the data</td>
            </tr>
            {NEAR_ROWS.map((r) => (
              <tr key={r.id} data-row={r.id}>
                <th scope="row" data-label="Source">
                  <a href={r.href} target="_blank" rel="noreferrer">
                    {r.source}
                  </a>
                </th>
                <td data-label="Measure">{r.measure}</td>
                <td data-label="Level" className="ev-value">
                  {r.value}
                </td>
                <td data-label="Horizon">{r.horizon}</td>
                <td data-label="Baseline">{r.baseline}</td>
                <td data-label="Printed or derived">{r.kind}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ev-near-note">
        <IconText icon="forecast">
          The OBR’s effect is already in the macro model’s forecast path, so UK low and much of UK central overlap with it.
        </IconText>
      </p>
    </Card>
  );
}
