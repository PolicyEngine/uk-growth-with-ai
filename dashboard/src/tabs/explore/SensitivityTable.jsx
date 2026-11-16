'use client';

import Card from '@/components/ui/Card.jsx';
import { S, ARMS, SCENARIOS, YEARS, HEADLINE_YEAR, fmt } from '@/tabs/ai/surprise.js';

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

// The investment surge in the main arm (PR #41's third caveat, audit A7):
// the range over the scenarios of the investment gap in the shock year, at
// its peak before the headline year, and in the headline year.
function investmentWords(res) {
  const year = (y) => YEARS.indexOf(y);
  const gaps = SCENARIOS.map((s) => res[s.id]?.tfp).filter((r) => r?.status === 'done').map((r) => r.gaps.I);
  if (!gaps.length) return '';
  const first = YEARS[YEARS.findIndex((y, i) => gaps.some((g) => Math.abs(g[i]) > 1e-9))];
  const range = (f) => {
    const xs = gaps.map(f);
    return `${Math.round(Math.min(...xs))}–${Math.round(Math.max(...xs))}%`;
  };
  const peak = (g) => Math.max(...g.slice(year(first), year(HEADLINE_YEAR)));
  return ` Main-arm investment is ${range((g) => g[year(first)])} above the path in ${first}, ${range(peak)} at its peak before ${HEADLINE_YEAR} and ${range((g) => g[year(HEADLINE_YEAR)])} in ${HEADLINE_YEAR}, across the scenarios. OG-Core has no capital adjustment cost, so the capital stock moves as fast as the closure lets foreign capital in: that path is an artefact of frictionless capital, not a forecast, and the capital response by ${HEADLINE_YEAR} is an upper bound on speed as well as size.`;
}

export default function SensitivityTable() {
  const sens = S.sensitivity?.[SENS];
  if (!sens) return null;
  const res = sens.results;
  return (
    <Card
      id="closure-sensitivity"
      icon="sliders"
      title={`Sensitivity: half of new capital from abroad (ζK = ${sens.zeta_K})`}
      finding={`With half of new capital from abroad, the capital stock grows faster: in every scenario’s main arm GDP is further above the path than at the central closure, and the wage rate is on or above it instead of below. More of the extra income goes abroad, so GNI gains less than GDP.`}
      unit={`${HEADLINE_YEAR}, % difference from the OBR-central path at the same closure, common fiscal rule`}
      logo={false}
      aboutTitle="About this table"
      about={{
        shows: `Each scenario and arm solved with ζK = ${sens.zeta_K}: foreign investors supply half of the excess demand for capital at the world rate. It is a sensitivity only; no other chart uses it.`,
        how: 'The same solves, checks and reference path as the two closures in Explore, with only ζK changed. The reference is the no-shock path restarted in 2028 at this closure.',
        caveats: `The stress test holds GDP at the path in the headline year by construction.${investmentWords(res)}`,
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
                  {s.label}
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
