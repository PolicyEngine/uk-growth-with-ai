'use client';

import Card from '@/components/ui/Card.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { S, ARMS, ARM_COLOR, SCENARIOS, YEARS, HEADLINE_YEAR, CENTRAL, fmt, resultAt } from '@/tabs/ai/surprise.js';
import Icon from '@/components/ab/Icon.jsx';
import { side } from '@/tabs/ai/lines.js';
import { dirConcept, Lead } from '@/tabs/explore/direction.jsx';
import { ext } from '@/tabs/shared/ui.jsx';
import { URLS } from '@/tabs/ai/links.js';
import { sourcesItems } from './sources.jsx';
import { docItem } from '@/lib/sourceItems.js';
import { investmentFlags, I_FLAG_PCT } from './caveats.js';
import { OG_RESULT_URLS } from '@/tabs/ai/links.js';

// The foreign-owned share of the extra capital in 2031, the data file's
// foreign_share_dK_2031, as a rounded range across the solves.
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
  { v: 'w', label: 'Pay rate' },
];
const at = (r, v) => (r?.status === 'done' ? r.gaps[v][YEARS.indexOf(HEADLINE_YEAR)] : null);
const cls = (x) => (x == null ? '' : x > 0.005 ? ' is-gain' : x < -0.005 ? ' is-loss' : '');

// What the sensitivity changes in every scenario's main arm, each claim
// computed from the signs (headline year, common fiscal rule): the capital
// stock and GDP against some foreign capital, the pay rate's side of the
// path, and GNI against GDP. The icon follows the same comparison.
export function sensClaims(res = S.sensitivity?.[SENS]?.results) {
  if (!res) return [];
  const rows = SCENARIOS.map((s) => ({ sens: res[s.id]?.tfp, central: resultAt(s.id, 'tfp', CENTRAL, 'common') })).filter((r) => r.sens?.status === 'done' && r.central.status === 'done');
  if (!rows.length) return [];
  const diff = (v) => rows.map((r) => at(r.sens, v) - at(r.central, v));
  const versus = (v, name) => {
    const d = diff(v);
    if (d.every((x) => x > 0.005)) return { icon: 'gapUp', text: `${name}: further above the OBR baseline` };
    if (d.every((x) => x < -0.005)) return { icon: 'gapDown', text: `${name}: lower` };
    return { icon: 'compare', text: `${name}: no single direction` };
  };
  const w = rows.map((r) => at(r.sens, 'w'));
  const wSides = new Set(w.map(side));
  const wCentral = new Set(rows.map((r) => side(at(r.central, 'w'))));
  const instead = wCentral.size === 1 && wCentral.has('below') ? ', not below' : '';
  const wage = wSides.has('below')
    ? { icon: 'gapDown', text: 'The pay rate is below the OBR baseline in at least one scenario' }
    : { icon: dirConcept(Math.min(...w)) === 'onPath' && !wSides.has('above') ? 'onPath' : 'gapUp', text: `The pay rate is ${wSides.has('on') ? 'on or above' : 'above'} the OBR baseline${instead}` };
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
    { key: 'first', icon: 'investment', text: `Main-version investment: ${range((g) => g[year(first)])} above the OBR baseline in ${first}` },
    { key: 'peak', icon: 'timing', text: `${range(peak)} at its peak before ${HEADLINE_YEAR}` },
    { key: 'h', icon: 'path', text: `${range((g) => g[year(HEADLINE_YEAR)])} in ${HEADLINE_YEAR}, across the scenarios` },
    { key: 'cost', icon: 'excluded', text: <>{ext(URLS.ogCoreDocs, 'OG-Core')} has no capital adjustment cost</> },
    { key: 'artefact', icon: 'limit', text: 'Frictionless capital: an artefact, not a forecast; likely overstates speed and size' },
  ];
}

// Rows whose shock-year investment gap is above the project's flag
// (explore/caveats.js): marked * beside the arm, worded once under the
// claims (#sens-flag). Korinek et al.'s main arm is the largest.
const SENS_FLAGS = () => investmentFlags().filter((f) => f.cl === SENS);
export function sensFlagItem() {
  const fl = SENS_FLAGS();
  if (!fl.length) return null;
  return {
    key: 'flag',
    icon: 'caveat',
    text: (
      <>
        * Investment above the {ext(OG_RESULT_URLS.sanity, `+${I_FLAG_PCT}% flag`)} in {S.surprise_year}: up to +{Math.round(fl[0].x)}%, {ext(OG_RESULT_URLS.plausibility, 'implausible')}
      </>
    ),
  };
}

// The grid: a compact heatmap, rows scenario x arm (grouped by scenario),
// columns the four measures, each cell the zeta_K 0.5 gap printed once on a
// diverging tint (teal above the path, amber below; strength against the
// column's largest absolute value). Beside each value an unvalued arrow says
// whether the gap is higher or lower than with some foreign capital (zeta_K
// 0.1, whose figures have their home on the four-measure card), and a dashed
// outline marks a sign flip between the two closures.
// Phone labels for the arm column (the full names are in the arm picker).
const ARM_SHORT = { tfp: 'Auto. + prod.', tz: 'Tech. unchanged', ss: 'Stress test' };
// The stress test's GDP: held on the path by construction.
export const held = (arm, v) => arm === 'ss' && v === 'Y';
const centralAt = (sid, arm, v) => at(resultAt(sid, arm, CENTRAL, 'common'), v);
export function flipOf(x, c) {
  return x != null && c != null && side(x) !== 'on' && side(c) !== 'on' && side(x) !== side(c);
}
function colMax(res, v) {
  const xs = SCENARIOS.flatMap((s) => ARMS.map((a) => at(res[s.id]?.[a.id], v))).filter((x) => x != null);
  return Math.max(1e-9, ...xs.map(Math.abs));
}

function SensGrid({ res }) {
  const flagged = new Set(SENS_FLAGS().map((f) => `${f.sid}|${f.arm}`));
  const max = Object.fromEntries(VARS.map((c) => [c.v, colMax(res, c.v)]));
  return (
    <div className="ex-sd ex-sg-wrap" role="group" aria-label={`${HEADLINE_YEAR} gaps with ζK = 0.5, by scenario, version and measure`}>
      <table className="ex-sg">
        <thead>
          <tr>
            <th scope="col" className="ex-sg-corner">
              Scenario and version
            </th>
            {VARS.map((c) => (
              <th key={c.v} scope="col">
                {c.v === 'w' ? (
                  <>
                    <span className="ex-mx-long">{c.label}</span>
                    <span className="ex-mx-short">Pay</span>
                  </>
                ) : (
                  c.label
                )}
                <span className="ex-sg-unit">% gap</span>
              </th>
            ))}
          </tr>
        </thead>
        {SCENARIOS.map((s) => {
          const fl = SENS_FLAGS().find((f) => f.sid === s.id && f.arm === 'tfp');
          return (
            <tbody key={s.id}>
              <tr className="ex-sg-group">
                <th colSpan={VARS.length + 1} scope="rowgroup">
                  {s.label}
                  {fl && s.id === 'korinek' ? (
                    <a className="ex-sg-implaus" href="#sens-flag">
                      Implausible: investment +{Math.round(fl.x)}% in {S.surprise_year}
                    </a>
                  ) : null}
                </th>
              </tr>
              {ARMS.map((a) => {
                const r = res[s.id]?.[a.id];
                return (
                  <tr key={a.id}>
                    <th scope="row" className="ex-sg-arm">
                      <span className="swatch" style={{ borderTopColor: ARM_COLOR[a.id] }} aria-hidden="true" />
                      <span className="ex-mx-long">{a.short || a.label}</span>
                      <span className="ex-mx-short">{ARM_SHORT[a.id] ?? a.short}</span>
                      {flagged.has(`${s.id}|${a.id}`) ? (
                        <sup className="ex-sd-flag" title={`Investment more than +${I_FLAG_PCT}% above the OBR baseline in ${S.surprise_year}: implausible`}>
                          *
                        </sup>
                      ) : null}
                    </th>
                    {VARS.map((c) => {
                      const x = at(r, c.v);
                      if (x == null)
                        return (
                          <td key={c.v} className="ex-sg-cell is-pending">
                            not solved
                          </td>
                        );
                      // the stress test holds GDP on the path by design (the
                      // solver stops within 0.01pp): no tint, no comparison
                      if (held(a.id, c.v))
                        return (
                          <td key={c.v} className="ex-sg-cell is-held" title={`GDP held on the OBR baseline in ${HEADLINE_YEAR} by design, within the solver’s 0.01pp`}>
                            <span className="ex-sd-val" data-path={`sensitivity.${SENS}.results.${s.id}.${a.id}.gaps.${c.v}[${HEADLINE_YEAR}]`}>
                              {fmt(x, 2)}
                            </span>
                            <span className="ex-sg-held"> (held)</span>
                          </td>
                        );
                      const ce = centralAt(s.id, a.id, c.v);
                      const flip = flipOf(x, ce);
                      const d = ce == null ? null : x - ce;
                      const t = Math.round((Math.abs(x) / max[c.v]) * 38 + (Math.abs(x) < 0.005 ? 0 : 6));
                      const tone = Math.abs(x) < 0.005 ? '' : x > 0 ? ' is-gain' : ' is-loss';
                      const dirWord = d == null || Math.abs(d) < 0.005 ? null : d > 0 ? 'higher' : 'lower';
                      return (
                        <td key={c.v} className={`ex-sg-cell${tone}${flip ? ' is-flip' : ''}`} style={{ '--t': `${t}%` }} data-flip={flip ? '' : undefined}>
                          <span className={`ex-sd-val${cls(x)}`} data-path={`sensitivity.${SENS}.results.${s.id}.${a.id}.gaps.${c.v}[${HEADLINE_YEAR}]`}>
                            {fmt(x, 2)}
                          </span>
                          {dirWord ? (
                            <span className="ex-sg-dir" title={`${dirWord === 'higher' ? 'Higher' : 'Lower'} than with some foreign capital (ζK 0.1)${flip ? '; the sign flips' : ''}`}>
                              <Icon name={iconFor(dirWord === 'higher' ? 'gapUp' : 'gapDown')} size={12} />
                              <span className="visually-hidden">{`, ${dirWord} than with some foreign capital${flip ? ', sign flips' : ''}`}</span>
                            </span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

// The grid's key: what the arrow and the outline mean, and how many cells
// flip sign (counted from the data).
export function gridKey(res) {
  const cells = SCENARIOS.flatMap((s) => ARMS.flatMap((a) => VARS.filter((c) => !held(a.id, c.v)).map((c) => ({ x: at(res[s.id]?.[a.id], c.v), c: centralAt(s.id, a.id, c.v) }))));
  const flips = cells.filter((k) => flipOf(k.x, k.c));
  const up = flips.length && flips.every((k) => k.x > 0);
  return [
    { key: 'arrow', icon: 'compare', text: 'Arrow: higher or lower than with some foreign capital (ζK 0.1)' },
    { key: 'held', icon: 'shock', text: 'Held: the stress test holds GDP on the OBR baseline by design' },
    flips.length ? { key: 'flip', icon: 'closure', text: `Dashed outline: the sign flips against ζK 0.1 (${flips.length} cells)` } : null,
    up ? { key: 'why', icon: 'capital', text: 'Each flip turns a fall into a rise: more capital per worker' } : null,
  ].filter(Boolean);
}

export default function SensitivityTable() {
  const sens = S.sensitivity?.[SENS];
  if (!sens) return null;
  const res = sens.results;
  return (
    <Card
      id="closure-sensitivity"
      icon={iconFor('foreign')}
      title={`If foreigners supply half of excess capital demand (ζK = ${sens.zeta_K}): ${HEADLINE_YEAR} gaps against the OBR baseline`}
      finding={
        <span className="ex-ctx ex-sg-ctx">
          <span>
            <Lead c="foreign">
              <>{ext(URLS.ogCoreParams, 'ζK')}: the share of excess capital demand foreigners supply</>
            </Lead>
          </span>
          {foreignShare(res) ? (
            <span>
              <Lead c="capital">{`${foreignShare(res).replace(/^./, (c) => c.toUpperCase())} of new capital foreign-owned`}</Lead>
            </span>
          ) : null}
        </span>
      }
      controls={
        <>
          <p className="ex-sg-lead">
            <Lead c="compare">In every scenario’s main version, compared with some foreign capital (ζK 0.1):</Lead>
          </p>
          <Items className="ex-notes" items={sensClaims(res)} />
          {sensFlagItem() ? (
            <p id="sens-flag" className="ex-sg-flagnote">
              <span>{sensFlagItem().text}</span>
            </p>
          ) : null}
        </>
      }
      unit={<span data-axis-title="y">{`Gap against the OBR baseline for the same foreign-capital case, ${HEADLINE_YEAR}, %; common fiscal rule`}</span>}
      read={gridKey(res)}
      logo={false}
      about={{ caveats: <Items items={investmentItems(res)} /> }}
      sources={sourcesItems({ closures: ['zk0.1', 'zk0.5'], extra: [docItem('OG-UK default parameters', URLS.ogUkDefaults, 'OG-UK')], method: 'closures' })}
      download={{
        title: `Sensitivity: foreigners supply half of excess capital demand (ζK = ${sens.zeta_K})`,
        context: () => `${HEADLINE_YEAR} · % difference from the OBR baseline · common fiscal rule`,
        table: () => ({
          columns: ['Scenario', 'Version', ...VARS.map((c) => `${c.label} (%)`)],
          rows: SCENARIOS.flatMap((s) => ARMS.map((a) => [s.label, a.label, ...VARS.map((c) => at(res[s.id]?.[a.id], c.v))])),
        }),
      }}
    >
      <SensGrid res={res} />
    </Card>
  );
}
