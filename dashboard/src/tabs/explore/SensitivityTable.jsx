'use client';

import Card from '@/components/ui/Card.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { S, ARMS, ARM_COLOR, SCENARIOS, YEARS, HEADLINE_YEAR, CENTRAL, fmt, resultAt } from '@/tabs/ai/surprise.js';
import { side } from '@/tabs/ai/lines.js';
import { dirConcept, Lead } from '@/tabs/explore/direction.jsx';
import { ext } from '@/tabs/shared/ui.jsx';
import { URLS } from '@/tabs/ai/links.js';
import { ResultSources, methodLink } from './sources.jsx';
import { AxisTitles } from './axes.jsx';

// The foreign-owned share of the extra capital in 2031, the data file's
// foreign_share_dK_2031, as a rounded range across the solves.
const LATE_DK = 2031;
function foreignShare(res) {
  const xs = Object.values(res).flatMap((r) => Object.values(r)).map((c) => c?.foreign_share_dK_2031).filter((x) => x != null);
  if (!xs.length) return null;
  const lo = Math.round(Math.min(...xs));
  const hi = Math.round(Math.max(...xs));
  return hi - lo <= 1 ? `about ${lo}%` : `${lo}–${hi}%`;
}

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
    { key: 'cost', icon: 'excluded', text: <>{ext(URLS.ogCoreDocs, 'OG-Core')} has no capital adjustment cost</> },
    { key: 'speed', icon: 'foreign', text: 'Capital moves as fast as the closure lets foreign capital in' },
    { key: 'artefact', icon: 'limit', text: 'That path is an artefact of frictionless capital, not a forecast' },
    { key: 'bound', icon: 'range', text: `By ${HEADLINE_YEAR}: it likely overstates speed as well as size` },
  ];
}

// Dot rows: one row per scenario and arm, one column per measure on its own
// axis from zero (shared down the column), the value beside its dot. Each
// figure prints once, here; the table is the download.
const tick = (t) => (Math.abs(t) < 1e-9 ? '0' : `${t > 0 ? '+' : '−'}${Math.abs(t)}`);
function colAxis(res, v) {
  const xs = SCENARIOS.flatMap((s) => ARMS.map((a) => at(res[s.id]?.[a.id], v))).filter((x) => x != null);
  const lo = Math.min(0, ...xs);
  const hi = Math.max(0, ...xs);
  const span = Math.max(hi - lo, 0.2);
  const step = [0.25, 0.5, 1, 2, 2.5, 5, 10].find((st) => span / st <= 3) ?? 20;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let t = min; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  return { ticks, at: (x) => ((x - min) / (max - min || 1)) * 100 };
}

function SensDots({ res }) {
  const axes = Object.fromEntries(VARS.map((c) => [c.v, colAxis(res, c.v)]));
  return (
    <div className="ex-sd" role="group" aria-label={`${HEADLINE_YEAR} gaps with more foreign capital, by scenario, arm and measure`}>
      <AxisTitles y="Rows: scenario and arm" x={`Columns: each measure’s ${HEADLINE_YEAR} gap against the path, %, its own axis from zero`} />
      <div className="ex-sd-row ex-sd-head">
        <span />
        {VARS.map((c) => (
          <span key={c.v} className="ex-sd-colhead">
            {c.label}
          </span>
        ))}
      </div>
      {SCENARIOS.map((s) => (
        <div key={s.id} className="ex-sd-group">
          <p className="ex-sd-scen">
            <Lead c="scenario">{s.label}</Lead>
          </p>
          {ARMS.map((a) => {
            const r = res[s.id]?.[a.id];
            return (
              <div key={a.id} className="ex-sd-row">
                <span className="ex-sd-arm">
                  <span className="swatch" style={{ borderTopColor: ARM_COLOR[a.id] }} aria-hidden="true" />
                  {a.short || a.label}
                </span>
                {VARS.map((c) => {
                  const x = at(r, c.v);
                  const ax = axes[c.v];
                  if (x == null)
                    return (
                      <span key={c.v} className="ex-sd-cell is-pending">
                        pending
                      </span>
                    );
                  const left = ax.at(x);
                  return (
                    <span key={c.v} className="ex-sd-cell">
                      <span className="ex-sd-track">
                        <span className="ex-sd-zero" style={{ left: `${ax.at(0).toFixed(2)}%` }} aria-hidden="true" />
                        <span className="ex-sd-dot" style={{ left: `${left.toFixed(2)}%`, background: ARM_COLOR[a.id] }} aria-hidden="true" />
                      </span>
                      <span className={`ex-sd-val${cls(x)}`} data-path={`sensitivity.${SENS}.results.${s.id}.${a.id}.gaps.${c.v}[${HEADLINE_YEAR}]`}>
                        {fmt(x, 2)}
                      </span>
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
      <div className="ex-sd-row ex-sd-axis" aria-hidden="true">
        <span />
        {VARS.map((c) => (
          <span key={c.v} className="ex-sd-cell is-axis">
            <span className="ex-sd-track">
            {axes[c.v].ticks.filter((t, i, all) => i === 0 || i === all.length - 1).map((t, i) => (
              <span key={t} className={`ex-sd-tick${i ? ' is-end' : ''}`} style={{ left: `${axes[c.v].at(t).toFixed(2)}%` }} data-axis="">
                {tick(t)}
              </span>
            ))}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SensitivityTable() {
  const sens = S.sensitivity?.[SENS];
  if (!sens) return null;
  const res = sens.results;
  return (
    <Card
      id="closure-sensitivity"
      icon={iconFor('foreign')}
      title={`Sensitivity: foreigners supply half of excess capital demand (ζK = ${sens.zeta_K})`}
      finding={<Lead c="compare">In every scenario’s main arm, against the central closure:</Lead>}
      controls={<Items className="ex-notes" items={sensClaims(res)} />}
      unit={<Lead c="measure">{`${HEADLINE_YEAR}, % difference from the OBR-central path at the same closure, common fiscal rule`}</Lead>}
      logo={false}
      aboutTitle="About this chart"
      about={{
        shows: (
          <Items
            items={[
              { key: 'solved', icon: 'scenario', text: `Each scenario and arm solved with ζK = ${sens.zeta_K}` },
              { key: 'half', icon: 'foreign', text: <>Foreign investors supply half the {ext(URLS.ogCoreParams, 'excess demand for capital')} (OG-Core&rsquo;s ζK)</> },
              foreignShare(res) ? { key: 'share', icon: 'foreign', text: `So foreigners own ${foreignShare(res)} of the extra capital in ${LATE_DK}` } : null,
              { key: 'only', icon: 'caveat', text: 'A sensitivity only: no other chart uses it' },
              { key: 'dl', icon: 'table', text: 'The full table: the download menu, CSV or JSON' },
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
        sources: <ResultSources closures={['zk0.1', 'zk0.5']} extra={[{ key: 'oguk', icon: 'model', text: <>ζK = {sens.zeta_K}: a sensitivity; OG-UK&rsquo;s default is 0.1 ({ext(URLS.ogUkDefaults, 'default parameters')}); see {methodLink('closures')}</> }]} />,
      }}
      method="closures"
      download={{
        title: `Sensitivity: foreigners supply half of excess capital demand (ζK = ${sens.zeta_K})`,
        context: () => `${HEADLINE_YEAR} · % difference from the OBR-central path · common fiscal rule`,
        table: () => ({
          columns: ['Scenario', 'Arm', ...VARS.map((c) => `${c.label} (%)`)],
          rows: SCENARIOS.flatMap((s) => ARMS.map((a) => [s.label, a.label, ...VARS.map((c) => at(res[s.id]?.[a.id], c.v))])),
        }),
      }}
    >
      <SensDots res={res} />
    </Card>
  );
}
