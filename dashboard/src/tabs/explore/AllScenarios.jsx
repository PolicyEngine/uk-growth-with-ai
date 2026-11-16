'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import ControlBar, { ControlGroup, Segmented } from '@/components/ui/ControlBar.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import { RULES } from '@/lib/labels.js';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { esc } from '@/lib/download.js';
import { HEADLINE_YEAR, LATE_YEAR, SCENARIOS, ARMS, CLOSURE_LABEL, SCEN_NAME, BOUND, fmt } from '@/tabs/ai/surprise.js';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { toneOf } from './answers.js';
import { Dir, Lead } from './direction.jsx';
import { MEASURES, ROWS, rowOf, cellsTable, cellValue, drivers } from './cells.js';
import SensitivityTable from './SensitivityTable.jsx';

// "Across scenarios": every scenario x closure x fiscal rule cell at once,
// for one arm, in the headline year, as a matrix explorer. Rows: fiscal rule
// and closure; columns: the four scenarios. Each cell prints the chosen
// measure's gap and carries a small glyph of the cell's measures (direction
// and relative size only). Clicking a cell sets the header pickers
// (scenario, closure, fiscal rule) to it; a cell not solved is a hole. The
// cell in view prints no value: its figures have their home in the charts
// below (the story's headline tiles for the main arm's GDP, GNI and wage
// rate, the four-measure card for the rest). Debt/GDP has its own matrix on
// Public finances (AcrossDebt, #fin-across).
//
// It renders on Economy (#ex-across, inside #explore-part-all) and, until
// the All scenarios sub-tab is removed, on that sub-tab: the same component.

const RULE_ICON = { common: 'gdp', fixed: 'finances', dn: 'benefits' };
export const ECON = MEASURES.filter((m) => m.v !== 'debt_gdp_pp');
const DEBT = MEASURES.filter((m) => m.v === 'debt_gdp_pp');
const clName = (cl) => CLOSURE_LABEL[cl].replace(/^./, (c) => c.toUpperCase());
const shortName = (s) => s.label.replace(' et al. (upper)', '');
export const closureOf = (cl) => (cl === BOUND ? 'closed' : 'central');

// Is this cell one the charts below print for the pickers in view: the
// scenario, rule and closure(s) picked (Both: both closures)?
export function inView(st, sid, cl, rule) {
  if (sid !== st.s || rule !== st.rule) return false;
  return st.closure === 'both' || closureOf(cl) === st.closure;
}
// The story's headline tiles print the main arm's GDP, GNI and wage rate for
// the scenario and closure(s) picked, under the common rule: with another
// rule picked, those cells keep the story as their home.
export function inStory(st, sid, cl, rule, arm) {
  return arm === 'tfp' && rule === 'common' && sid === st.s && (st.closure === 'both' || closureOf(cl) === st.closure);
}

// Each measure's largest absolute value over the matrix, for the glyph bars.
function glyphScale(arm, ms) {
  return Object.fromEntries(
    ms.map((m) => [
      m.v,
      Math.max(
        1e-9,
        ...ROWS.flatMap((row) => Object.values(rowOf(arm, row, m.v).vals))
          .filter((x) => x != null)
          .map(Math.abs),
      ),
    ]),
  );
}

function Glyph({ sid, arm, row, ms, scale, pick }) {
  return (
    <span className="ex-mx-glyph" aria-hidden="true">
      {ms.map((m) => {
        const x = cellValue(sid, arm, row.cl, row.rule, m.v);
        const h = x == null ? 0 : Math.max(1.5, (Math.abs(x) / scale[m.v]) * 10);
        const tone = toneOf(m.v, x ?? 0);
        return <span key={m.v} className={`ex-mx-bar${m.v === pick ? ' is-pick' : ''}${tone ? ` is-${tone}` : ''}`} style={{ height: `${h.toFixed(1)}px`, [x >= 0 ? 'bottom' : 'top']: '50%' }} />;
      })}
    </span>
  );
}

function Cell({ s, row, arm, m, ms, scale, current, story, printHome }) {
  const { set } = useNav();
  const x = cellValue(s.id, arm, row.cl, row.rule, m.v);
  const where = `${SCEN_NAME[s.id]}, ${RULES.find((r) => r.id === row.rule).label.toLowerCase()}, ${CLOSURE_LABEL[row.cl]}`;
  if (x == null)
    return (
      <td className="ex-mx-cell is-hole" data-cell={`${s.id}|${row.key}`}>
        <span className="ex-mx-hole" title={`${where}: not solved`}>
          <Icon name={iconFor('timing')} size={12} />
          <span className="visually-hidden">{`${where}: not solved`}</span>
        </span>
      </td>
    );
  const tone = toneOf(m.v, x);
  // the cell in view prints no figure where the charts below print it
  const home = (current || story) && printHome;
  return (
    <td className={`ex-mx-cell${current ? ' is-current' : ''}${tone ? ` is-${tone}` : ''}`} data-cell={`${s.id}|${row.key}`}>
      <button
        type="button"
        className="ex-mx-btn"
        aria-pressed={current}
        aria-label={`${where}, ${m.label}${home ? (current ? ': in view, values in the charts below' : ': value in the story’s headline') : `: ${fmt(x, 2, m.unit)}`}. Show this cell`}
        onClick={() => set({ s: s.id, closure: closureOf(row.cl), rule: row.rule })}
      >
        {home ? (
          <span className="ex-mx-val is-home">
            <Icon name={iconFor('link')} size={11} strokeWidth={2} /> {current ? 'In view' : 'In story'}
          </span>
        ) : (
          <span key={m.v} className="ex-mx-val">
            <Dir x={x} />
            {fmt(x, 2, m.unit)}
          </span>
        )}
        {ms.length > 1 ? <Glyph sid={s.id} arm={arm} row={row} ms={ms} scale={scale} pick={m.v} /> : null}
      </button>
    </td>
  );
}

export function Matrix({ arm, ms, m, printHome = true, label }) {
  const { st } = useNav();
  const scale = glyphScale(arm, ms);
  return (
    <div className="ex-mx-wrap">
      <table className="ex-mx" aria-label={label}>
        <thead>
          <tr>
            <th scope="col" className="ex-mx-corner">
              <span className="visually-hidden">Fiscal rule and closure</span>
            </th>
            {SCENARIOS.map((s) => (
              <th key={s.id} scope="col" className={s.id === st.s ? 'is-current' : ''}>
                {shortName(s)}
              </th>
            ))}
          </tr>
        </thead>
        {RULES.map((r) => (
          <tbody key={r.id}>
            <tr className="ex-mx-group">
              <th colSpan={SCENARIOS.length + 1} scope="colgroup">
                <Icon name={iconFor(RULE_ICON[r.id])} size={13} /> {r.label}
              </th>
            </tr>
            {ROWS.filter((row) => row.rule === r.id).map((row) => (
              <tr key={row.key}>
                <th scope="row" className="ex-mx-rowhead">
                  <Icon name={iconFor(row.cl === BOUND ? 'closed' : 'foreign')} size={12} /> <span className="ex-mx-long">{clName(row.cl)}</span>
                  <span className="ex-mx-short" aria-hidden="true">
                    {row.cl === BOUND ? 'Closed' : 'Central'}
                  </span>
                </th>
                {SCENARIOS.map((s) => (
                  <Cell key={s.id} s={s} row={row} arm={arm} m={m} ms={ms} scale={scale} current={inView(st, s.id, row.cl, row.rule)} story={inStory(st, s.id, row.cl, row.rule, arm)} printHome={printHome} />
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

// The matrix as SVG for the PNG and SVG downloads: every value printed (the
// file stands alone), holes as dashed boxes.
export function matrixSvg(arm, m) {
  const C = CHART_COLOURS;
  const W = 640;
  const x0 = 170;
  const cw = (W - x0) / SCENARIOS.length;
  let y = 20;
  let out = SCENARIOS.map((s, i) => `<text x="${x0 + cw * i + cw / 2}" y="12" font-size="11" font-weight="600" text-anchor="middle" fill="${C.ink}">${esc(shortName(s))}</text>`).join('');
  for (const r of RULES) {
    out += `<text x="0" y="${y + 14}" font-size="12" font-weight="600" fill="${C.ink}">${esc(r.label)}</text>`;
    y += 20;
    for (const row of ROWS.filter((rw) => rw.rule === r.id)) {
      out += `<text x="12" y="${y + 16}" font-size="11" fill="${C.axisTitle}">${esc(clName(row.cl))}</text>`;
      SCENARIOS.forEach((s, i) => {
        const x = cellValue(s.id, arm, row.cl, row.rule, m.v);
        const cx = x0 + cw * i;
        out +=
          x == null
            ? `<rect x="${cx + 4}" y="${y + 2}" width="${cw - 8}" height="20" fill="none" stroke="${C.grid}" stroke-dasharray="3 3"/>`
            : `<rect x="${cx + 4}" y="${y + 2}" width="${cw - 8}" height="20" rx="3" fill="${C.surface}" stroke="${C.grid}"/><text x="${cx + cw / 2}" y="${y + 16}" font-size="11" text-anchor="middle" fill="${C.ink}">${esc(fmt(x, 2, m.unit))}</text>`;
      });
      y += 24;
    }
    y += 4;
  }
  return [{ w: W, h: y + 4, markup: out, label: `${m.title}, ${HEADLINE_YEAR}` }];
}

function MatrixKey({ ms, story = true }) {
  return (
    <ul className="ex-mx-key">
      <li>
        <span className="ex-mx-key-cell" aria-hidden="true" data-icon="" /> Solved: click to show it below
      </li>
      <li>
        <span className="ex-mx-key-cell is-current" aria-hidden="true" data-icon="" /> {story ? 'The cell in view; “In story”: value in the story' : 'The cell in view'}
      </li>
      <li>
        <span className="ex-mx-key-cell is-hole" aria-hidden="true" data-icon="" /> Not solved
      </li>
      {ms.length > 1 ? (
        <li>
          <span className="ex-mx-key-glyph" aria-hidden="true" data-icon="" /> {`Bars: ${ms.map((x) => x.label).join(', ')}, by size`}
        </li>
      ) : null}
    </ul>
  );
}

export default function AllScenarios() {
  const [arm, setArm] = useState('tfp');
  const [v, setV] = useState('Y');
  const m = ECON.find((x) => x.v === v);
  const armLabel = ARMS.find((a) => a.id === arm).label;
  return (
    <div id="explore-part-all" className="explore-part ex-across">
      <SectionHeading id="ex-across" icon={iconFor('cells')} title="Across scenarios">
        <Lead c="compare">{`Every scenario, closure and fiscal rule in ${HEADLINE_YEAR}; pick a cell to show it`}</Lead>
      </SectionHeading>
      <Card
        id="all-scenarios"
        icon={iconFor('cells')}
        title={`${m.title} in ${HEADLINE_YEAR}, every cell`}
        finding={<Items className="ex-notes" items={drivers(arm).map((d) => ({ key: d.choice, icon: d.choice === 'still' ? 'onPath' : d.choice, text: d.text }))} />}
        controls={
          <ControlBar label="Across scenarios: options">
            <ControlGroup label="Measure">
              <Segmented options={ECON.map((x) => ({ id: x.v, label: x.label, icon: x.icon }))} value={v} onChange={setV} label="Measure" />
            </ControlGroup>
            <ControlGroup label="Arm">
              <Segmented options={ARMS} value={arm} onChange={setArm} label="Arm" />
            </ControlGroup>
          </ControlBar>
        }
        unit={<Lead c="measure">% difference from the OBR-central path at the same closure</Lead>}
        legend={<MatrixKey ms={ECON} />}
        about={{
          shows: (
            <Items
              items={[
                { key: 'gap', icon: 'onPath', text: `Each cell: one solve’s ${HEADLINE_YEAR} gap against the path, same closure` },
                { key: 'view', icon: 'link', text: 'The cell in view: its values are in the charts below' },
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
                      Debt/GDP by cell:{' '}
                      <NavLink tab="explore" sub="finances" anchor="fin-across">
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
          svg: () => matrixSvg(arm, m),
        }}
      >
        <Matrix arm={arm} ms={ECON} m={m} label={`${m.title}, ${HEADLINE_YEAR}, ${armLabel}: every scenario, closure and fiscal rule`} />
      </Card>

      <SectionHeading id="ex-sensitivity" icon={iconFor('foreign')} title="More foreign capital">
        <Lead c="foreign">A sensitivity only: half of new capital financed from abroad</Lead>
      </SectionHeading>
      <SensitivityTable />
    </div>
  );
}

// Public finances (#fin-across): debt/GDP in every cell. Debt/GDP in the
// headline year is printed nowhere else (the debt chart's end labels are
// LATE_YEAR), so every solved cell prints its value, the one in view too.
export function AcrossDebt() {
  const [arm, setArm] = useState('tfp');
  const m = DEBT[0];
  const armLabel = ARMS.find((a) => a.id === arm).label;
  return (
    <div className="explore-part ex-across" id="fin-across-part">
      <SectionHeading id="fin-across" icon={iconFor('cells')} title="Debt/GDP across scenarios">
        <Lead c="compare">{`Every scenario, closure and fiscal rule in ${HEADLINE_YEAR}`}</Lead>
      </SectionHeading>
      <Card
        id="debt-cells"
        icon={iconFor('debt')}
        title={`Debt/GDP in ${HEADLINE_YEAR}, every cell`}
        finding={<Lead c="timing">{`${HEADLINE_YEAR}; the debt chart above runs to ${LATE_YEAR}`}</Lead>}
        controls={
          <ControlBar label="Debt/GDP across scenarios: options">
            <ControlGroup label="Arm">
              <Segmented options={ARMS} value={arm} onChange={setArm} label="Arm" />
            </ControlGroup>
          </ControlBar>
        }
        unit={<Lead c="measure">Percentage points of GDP, difference from the OBR-central path at the same closure</Lead>}
        legend={<MatrixKey ms={DEBT} story={false} />}
        about={{
          shows: (
            <Items
              items={[
                { key: 'common', icon: 'gdp', text: 'Common rule: spending follows GDP; debt absorbs the rest' },
                { key: 'fixed', icon: 'finances', text: 'Fixed spending: spending held, so debt moves more' },
                { key: 'dn', icon: 'benefits', text: 'Debt-neutral: transfers adjust to hold debt on the path' },
              ]}
            />
          ),
        }}
        method="rules"
        download={{
          title: `Debt/GDP, every scenario, closure and fiscal rule, ${HEADLINE_YEAR}`,
          context: () => `${armLabel} · ${HEADLINE_YEAR} · pp of GDP against the OBR-central path at the same closure`,
          table: () => {
            const t = cellsTable(arm, armLabel);
            return { ...t, rows: t.rows.filter((r) => r[0] === m.label) };
          },
          svg: () => matrixSvg(arm, m),
        }}
      >
        <Matrix arm={arm} ms={DEBT} m={m} printHome={false} label={`Debt/GDP, ${HEADLINE_YEAR}, ${armLabel}: every scenario, closure and fiscal rule`} />
      </Card>
    </div>
  );
}
