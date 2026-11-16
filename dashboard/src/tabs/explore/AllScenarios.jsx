'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import ControlBar, { ControlGroup, Segmented } from '@/components/ui/ControlBar.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { RULES } from '@/lib/labels.js';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { cssColour, esc } from '@/lib/download.js';
import { HEADLINE_YEAR, LATE_YEAR, SCENARIOS, ARMS, ARM_COLOR, CLOSURE_LABEL, SCEN_NAME, fmt } from '@/tabs/ai/surprise.js';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { Lead } from './direction.jsx';
import { MEASURES, ROWS, rowOf, axisOf, cellsTable, cellValue, drivers } from './cells.js';
import SensitivityTable from './SensitivityTable.jsx';

// Explore > All scenarios: every scenario x closure x fiscal rule cell at
// once, for one arm, in the headline year. Four small multiples (GDP, GNI,
// the wage rate, debt/GDP), one row per fiscal rule and closure. In each row
// the UK range (UK low to UK high) is shaded, UK central is a dot and
// Korinek et al. a hollow diamond; a cell not solved is named at the row's
// end. Values are in the tooltips, the table fold and the downloads, not
// printed on the page: each figure has its home on Economy or Public
// finances, and this page is for comparing shapes.

const RULE_ICON = { common: 'gdp', fixed: 'finances', dn: 'benefits' };
const ruleName = (id) => RULES.find((r) => r.id === id).short;
const clName = (cl) => CLOSURE_LABEL[cl].replace(/^./, (c) => c.toUpperCase());
const tickText = (t, unit) => (t === 0 ? `0${unit}` : `${t > 0 ? '+' : '−'}${Math.abs(t)}${unit}`);

// UK central and Korinek et al. closer than this share of the axis would
// overprint: the dot is lifted and the diamond lowered, both kept on their
// values (the debt-neutral rows, where the two nearly coincide).
const NEAR = 0.03;
const nearPair = (vals, at) => vals.uk_central != null && vals.korinek != null && Math.abs(at(vals.uk_central) - at(vals.korinek)) < NEAR;

function Mark({ sid, x, m, row, arm, at, color, near }) {
  const name = SCEN_NAME[sid];
  const shape = `${sid === 'korinek' ? 'is-diamond' : sid === 'uk_central' ? 'is-dot' : 'is-end'}${near && sid !== 'uk_low' && sid !== 'uk_high' ? ' is-near' : ''}`;
  const label = `${name}, ${ruleName(row.rule).toLowerCase()}, ${CLOSURE_LABEL[row.cl]}, ${m.label}: ${fmt(x, 2, m.unit)}`;
  return (
    <TipTarget
      className={`as-mark ${shape}`}
      style={{ left: `${(at(x) * 100).toFixed(3)}%`, '--mark': color }}
      label={label}
      tip={
        <>
          <b>
            {m.label}, {HEADLINE_YEAR}
          </b>
          <span>{name}</span>
          <span>
            {RULES.find((r) => r.id === row.rule).label}, {CLOSURE_LABEL[row.cl]}
          </span>
          <span>{ARMS.find((a) => a.id === arm).label}</span>
          <span className="tip-value">{fmt(x, 2, m.unit)} against the OBR-central path</span>
        </>
      }
    />
  );
}

function Panel({ m, arm }) {
  const ax = axisOf(arm, m.v);
  const color = ARM_COLOR[arm];
  const pct = (x) => `${(ax.at(x) * 100).toFixed(3)}%`;
  return (
    <figure className="as-panel" aria-label={`${m.title}, ${HEADLINE_YEAR}, every scenario, closure and fiscal rule`}>
      <figcaption className="as-panel-title" data-panel-title="">
        <Icon name={m.icon} size={16} />
        <span>{m.title}</span>
      </figcaption>
      <p className="as-panel-unit">
        <Lead c="measure">{m.unit === '%' ? '% difference from the OBR-central path' : 'Percentage points of GDP, difference from the OBR-central path'}</Lead>
      </p>
      {RULES.map((r) => {
        const rows = ROWS.filter((row) => row.rule === r.id).map((row) => rowOf(arm, row, m.v));
        const pending = [...new Set(rows.flatMap((x) => x.pending))];
        return (
          <div key={r.id} className="as-group">
            <p className="as-group-title">
              <span>
                <Lead c={RULE_ICON[r.id]}>{r.label}</Lead>
              </span>
              {pending.length ? (
                <span className="as-pending">
                  <Icon name="hourglass" size={12} />
                  <span>{pending.length === SCENARIOS.length ? 'Not solved yet' : `${pending.join(' and ')}: not solved under this rule`}</span>
                </span>
              ) : null}
            </p>
            {rows.map((x) => (
              <div key={x.key} className="as-row">
                <span className="as-row-label">
                  <Lead c={x.cl === 'zk0' ? 'closedCapital' : 'foreign'}>{clName(x.cl)}</Lead>
                </span>
                <div className="as-track">
                  <span className="as-zero" style={{ left: pct(0) }} aria-hidden="true" />
                  {x.band ? <span className="as-band" style={{ left: pct(x.band[0]), width: `${((ax.at(x.band[1]) - ax.at(x.band[0])) * 100).toFixed(3)}%` }} aria-hidden="true" /> : null}
                  {SCENARIOS.filter((s) => x.vals[s.id] != null).map((s) => (
                    <Mark key={s.id} sid={s.id} x={x.vals[s.id]} m={m} row={x} arm={arm} at={ax.at} color={color} near={nearPair(x.vals, ax.at)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <div className="as-row as-axis" aria-hidden="true">
        <span />
        <div className="as-track as-track-axis">
          {ax.ticks.map((t) => (
            <span key={t} className="as-tick" style={{ left: pct(t) }} data-axis="">
              {tickText(t, m.unit)}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

// The same panels drawn as SVG from the data, for the PNG and SVG downloads.
export function panelsSvg(arm) {
  const C = CHART_COLOURS;
  const col = cssColour(ARM_COLOR[arm]);
  return MEASURES.map((m) => {
    const ax = axisOf(arm, m.v);
    const W = 720;
    const x0 = 170;
    const x1 = W - 20;
    const X = (v) => x0 + ax.at(v) * (x1 - x0);
    let y = 6;
    let out = '';
    for (const r of RULES) {
      const pend = [...new Set(ROWS.filter((rw) => rw.rule === r.id).flatMap((rw) => rowOf(arm, rw, m.v).pending))];
      out += `<text x="0" y="${y + 12}" font-size="12" font-weight="600" fill="${C.ink}">${esc(r.label)}</text>`;
      if (pend.length) out += `<text x="${x0}" y="${y + 12}" font-size="11" font-style="italic" fill="${C.muted}">${esc(`${pend.join(' and ')}: not solved under this rule`)}</text>`;
      y += 18;
      for (const row of ROWS.filter((rw) => rw.rule === r.id)) {
        const x = rowOf(arm, row, m.v);
        const cy = y + 11;
        out += `<text x="12" y="${cy + 4}" font-size="11" fill="${C.axisTitle}">${esc(clName(row.cl))}</text>`;
        if (x.band) out += `<rect x="${X(x.band[0])}" y="${cy - 6}" width="${Math.max(1, X(x.band[1]) - X(x.band[0]))}" height="12" fill="${C.grid}"/>`;
        const dy = nearPair(x.vals, ax.at) ? 5 : 0;
        for (const s of SCENARIOS) {
          const v = x.vals[s.id];
          if (v == null) continue;
          if (s.id === 'uk_central') out += `<circle cx="${X(v)}" cy="${cy - dy}" r="5.5" fill="${col}"/>`;
          else if (s.id === 'korinek') out += `<rect x="${X(v) - 4.5}" y="${cy + dy - 4.5}" width="9" height="9" transform="rotate(45 ${X(v)} ${cy + dy})" fill="${C.surface}" stroke="${col}" stroke-width="2"/>`;
          else out += `<rect x="${X(v) - 1.5}" y="${cy - 8}" width="3" height="16" rx="1" fill="${col}"/>`;
        }
        y += 24;
      }
      y += 4;
    }
    out = `<line x1="${X(0)}" x2="${X(0)}" y1="4" y2="${y}" stroke="${C.zeroLine}"/>` + out;
    out += `<line x1="${x0}" x2="${x1}" y1="${y + 2}" y2="${y + 2}" stroke="${C.axis}"/>`;
    for (const t of ax.ticks) out += `<text x="${X(t)}" y="${y + 16}" font-size="11" text-anchor="middle" fill="${C.tick}">${tickText(t, m.unit)}</text>`;
    return { w: W, h: y + 24, markup: out, label: `${m.title}, ${m.unit === '%' ? '% difference' : 'pp of GDP'}` };
  });
}

function Key({ arm }) {
  return (
    <p className="line-key as-key">
      <span className="line-key-item">
        <span className="as-key-band" aria-hidden="true" data-icon="">
          <span className="as-key-end" style={{ '--mark': ARM_COLOR[arm] }} />
          <span className="as-key-end" style={{ '--mark': ARM_COLOR[arm] }} />
        </span>
        UK range, UK low to UK high (shaded)
      </span>
      <span className="line-key-item">
        <span className="as-key-dot" style={{ '--mark': ARM_COLOR[arm] }} aria-hidden="true" /> UK central
      </span>
      <span className="line-key-item">
        <span className="as-key-diamond" style={{ '--mark': ARM_COLOR[arm] }} aria-hidden="true" /> Korinek et al.: US inputs, an upper case
      </span>
    </p>
  );
}

function CellsTable({ arm }) {
  return (
    <div className="table-wrap">
      <table className="data-table as-table">
        <caption className="visually-hidden">
          {HEADLINE_YEAR} gaps for every scenario, closure and fiscal rule, {ARMS.find((a) => a.id === arm).label}
        </caption>
        <thead>
          <tr>
            <th scope="col">Rule, closure</th>
            {SCENARIOS.map((s) => (
              <th key={s.id} scope="col" className="num">
                {s.label.replace(' et al. (upper)', '')}
              </th>
            ))}
          </tr>
        </thead>
        {MEASURES.map((m) => (
          <tbody key={m.v}>
            <tr className="table-group">
              <th colSpan={SCENARIOS.length + 1} scope="colgroup">
                <Lead c={m.concept}>{`${m.label} (${m.unit})`}</Lead>
              </th>
            </tr>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row">
                  {ruleName(row.rule)}, {CLOSURE_LABEL[row.cl]}
                </th>
                {SCENARIOS.map((s) => (
                  <td key={s.id} className="num">
                    {fmt(cellValue(s.id, arm, row.cl, row.rule, m.v), 2, m.unit)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export default function AllScenarios() {
  const [arm, setArm] = useState('tfp');
  const armLabel = ARMS.find((a) => a.id === arm).label;
  return (
    <div id="explore-part-all" className="explore-part">
      <Card
        id="all-scenarios"
        icon={iconFor('cells')}
        title={`GDP, GNI, the wage rate and debt/GDP in ${HEADLINE_YEAR}, every cell`}
        finding={<Lead c="reading">Rows: fiscal rule and closure. Marks: scenarios. Hover, tap or tab to a mark for its value.</Lead>}
        controls={
          <>
            {/* the main arm's drivers open the page; another arm's are here */}
            {arm === 'tfp' ? null : (
              <Items className="ex-notes" items={drivers(arm).map((d) => ({ key: d.choice, icon: d.choice === 'still' ? 'onPath' : d.choice, text: d.text }))} />
            )}
            <ControlBar label="All scenarios: options">
              <ControlGroup label="Arm">
                <Segmented options={ARMS} value={arm} onChange={setArm} label="Arm" />
              </ControlGroup>
            </ControlBar>
          </>
        }
        legend={<Key arm={arm} />}
        about={{
          shows: (
            <Items
              items={[
                { key: 'gap', icon: 'onPath', text: `Each scenario’s ${HEADLINE_YEAR} gap against the path, same closure` },
                { key: 'band', icon: 'range', text: 'Shaded band: UK low to UK high, where both are solved' },
                { key: 'korinek', icon: 'foreign', text: 'Korinek et al.: US inputs, an upper case, not a UK estimate' },
              ]}
            />
          ),
          how: (
            <Items
              items={[
                { key: 'same', icon: 'model', text: 'The same solves as every other chart in Explore' },
                { key: 'pending', icon: 'timing', text: 'Debt-neutral and fixed spending: UK central and Korinek et al. only' },
                { key: 'most', icon: 'compare', text: '“Moves most”: the widest spread across scenarios, closures or rules' },
                { key: 'rules', icon: 'rule', text: 'Rules compared over the scenarios solved under every rule' },
              ]}
            />
          ),
          caveats: (
            <Items
              items={[
                {
                  key: 'debt',
                  icon: 'debt',
                  text: (
                    <>
                      Debt/GDP here is {HEADLINE_YEAR}; {LATE_YEAR} and its overstated rise:{' '}
                      <NavLink tab="explore" sub="finances" anchor="public-finances">
                        Public finances
                      </NavLink>
                    </>
                  ),
                },
              ]}
            />
          ),
        }}
        method="rules"
        download={{
          title: `Every scenario, closure and fiscal rule, ${HEADLINE_YEAR}`,
          context: () => `${armLabel} · ${HEADLINE_YEAR} · gap against the OBR-central path at the same closure`,
          table: () => cellsTable(arm, armLabel),
          svg: () => panelsSvg(arm),
          legend: () => [
            { label: 'UK low and UK high (range ends)', color: cssColour(ARM_COLOR[arm]), shape: 'tick' },
            { label: 'UK central', color: cssColour(ARM_COLOR[arm]), shape: 'dot' },
            { label: 'Korinek et al. (US inputs)', color: cssColour(ARM_COLOR[arm]), shape: 'ring' },
          ],
        }}
        foot={
          <Disclosure inCard title="Every value as a table" preview={`${armLabel}, ${HEADLINE_YEAR}`}>
            <CellsTable arm={arm} />
          </Disclosure>
        }
      >
        <div className="as-grid">
          {MEASURES.map((m) => (
            <Panel key={m.v} m={m} arm={arm} />
          ))}
        </div>
      </Card>

      <SectionHeading id="all-sensitivity" icon={iconFor('foreign')} title="More foreign capital">
        <Lead c="foreign">A sensitivity only: half of new capital financed from abroad</Lead>
      </SectionHeading>
      <SensitivityTable />

    </div>
  );
}
