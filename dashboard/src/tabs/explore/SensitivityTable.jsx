'use client';

import Card from '@/components/ui/Card.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { S, ARMS, SCENARIOS, YEARS, HEADLINE_YEAR, CENTRAL, fmt, resultAt } from '@/tabs/ai/surprise.js';
import { side } from '@/tabs/ai/lines.js';
import { dirConcept, Lead } from '@/tabs/explore/direction.jsx';

// The zk0.5 sensitivity (surprise2028.json `sensitivity`, common fiscal
// rule): half of the excess demand for capital met from abroad. It has no
// header option and no other home, so its figures print here only.
export const SENS = 'zk0.5';
const VARS = [
  { v: 'Y', label: 'GDP' },
  { v: 'GNI', label: 'GNI' },
  { v: 'NNI', label: 'NNI' },
  { v: 'w', label: 'Wage rate' },
];
const at = (r, v) => (r?.status === 'done' ? r.gaps[v][YEARS.indexOf(HEADLINE_YEAR)] : null);
const cls = (x) => (x == null ? '' : x > 0.005 ? ' is-gain' : x < -0.005 ? ' is-loss' : '');

// What the sensitivity changes in every scenario's main arm, each claim
// computed from the signs (headline year, common fiscal rule): the capital
// stock and GDP against the central closure, the wage rate's side of the
// path, and GNI against GDP. The icon follows the same comparison.
export function sensClaims(res = S.sensitivity?.[SENS]?.results) {
  if (!res) return [];
  const rows = SCENARIOS.map((s) => ({ sens: res[s.id]?.tfp, central: resultAt(s.id, 'tfp', CENTRAL, 'common') })).filter((r) => r.sens?.status === 'done' && r.central.status === 'done');
  if (!rows.length) return [];
  const diff = (v) => rows.map((r) => at(r.sens, v) - at(r.central, v));
  const versus = (v, name) => {
    const d = diff(v);
    if (d.every((x) => x > 0.005)) return { icon: 'gapUp', text: `${name}: further above the path` };
    if (d.every((x) => x < -0.005)) return { icon: 'gapDown', text: `${name}: lower` };
    return { icon: 'compare', text: `${name}: no single direction` };
  };
  const w = rows.map((r) => at(r.sens, 'w'));
  const wSides = new Set(w.map(side));
  const wCentral = new Set(rows.map((r) => side(at(r.central, 'w'))));
  const instead = wCentral.size === 1 && wCentral.has('below') ? ', not below' : '';
  const wage = wSides.has('below')
    ? { icon: 'gapDown', text: 'The wage rate is below the path in at least one scenario' }
    : { icon: dirConcept(Math.min(...w)) === 'onPath' && !wSides.has('above') ? 'onPath' : 'gapUp', text: `The wage rate is ${wSides.has('on') ? 'on or above' : 'above'} the path${instead}` };
  const gniLess = rows.every((r) => at(r.sens, 'GNI') < at(r.sens, 'Y'));
  return [
    { key: 'k', ...versus('K', 'Capital stock') },
    { key: 'y', ...versus('Y', 'GDP') },
    { key: 'w', ...wage },
    gniLess ? { key: 'gni', icon: 'foreign', text: 'More income goes abroad, so GNI gains less than GDP' } : { key: 'gni', icon: 'gni', text: 'GNI does not gain less than GDP in every scenario' },
  ];
}

// The investment surge in the main arm (PR #41's third caveat, audit A7):
// the range over the scenarios of the investment gap in the shock year, at
// its peak before the headline year, and in the headline year, as items.
function investmentItems(res) {
  const year = (y) => YEARS.indexOf(y);
  const gaps = SCENARIOS.map((s) => res[s.id]?.tfp).filter((r) => r?.status === 'done').map((r) => r.gaps.I);
  if (!gaps.length) return [];
  const first = YEARS[YEARS.findIndex((y, i) => gaps.some((g) => Math.abs(g[i]) > 1e-9))];
  const range = (f) => {
    const xs = gaps.map(f);
    return `${Math.round(Math.min(...xs))}–${Math.round(Math.max(...xs))}%`;
  };
  const peak = (g) => Math.max(...g.slice(year(first), year(HEADLINE_YEAR)));
  return [
    { key: 'first', icon: 'investment', text: `Main-arm investment: ${range((g) => g[year(first)])} above the path in ${first}` },
    { key: 'peak', icon: 'timing', text: `${range(peak)} at its peak before ${HEADLINE_YEAR}` },
    { key: 'h', icon: 'path', text: `${range((g) => g[year(HEADLINE_YEAR)])} in ${HEADLINE_YEAR}, across the scenarios` },
    { key: 'cost', icon: 'excluded', text: 'OG-Core has no capital adjustment cost' },
    { key: 'speed', icon: 'foreign', text: 'Capital moves as fast as the closure lets foreign capital in' },
    { key: 'artefact', icon: 'limit', text: 'That path is an artefact of frictionless capital, not a forecast' },
    { key: 'bound', icon: 'range', text: `By ${HEADLINE_YEAR}: an upper bound on speed as well as size` },
  ];
}

export default function SensitivityTable() {
  const sens = S.sensitivity?.[SENS];
  if (!sens) return null;
  const res = sens.results;
  return (
    <Card
      id="closure-sensitivity"
      icon={iconFor('foreign')}
      title={`Sensitivity: half of new capital from abroad (ζK = ${sens.zeta_K})`}
      finding={<Lead c="compare">In every scenario’s main arm, against the central closure:</Lead>}
      controls={<Items className="ex-notes" items={sensClaims(res)} />}
      unit={<Lead c="measure">{`${HEADLINE_YEAR}, % difference from the OBR-central path at the same closure, common fiscal rule`}</Lead>}
      logo={false}
      aboutTitle="About this table"
      about={{
        shows: (
          <Items
            items={[
              { key: 'solved', icon: 'scenario', text: `Each scenario and arm solved with ζK = ${sens.zeta_K}` },
              { key: 'half', icon: 'foreign', text: 'Foreign investors supply half the excess demand for capital' },
              { key: 'only', icon: 'caveat', text: 'A sensitivity only: no other chart uses it' },
            ]}
          />
        ),
        how: (
          <Items
            items={[
              { key: 'same', icon: 'model', text: 'Same solves, checks and reference path as Explore’s two closures' },
              { key: 'zk', icon: 'closure', text: 'Only ζK changed' },
              { key: 'ref', icon: 'onPath', text: 'Reference: the no-shock path restarted in 2028 at this closure' },
            ]}
          />
        ),
        caveats: <Items items={[{ key: 'stress', icon: 'shock', text: `The stress test holds GDP on the path in ${HEADLINE_YEAR} by construction` }, ...investmentItems(res)]} />,
      }}
      method="closures"
      download={{
        title: `Sensitivity: half of new capital from abroad (ζK = ${sens.zeta_K})`,
        context: () => `${HEADLINE_YEAR} · % difference from the OBR-central path · common fiscal rule`,
        table: () => ({
          columns: ['Scenario', 'Arm', ...VARS.map((c) => `${c.label} (%)`)],
          rows: SCENARIOS.flatMap((s) => ARMS.map((a) => [s.label, a.label, ...VARS.map((c) => at(res[s.id]?.[a.id], c.v))])),
        }),
      }}
    >
      <div className="table-wrap">
        <table className="data-table">
          <caption className="visually-hidden">
            {HEADLINE_YEAR} gaps with ζK = {sens.zeta_K}, by scenario and arm
          </caption>
          <thead>
            <tr>
              <th scope="col">Arm</th>
              {VARS.map((c) => (
                <th key={c.v} scope="col" className="num">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          {SCENARIOS.map((s) => (
            <tbody key={s.id}>
              <tr className="table-group">
                <th colSpan={VARS.length + 1} scope="colgroup">
                  <Lead c="scenario">{s.label}</Lead>
                </th>
              </tr>
              {ARMS.map((a) => {
                const r = res[s.id]?.[a.id];
                return (
                  <tr key={a.id}>
                    <th scope="row">{a.short || a.label}</th>
                    {VARS.map((c) => {
                      const x = at(r, c.v);
                      return (
                        <td key={c.v} className={`num${cls(x)}`}>
                          {fmt(x, 2)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </Card>
  );
}
