'use client';

import { iconFor } from '@/lib/concepts.js';
import IconText from '@/tabs/method/IconText.jsx';
import { Items } from '@/components/story/Items.jsx';

import { useState } from 'react';
import Card from '@/components/ui/Card.jsx';
import ControlBar, { ControlGroup, Segmented } from '@/components/ui/ControlBar.jsx';
import { NavLink } from '@/lib/nav.jsx';
import MAP from '@/data/site-evidence-map.json';
import { S, SCENARIOS, gap, fmt, CENTRAL, BOUND, HEADLINE_YEAR } from '@/tabs/ai/surprise.js';
import './evidence.css';

// The UK evidence map: one row per published figure on AI's economic
// effects (data/site-evidence-map.json), each against its own baseline and at
// its own horizon, with OG-UK's rows beside the GDP and wage figures. This
// table is the one home of the published figures; "Where our numbers sit"
// draws the GDP and wage rows. OG-UK's figures are printed on Explore, so its
// rows link there and carry the values only in the download (from
// surprise2028.json, never typed).

const METRIC_LABEL = Object.fromEntries(MAP.metrics.map((m) => [m.id, m.label]));
const METRIC_ORDER = Object.fromEntries(MAP.metrics.map((m, i) => [m.id, i]));
const OUR_VARS = { gdp: ['Y', 'Real GDP'], wage: ['w', 'Average wage'] };

const MEASURES = [{ id: 'all', label: 'All' }, ...MAP.metrics.map((m) => ({ id: m.id, label: m.label }))];
const COUNTRIES = [
  { id: 'all', label: 'All' },
  { id: 'uk', label: 'UK' },
  { id: 'other', label: 'US and other' },
];
const SORTS = [
  { id: 'metric', label: 'Measure' },
  { id: 'institution', label: 'Institution' },
  { id: 'year', label: 'Newest' },
];

export const isUK = (r) => r.country === 'UK';
export const day = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

// OG-UK's rows: the main arm's headline-year gap in each scenario, at both
// closures, read through gap(). The page links to Explore; the values go to
// the download only.
export function ourRows() {
  return Object.entries(OUR_VARS).map(([metric, [v, label]]) => ({
    id: `oguk-${metric}`,
    ours: true,
    institution: 'PolicyEngine (this study)',
    study: 'OG-UK, the 2028 surprise: automation + productivity arm',
    url: null,
    year: Number(S.generated_utc.slice(0, 4)),
    metric,
    measure: `${label} in each scenario, UK low to Korinek et al. (upper)`,
    horizon: `${HEADLINE_YEAR}, year 4 of adoption`,
    baseline: 'OBR-central path',
    country: 'UK',
    loc: 'surprise2028.json',
    checked: S.generated_utc.slice(0, 10),
    how: 'solve',
    csv: SCENARIOS.map((s) => `${s.label}: ${fmt(gap(s.id, 'tfp', CENTRAL, v))} (central closure), ${fmt(gap(s.id, 'tfp', BOUND, v))} (closed capital)`).join('; '),
  }));
}

const BY = {
  metric: (a, b) => METRIC_ORDER[a.metric] - METRIC_ORDER[b.metric] || Number(Boolean(b.ours)) - Number(Boolean(a.ours)) || isUK(b) - isUK(a),
  institution: (a, b) => a.institution.localeCompare(b.institution),
  year: (a, b) => b.year - a.year,
};

// Rows in view: filtered, then sorted (a stable sort keeps the file's order,
// which runs from official UK sources to academic studies, within ties).
export function view(rows, { measure = 'all', country = 'all', sort = 'metric' } = {}) {
  return rows
    .filter((r) => measure === 'all' || r.metric === measure)
    .filter((r) => country === 'all' || (country === 'uk' ? isUK(r) : !isUK(r)))
    .map((r, i) => ({ r, i }))
    .sort((x, y) => BY[sort](x.r, y.r) || x.i - y.i)
    .map((x) => x.r);
}

const HOW = { read: 'Re-read in the primary text', review: 'Confirmed in the 15 Nov 2026 UK-studies review', solve: 'OG-UK solve output' };

export function mapTable(rows) {
  return {
    columns: ['Institution', 'Study', 'Year', 'Measure', 'What is measured', 'Value', 'Horizon', 'Baseline', 'Country', 'Where in the source', 'Link', 'Checked', 'How checked'],
    rows: rows.map((r) => [
      r.institution,
      r.study,
      r.year,
      METRIC_LABEL[r.metric],
      r.measure,
      r.ours ? r.csv : r.value,
      r.horizon,
      r.baseline,
      r.country,
      r.loc,
      r.url ?? '',
      r.checked,
      HOW[r.how] ?? '',
    ]),
  };
}

export default function EvidenceMap({ map = MAP }) {
  const [measure, setMeasure] = useState('all');
  const [country, setCountry] = useState('all');
  const [sort, setSort] = useState('metric');
  const all = [...ourRows(), ...map.rows];
  const shown = view(all, { measure, country, sort });
  const published = map.rows.length;
  const bodies = new Set(map.rows.map((r) => r.institution)).size;
  return (
    <Card
      id="uk-evidence-map"
      icon={iconFor('table')}
      title="Published estimates of AI’s economic effects"
      className="ev-card"
      finding={<IconText icon="table">{`${published} published figures from ${bodies} institutions and authors, each on its own baseline and horizon; OG-UK’s rows sit beside them.`}</IconText>}
      controls={
        <ControlBar label="Evidence map: options">
          <ControlGroup label="Measure">
            <Segmented options={MEASURES} value={measure} onChange={setMeasure} label="Measure" />
          </ControlGroup>
          <ControlGroup label="Country">
            <Segmented options={COUNTRIES} value={country} onChange={setCountry} label="Country" />
          </ControlGroup>
          <ControlGroup label="Sort">
            <Segmented options={SORTS} value={sort} onChange={setSort} label="Sort" />
          </ControlGroup>
        </ControlBar>
      }
      logo={false}
      aboutTitle="About this table"
      about={{
        how: (
          <Items
            items={[
              { icon: 'source', text: 'Each figure as published, against the study’s own baseline (mostly no AI).' },
              { icon: 'timing', text: 'Each at its own horizon; none is converted.' },
              { icon: 'foreign', text: 'Studies of the US or other economies are labelled.' },
              { icon: 'model', text: `OG-UK rows: the automation + productivity arm’s ${HEADLINE_YEAR} gap.` },
              { icon: 'link', text: 'That gap is against the OBR-central path; figures on Explore, download.' },
            ]}
          />
        ),
        sources: (
          <Items
            items={[
              { icon: 'check', text: 'Read in the primary text, at the page or table given.' },
              { icon: 'period', text: 'Read on the date given.' },
              { icon: 'check', text: 'Or confirmed in the 15 November 2026 UK-studies review (marked “review”).' },
              { icon: 'excluded', text: 'A figure not yet confirmed in a primary text is left out.' },
              { icon: 'caveat', text: 'Bodies with no AI-specific estimate show their nearest output.' },
              { icon: 'data', text: 'The table is data/site-evidence-map.json.' },
            ]}
          />
        ),
      }}
      download={{
        title: 'UK evidence map',
        context: `Published estimates of AI’s economic effects, each against its own baseline; OG-UK rows: ${HEADLINE_YEAR} gap against the OBR-central path, from surprise2028.json (built from ${S.source_commit})`,
        table: () => mapTable(view(all)),
      }}
    >
      <p className="ev-count" aria-live="polite">
        <IconText icon="table">
          Showing {shown.length} of {all.length} rows
        </IconText>
      </p>
      <div className="ev-wrap">
        <table className="data-table evidence-table ev-table">
          <caption className="visually-hidden">Published estimates of AI’s economic effects, with OG-UK’s results</caption>
          <thead>
            <tr>
              <th scope="col">Institution</th>
              <th scope="col">Study</th>
              <th scope="col">Measure</th>
              <th scope="col">Value</th>
              <th scope="col">Horizon and baseline</th>
              <th scope="col">Country</th>
              <th scope="col">Checked</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} id={`ev-row-${r.id}`} className={r.ours ? 'is-ours' : undefined} data-row={r.id}>
                <th scope="row" data-label="Institution">
                  {r.institution}
                </th>
                <td data-label="Study">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.study}
                    </a>
                  ) : (
                    r.study
                  )}
                  <span className="ev-loc">
                    {r.year}
                    {r.ours ? '' : ` · ${r.loc}`}
                  </span>
                </td>
                <td data-label="Measure">
                  <span className="ev-metric">{METRIC_LABEL[r.metric]}</span>
                  <span className="ev-measure">{r.measure}</span>
                </td>
                <td data-label="Value" className="ev-value">
                  {r.ours ? (
                    <NavLink tab="explore" sub="economy" anchor="income">
                      On Explore
                    </NavLink>
                  ) : (
                    <span className={r.unverified ? 'ev-unverified' : undefined}>{r.value}</span>
                  )}
                </td>
                <td data-label="Horizon">
                  {r.horizon}
                  {r.baseline !== '—' ? <span className="ev-loc">Against: {r.baseline}</span> : null}
                </td>
                <td data-label="Country">{r.country}</td>
                <td data-label="Checked" className="ev-checked">
                  {day(r.checked)}
                  {r.how === 'review' ? <span className="ev-how">review</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
