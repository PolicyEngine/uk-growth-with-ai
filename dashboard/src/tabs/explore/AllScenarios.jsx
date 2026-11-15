'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import Card, { SectionHeading, InfoCard } from '@/components/ui/Card.jsx';
import ControlBar, { ControlGroup, Segmented } from '@/components/ui/ControlBar.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { RULES } from '@/lib/labels.js';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { cssColour, esc } from '@/lib/download.js';
import { HEADLINE_YEAR, LATE_YEAR, SCENARIOS, ARMS, ARM_COLOR, CLOSURE_LABEL, SCEN_NAME, fmt } from '@/tabs/ai/surprise.js';
import { pr } from '@/tabs/ai/links.js';
import { MEASURES, ROWS, rowOf, axisOf, cellsTable, cellValue, driverWords } from './cells.js';
import SensitivityTable from './SensitivityTable.jsx';

// Explore > All scenarios: every scenario x closure x fiscal rule cell at
// once, for one arm, in the headline year. Four small multiples (GDP, GNI,
// the wage rate, debt/GDP), one row per fiscal rule and closure. In each row
// the UK range (UK low to UK high) is shaded, UK central is a dot and
// Korinek et al. a hollow diamond; a cell not solved is named at the row's
// end. Values are in the tooltips, the table fold and the downloads, not
// printed on the page: each figure has its home on Economy or Public
// finances, and this page is for comparing shapes.

const ruleName = (id) => RULES.find((r) => r.id === id).short;
const clName = (cl) => CLOSURE_LABEL[cl].replace(/^./, (c) => c.toUpperCase());
const tickText = (t, unit) => (t === 0 ? `0${unit}` : `${t > 0 ? '+' : '−'}${Math.abs(t)}${unit}`);

function Mark({ sid, x, m, row, arm, at, color }) {
  const name = SCEN_NAME[sid];
  const shape = sid === 'korinek' ? 'is-diamond' : sid === 'uk_central' ? 'is-dot' : 'is-end';
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
      <p className="as-panel-unit">{m.unit === '%' ? '% difference from the OBR-central path' : 'Percentage points of GDP, difference from the OBR-central path'}</p>
      {RULES.map((r) => {
        const rows = ROWS.filter((row) => row.rule === r.id).map((row) => rowOf(arm, row, m.v));
        const pending = [...new Set(rows.flatMap((x) => x.pending))];
        return (
          <div key={r.id} className="as-group">
            <p className="as-group-title">
              <span>{r.label}</span>
              {pending.length ? (
                <span className="as-pending">
                  <Icon name="hourglass" size={12} />
                  <span>{pending.length === SCENARIOS.length ? 'Not solved yet' : `${pending.join(' and ')}: not solved under this rule`}</span>
                </span>
              ) : null}
            </p>
            {rows.map((x) => (
              <div key={x.key} className="as-row">
                <span className="as-row-label">{clName(x.cl)}</span>
                <div className="as-track">
                  <span className="as-zero" style={{ left: pct(0) }} aria-hidden="true" />
                  {x.band ? <span className="as-band" style={{ left: pct(x.band[0]), width: `${((ax.at(x.band[1]) - ax.at(x.band[0])) * 100).toFixed(3)}%` }} aria-hidden="true" /> : null}
                  {SCENARIOS.filter((s) => x.vals[s.id] != null).map((s) => (
                    <Mark key={s.id} sid={s.id} x={x.vals[s.id]} m={m} row={x} arm={arm} at={ax.at} color={color} />
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
        for (const s of SCENARIOS) {
          const v = x.vals[s.id];
          if (v == null) continue;
          if (s.id === 'uk_central') out += `<circle cx="${X(v)}" cy="${cy}" r="5.5" fill="${col}"/>`;
          else if (s.id === 'korinek') out += `<rect x="${X(v) - 4.5}" y="${cy - 4.5}" width="9" height="9" transform="rotate(45 ${X(v)} ${cy})" fill="${C.surface}" stroke="${col}" stroke-width="2"/>`;
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
        <span className="as-key-band" aria-hidden="true">
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
                {m.label} ({m.unit})
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
        icon="layoutGrid"
        title={`GDP, GNI, the wage rate and debt/GDP in ${HEADLINE_YEAR}, every cell`}
        finding={`Rows are the fiscal rule and closure; each mark is a scenario. Hover, tap or tab to a mark for its value.${arm === 'tfp' ? '' : ` ${driverWords(arm)}`}`}
        controls={
          <ControlBar label="All scenarios: options">
            <ControlGroup label="Arm">
              <Segmented options={ARMS} value={arm} onChange={setArm} label="Arm" />
            </ControlGroup>
          </ControlBar>
        }
        legend={<Key arm={arm} />}
        about={{
          shows: `Each scenario's ${HEADLINE_YEAR} gap against the OBR-central path at the same closure, for the arm chosen. The shaded band runs from UK low to UK high where both are solved; Korinek et al. use US inputs and are an upper case, not a UK estimate.`,
          how: 'Read from the same solves as every other chart in Explore. Debt-neutral transfers and fixed spending are solved for UK central and Korinek et al. only, so UK low and UK high are marked pending under those rules. “Moves most” compares the spread of each measure across the scenarios, across the two closures and across the three rules (the last over the scenarios solved under every rule).',
          caveats: (
            <>
              Debt/GDP is shown for {HEADLINE_YEAR}; the {LATE_YEAR} figures and why the model overstates the later rise are on{' '}
              <NavLink tab="explore" sub="finances" anchor="public-finances">
                Public finances
              </NavLink>
              . These are gaps against the path, not forecasts of levels.
            </>
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

      <SectionHeading id="all-sensitivity" icon="sliders" title="More foreign capital">
        One more closure, solved as a sensitivity only: half of the new capital financed from abroad.
      </SectionHeading>
      <SensitivityTable />

      <SectionHeading id="all-checks" icon="flask" title="Checks in progress">
        Checks on these results that are not yet part of the page.
      </SectionHeading>
      <div className="cards-grid">
        <InfoCard icon="percent" title="Debt repriced at the OBR's speed (open pull request)" id="debt-repricing">
          <p>
            The model reprices all government debt at the new interest rate at once. An open pull request, {''}
            <a href={pr(43)} target="_blank" rel="noreferrer">
              PR #43
            </a>
            , redoes the debt path with the rate reaching the debt stock at the speed of the OBR&rsquo;s debt interest ready reckoner.
          </p>
          <p className="mx-sub">
            Its figures will appear here once the pull request commits them as a data file; for now its finding is stated in words on{' '}
            <NavLink tab="explore" sub="finances" anchor="public-finances">
              Public finances
            </NavLink>
            .
          </p>
        </InfoCard>
      </div>
    </div>
  );
}
