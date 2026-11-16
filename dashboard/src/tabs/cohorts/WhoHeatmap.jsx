'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Card from '@/components/ui/Card.jsx';
import { Items } from '@/components/story/Items.jsx';
import ControlBar, { ControlGroup, Segmented } from '@/components/ui/ControlBar.jsx';
import { iconFor } from '@/lib/concepts.js';
import { ruleLabel } from '@/lib/labels.js';
import D from '@/data/cohorts2028.json';
import { Lead } from '@/tabs/explore/direction.jsx';

// Who gains by age and lifetime-earnings group: a heatmap diverging around
// zero, for the arm, fiscal rule and closure in view. Rows: age in the shock
// year (every ten years, 20 to 90: single cohorts, never averaged); columns:
// the seven earnings groups and all groups.
//
// The measure toggle switches the cells between the four measures, but the
// data file only holds a birth year x earnings group grid for the first
// (as modelled, `cev` and `cev_all`). Where the transfers measures are solved
// to the horizon (`dnfull`), the file holds them by age for all groups
// together (`by_fill.*.by_age`: [transfers bear the cost, both]), so that
// column fills and the group columns stay holes. "Bequests not valued" has
// no grid at all: every cell is a hole. Nothing is interpolated.
//
// Cells print no figure: colour is the reading, one diverging scale per
// measure, its round limits printed in the key (axis text). Hover or focus
// a cell for its value. The cells cross-fade between measures; no value is
// tweened.

export const AGES = [90, 80, 70, 60, 50, 40, 30, 20];
const GROUPS = ['Bottom 25%', '25th–50th', '50th–70th', '70th–80th', '80th–90th', '90th–99th', 'Top 1%'];
const FILL = 'hold'; // the extension past the last solved year whose by-age values colour the column
const pct = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(2)}%`;

function dnfull(cl, rule, arm) {
  const x = D.dnfull;
  return x?.ready && x.closure === cl && x.rule === rule && x.arm === arm ? x : null;
}

// [{ age, cells: [7 groups..., all] }] for a measure; null = not in the data.
export function grid(cl, rule, arm, measure) {
  const C = D.closures[cl];
  const c = C.rules[rule][arm];
  const full = dnfull(cl, rule, arm);
  return AGES.map((age) => {
    const i = C.birth_year.indexOf(D.shock_year - age);
    if (measure === 'M') return { age, cells: [...c.cev[i], c.cev_all[i]] };
    const k = { T: 0, BT: 1 }[measure];
    const by = full && k != null ? full.by_fill?.[FILL]?.by_age?.[String(age)] : null;
    return { age, cells: [...GROUPS.map(() => null), by ? by[k] : null] };
  });
}

const LIMITS = [0.25, 0.5, 1, 1.5, 2, 3, 5];
export const limitOf = (rows) => {
  const m = Math.max(0, ...rows.flatMap((r) => r.cells).filter((x) => x != null).map(Math.abs));
  return LIMITS.find((l) => l >= m) ?? Math.ceil(m);
};

export default function WhoHeatmap({ cl, rule, arm, both, measure, onMeasure, ms }) {
  const [hot, setHot] = useState(null);
  const m = ms.find((x) => x.id === measure) ?? ms[0];
  const rows = grid(cl, rule, arm, m.id);
  const lim = limitOf(rows);
  const any = rows.some((r) => r.cells.some((x) => x != null));
  const groupsHeld = rows.some((r) => r.cells.slice(0, 7).some((x) => x != null));
  const cols = [...GROUPS, 'All groups'];
  return (
    <Card
      id="who-heatmap"
      icon={iconFor('lifetimeEarnings')}
      title="By age and earnings group"
      finding={
        <span className="ex-ctx">
          <Icon name={iconFor(m.concept)} size={14} /> {m.label}
          {both ? ', central closure' : ''}
        </span>
      }
      controls={
        <ControlBar label="Heatmap: options">
          <ControlGroup label="Measure">
            <Segmented options={ms.map((x) => ({ id: x.id, label: x.id, icon: iconFor(x.concept) }))} value={m.id} onChange={onMeasure} label="Measure" />
          </ControlGroup>
        </ControlBar>
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
      about={{
        shows: (
          <Items
            items={[
              { key: 'cev', icon: 'consumption', text: 'Change in remaining-lifetime consumption and bequests, %' },
              { key: 'rows', icon: 'age', text: `Rows: single cohorts, by age in ${D.shock_year}` },
              { key: 'grid', icon: 'data', text: 'Only “as modelled” has a value per earnings group in the data' },
              groupsHeld ? null : { key: 'all', icon: 'caveat', text: 'Transfers measures: all groups together, solved to the horizon only' },
            ].filter(Boolean)}
          />
        ),
      }}
      method="welfare"
      download={{
        title: `Welfare change by age and earnings group, ${m.label}`,
        context: () => `UK central · ${arm} · ${ruleLabel(rule)} · ${cl}`,
        table: () => ({ columns: ['Age in 2028', ...cols.map((c) => `${c} (%)`)], rows: rows.map((r) => [r.age, ...r.cells]) }),
      }}
    >
      {any ? null : (
        <p className="ex-hm-none">
          <Icon name={iconFor('timing')} size={14} /> No grid for this measure in the data
        </p>
      )}
      <div className="ex-hm-wrap">
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
      <div className="ex-hm-foot">
        {hot ? (
          <p className="ex-hm-readout" role="status">
            <Icon name={iconFor('reading')} size={12} /> {`Age ${hot.age}, ${hot.col}: ${pct(hot.x)}`}
          </p>
        ) : (
          <p className="ex-hm-readout is-muted">
            <Icon name={iconFor('reading')} size={12} /> Hover or tab to a cell for its value
          </p>
        )}
      </div>
    </Card>
  );
}
