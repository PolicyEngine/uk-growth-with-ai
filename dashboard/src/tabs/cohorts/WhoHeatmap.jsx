'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Card from '@/components/ui/Card.jsx';
import { sourcesItems } from '@/tabs/explore/sources.jsx';
import { fileItem } from '@/lib/sourceItems.js';
import { AxisTitles } from '@/tabs/explore/axes.jsx';
import { OG_RESULT_URLS, COHORTS_SHA, RESULTS_SHA } from '@/tabs/ai/links.js';
import Pill from '@/components/ui/Pill.jsx';
import { iconFor } from '@/lib/concepts.js';
import { ruleLabel } from '@/lib/labels.js';
import D from '@/data/cohorts2028.json';
import { Lead } from '@/tabs/explore/direction.jsx';

// Who gains by age and lifetime-earnings group: a heatmap diverging around
// zero, for the arm, fiscal rule and closure in view. Rows: age in the shock
// year (every ten years, 20 to 90: single cohorts, never averaged); columns:
// the seven earnings groups and all groups.
//
// The measure toggle (shared with the "Adults who lose" tile) re-colours
// the 100-dot strip beside the heatmap for every measure: one dot per 1% of
// adults, whole dots only, "under 1%" as no full dot. The heatmap itself has
// a grid only for the first measure: the data file holds a birth year x
// earnings group grid for "as modelled" alone (`cev`, `cev_all`). The other
// three show as holes; nothing is interpolated. (`dnfull.by_fill.*.by_age`
// holds two by-age series for all groups, but the file does not label which
// measure each is, so they are not drawn.)
//
// Cells print no figure: colour is the reading, one diverging scale per
// measure, its round limits printed in the key (axis text). Hover or focus
// a cell for its value. The cells cross-fade between measures; no value is
// tweened.

export const AGES = [90, 80, 70, 60, 50, 40, 30, 20];
const GROUPS = ['Bottom 25%', '25th–50th', '50th–70th', '70th–80th', '80th–90th', '90th–99th', 'Top 1%'];
const ARM_NAME = { tfp: 'Automation + productivity', zfixed: 'Automation, technology unchanged', stress: 'OBR-style stress test: no output gain' };
const pct = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(2)}%`;

// [{ age, cells: [7 groups..., all] }] for a measure; null = not in the data.
export function grid(cl, rule, arm, measure) {
  const C = D.closures[cl];
  const c = C.rules[rule][arm];
  return AGES.map((age) => {
    const i = C.birth_year.indexOf(D.shock_year - age);
    return { age, cells: measure === 'M' ? [...c.cev[i], c.cev_all[i]] : [...GROUPS.map(() => null), null] };
  });
}

const LIMITS = [0.25, 0.5, 1, 1.5, 2, 3, 5];
export const limitOf = (rows) => {
  const m = Math.max(0, ...rows.flatMap((r) => r.cells).filter((x) => x != null).map(Math.abs));
  return LIMITS.find((l) => l >= m) ?? Math.ceil(m);
};

// A share of adults as whole dots: the low end of a range solid, the rest
// to its high end hatched; under 1% is no full dot.
export function dotCounts(losing) {
  const lo = Math.min(...losing);
  const hi = Math.max(...losing);
  const solid = lo < 1 ? 0 : Math.round(lo);
  return { solid, range: Math.max(0, (hi < 1 ? 0 : Math.round(hi)) - solid) };
}

// "Adults who lose" as 100 dots, re-coloured for the measure picked. Prints
// no figure: each share's home is its toggle in the tile above.
export function DotStrip({ m }) {
  const { solid, range } = dotCounts(m.losing);
  return (
    <figure className="ex-dotstrip">
      <figcaption>
        <Icon name={iconFor('households')} size={14} /> Adults who lose, {m.label.toLowerCase()}
      </figcaption>
      <AxisTitles y="Share of adults who lose: each dot is one adult in a hundred" />
      <div className="ex-dots" role="img" aria-label={`${m.label}: ${solid + range} of 100 dots${range ? `, ${range} of them the range` : ''}`} data-measure={m.id}>
        {Array.from({ length: 100 }, (_, i) => (
          <span key={i} className={`ex-dot${i < solid ? ' is-lose' : i < solid + range ? ' is-range' : ''}`} style={{ transitionDelay: `${Math.min(i, 60) * 3}ms` }} />
        ))}
      </div>
      <p className="ex-dots-key">
        <span className="ex-dot is-lose" aria-hidden="true" data-icon="" /> One dot = 1% of adults
      </p>
      {range ? (
        <p className="ex-dots-key">
          <span className="ex-dot is-range" aria-hidden="true" data-icon="" /> Hatched: the range
        </p>
      ) : null}
      {solid + range === 0 ? (
        <p className="ex-dots-key">
          No full dot for this measure
        </p>
      ) : null}
    </figure>
  );
}

// The cohort results' files: the solves' state files on GitHub at the data
// file's results commit, and the script that computes the welfare change.
export function cohortSources() {
  return sourcesItems({
    closures: [],
    code: false,
    extra: [
      fileItem('OG-UK cohort state files: analysis/surprise/cohorts', OG_RESULT_URLS.cohortsDir, 'OG-UK', `commit ${RESULTS_SHA}`),
      fileItem('paper/cohort_welfare.py', OG_RESULT_URLS.cohortScript, 'PolicyEngine', `commit ${COHORTS_SHA}`),
    ],
  });
}

export default function WhoHeatmap({ cl, rule, arm, both, measure, onMeasure, ms }) {
  const [hot, setHot] = useState(null);
  const m = ms.find((x) => x.id === measure) ?? ms[0];
  const rows = grid(cl, rule, arm, m.id);
  const lim = limitOf(rows);
  const any = rows.some((r) => r.cells.some((x) => x != null));
  const cols = [...GROUPS, 'All groups'];
  return (
    <Card
      id="who-heatmap"
      sources={cohortSources()}
      icon={iconFor('lifetimeEarnings')}
      title="By age and earnings group"
      finding={both ? <span className="ex-ctx">Some foreign capital</span> : null}
      controls={
        <Pill
          className="is-card"
          title="Options for this chart"
          name="By age and earnings group"
          sections={[{ id: 'measure', label: 'Measure', glyph: 'ruler', kind: 'one', value: m.id, options: ms.map((x) => ({ value: x.id, label: x.label, desc: x.def })), onChange: onMeasure, seg: m.label, def: m.id === ms[0].id }]}
        />
      }
      unit={<Lead c="measure">Change in remaining-lifetime consumption and bequests, %</Lead>}
      legend={
        <ul className="ex-hm-key">
          {any ? (
          <li>
            <span className="ex-hm-ramp" aria-hidden="true" data-icon="" />
            <span data-axis="">{pct(-lim)}</span>
            <span className="ex-hm-ramp-mid">loss · gain</span>
            <span data-axis="">{pct(lim)}</span>
          </li>
          ) : null}
          <li>
            <span className="ex-hm-key-hole" aria-hidden="true" data-icon="" /> Not in the data for this measure
          </li>
        </ul>
      }
      download={{
        title: `Welfare change by age and earnings group, ${m.label}`,
        context: () => `UK central · ${ARM_NAME[arm] ?? arm} · ${ruleLabel(rule)} · ${cl === 'zk0' ? 'no foreign capital' : 'some foreign capital'}`,
        table: () => ({ columns: ['Age in 2028', ...cols.map((c) => `${c} (%)`)], rows: rows.map((r) => [r.age, ...r.cells]) }),
      }}
    >
      {any ? null : (
        <p className="ex-hm-none">
          No grid for this measure in the data
        </p>
      )}
      <div className="ex-hm-body">
      <div className="ex-hm-wrap">
        <AxisTitles y={`Age in ${D.shock_year}`} x="Lifetime-earnings group" reference="Colour: teal a gain, amber a loss; deeper is larger" />
        <table className="ex-hm" aria-label={`Welfare change by age and earnings group, ${m.label}`} data-measure={m.id}>
          <thead>
            <tr>
              <th scope="col" className="ex-hm-corner">
                Age
              </th>
              {cols.map((c, j) => (
                <th key={c} scope="col" className={j === 7 ? 'is-all' : ''}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.age}>
                <th scope="row">{r.age}</th>
                {r.cells.map((x, j) => {
                  const k = `${r.age}|${j}`;
                  if (x == null) return <td key={j} className={`ex-hm-cell is-hole${j === 7 ? ' is-all' : ''}`} />;
                  const t = Math.min(1, Math.abs(x) / lim);
                  const on = () => setHot({ k, age: r.age, col: cols[j], x });
                  return (
                    <td
                      key={j}
                      className={`ex-hm-cell ${x >= 0 ? 'is-gain' : 'is-loss'}${j === 7 ? ' is-all' : ''}${hot?.k === k ? ' is-hot' : ''}`}
                      style={{ '--t': `${Math.round(12 + t * 78)}%` }}
                      tabIndex={0}
                      aria-label={`Age ${r.age}, ${cols[j]}: ${pct(x)}`}
                      onMouseEnter={on}
                      onFocus={on}
                      onMouseLeave={() => setHot(null)}
                      onBlur={() => setHot(null)}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DotStrip m={m} />
      </div>
      <div className="ex-hm-foot">
        {hot ? (
          <p className="ex-hm-readout" role="status">
            {`Age ${hot.age}, ${hot.col}: ${pct(hot.x)}`}
          </p>
        ) : (
          <p className="ex-hm-readout is-muted">
            Hover or tab to a cell for its value
          </p>
        )}
      </div>
    </Card>
  );
}
