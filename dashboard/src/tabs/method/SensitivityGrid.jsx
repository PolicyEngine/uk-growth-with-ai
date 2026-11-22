'use client';

import Card from '@/components/ui/Card.jsx';
import IconLine from '@/components/ui/IconLine.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { RULES } from '@/lib/labels.js';
import { S, ARMS, BOUND, CENTRAL, HEADLINE_YEAR, YEARS, ZETA, fmt, scenarioById } from '@/tabs/ai/surprise.js';
import { SLOPE_MEASURES } from '@/tabs/explore/ClosureSlope.jsx';
import { SENS, flipOf, held } from '@/tabs/explore/SensitivityTable.jsx';
import { sourcesItems } from '@/tabs/explore/sources.jsx';

// Sensitivities (Method redesign, 4.5; M10, M11): what changing one setting
// does to UK central's headline-year figures, everything else as in the
// main case. A table, not dumbbell rows: the main case would be the same
// filled dot in every row of a measure. Seven rows (the main case; no and
// half foreign capital; the two other budget rules; the two other
// versions) by the four headline measures, every value from the data.
//
// The figures are restated (their homes: Explore's four-measure card, the
// ζK 0.5 table and the fiscal-rule box), so each sits in [data-axis]: the
// page dump hides it and check_numbers counts it once, at its home. Each
// carries its data path. A cell's arrow says higher or lower than the main
// case (no value), and a dashed outline marks a sign that differs from it
// (SensitivityTable.jsx's flipOf). The stress test's GDP is held on the
// path by design: "held", no figure.
const SID = 'uk_central';
const Y = YEARS.indexOf(HEADLINE_YEAR);
const done = (r) => (r?.status === 'done' ? r : null);
const res = (path) => path.reduce((o, k) => o?.[k], S);

// [group, label, record path in the data file, arm]
const zk = S.sensitivity?.[SENS]?.zeta_K;
export const SENS_ROWS = [
  [null, 'Main case', ['results', SID, 'tfp', CENTRAL], 'tfp'],
  ['Foreign capital', `None (ζK = ${ZETA[BOUND]})`, ['results', SID, 'tfp', BOUND], 'tfp'],
  ['Foreign capital', `Half (ζK = ${zk})`, ['sensitivity', SENS, 'results', SID, 'tfp'], 'tfp'],
  ['Budget rule', RULES[1].label, ['rules', 'fixed_spending', 'results', SID, 'tfp', CENTRAL], 'tfp'],
  ['Budget rule', RULES[2].label, ['rules', 'debt_neutral', 'results', SID, 'tfp', CENTRAL], 'tfp'],
  ['Version', ARMS[1].label, ['results', SID, 'tz', CENTRAL], 'tz'],
  ['Version', ARMS[2].label, ['results', SID, 'ss', CENTRAL], 'ss'],
]
  .map(([group, label, path, arm]) => ({ group, label, path, arm, r: done(res(path)) }))
  .filter((x) => x.r);

const valueAt = (row, v) => {
  const x = row.r.gaps?.[v]?.[Y];
  return typeof x === 'number' ? x : null;
};
const pathOf = (row, v) => `${row.path.join('.')}.gaps.${v}.${HEADLINE_YEAR}`;

export const sensTable = () => ({
  columns: ['Setting', ...SLOPE_MEASURES.map((m) => `${m.label}, % gap ${HEADLINE_YEAR}`)],
  rows: SENS_ROWS.map((row) => [row.group ? `${row.group}: ${row.label}` : row.label, ...SLOPE_MEASURES.map((m) => (held(row.arm, m.v) ? 'held' : fmt(valueAt(row, m.v), 2)))]),
});

function Cell({ row, v, main }) {
  if (held(row.arm, v))
    return (
      <td className="mx-sens-cell is-held" title={`GDP held on the forecast path in ${HEADLINE_YEAR} by design`}>
        held
      </td>
    );
  const x = valueAt(row, v);
  if (x == null) return <td className="mx-sens-cell is-pending">not solved</td>;
  const c = row === main ? null : valueAt(main, v);
  const flip = flipOf(x, c);
  const d = c == null ? null : x - c;
  const dir = d == null ? null : Math.abs(d) < 0.005 ? 'onPath' : d > 0 ? 'gapUp' : 'gapDown';
  const word = { onPath: 'the same as', gapUp: 'higher than', gapDown: 'lower than' }[dir];
  return (
    <td className={`mx-sens-cell${flip ? ' is-flip' : ''}`} data-flip={flip ? '' : undefined}>
      <span data-axis="">
        <span className="mx-sens-v" data-path={pathOf(row, v)}>
          {fmt(x, 2)}
        </span>
      </span>
      {dir ? (
        <span className="mx-sens-dir" title={`${word[0].toUpperCase()}${word.slice(1)} the main case${flip ? '; the sign differs' : ''}`}>
          <Icon name={iconFor(dir)} size={14} />
          <span className="visually-hidden">{`, ${word} the main case${flip ? ', sign differs' : ''}`}</span>
        </span>
      ) : null}
    </td>
  );
}

export default function SensitivityGrid() {
  const main = SENS_ROWS.find((r) => r.label === 'Main case' && !r.group);
  if (!main) return null;
  const groups = [...new Set(SENS_ROWS.filter((r) => r.group).map((r) => r.group))];
  return (
    <Card
      id="sens-grid"
      icon={iconFor('compare')}
      title="One setting changed at a time"
      unit={`% gap against the OBR’s central forecast path, ${HEADLINE_YEAR}`}
      sources={sourcesItems({ sid: SID, closures: ['zk0.1', 'zk0', SENS] })}
      download={{ title: 'One setting changed at a time', context: `${scenarioById(SID).label}, % gap against the OBR’s central forecast path, ${HEADLINE_YEAR}`, table: sensTable }}
      foot={
        <div className="mx-sens-links">
          <IconLine concept="link">
            <NavLink tab="explore" sub="economy">
              Foreign capital, as a chart: Explore, Economy
            </NavLink>
          </IconLine>
          <IconLine concept="link">
            <NavLink tab="explore" sub="finances" anchor="fiscal-rule">
              Budget rules, year by year: Explore, Public finances
            </NavLink>
          </IconLine>
          <IconLine concept="link">
            <NavLink tab="explore" sub="finances">
              Debt repriced at the OBR’s speed: Explore, Public finances
            </NavLink>
          </IconLine>
        </div>
      }
    >
      <div className="mx-sens-wrap" data-no-axes="A table of gaps">
        <table className="mx-sens">
          <caption className="visually-hidden">{`${scenarioById(SID).label}, ${HEADLINE_YEAR}: % gap against the forecast path with one setting changed at a time`}</caption>
          <thead>
            <tr>
              <th scope="col" className="mx-sens-corner">
                Setting
              </th>
              {SLOPE_MEASURES.map((m) => (
                <th key={m.v} scope="col">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="is-main">
              <th scope="row">{main.label}</th>
              {SLOPE_MEASURES.map((m) => (
                <Cell key={m.v} row={main} v={m.v} main={main} />
              ))}
            </tr>
          </tbody>
          {groups.map((g) => (
            <tbody key={g}>
              <tr className="mx-sens-group">
                <th colSpan={SLOPE_MEASURES.length + 1} scope="rowgroup">
                  {g}
                </th>
              </tr>
              {SENS_ROWS.filter((r) => r.group === g).map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {SLOPE_MEASURES.map((m) => (
                    <Cell key={m.v} row={row} v={m.v} main={main} />
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </Card>
  );
}
