'use client';

import { useState } from 'react';
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
import { Lead } from './direction.jsx';
import { side } from '@/tabs/ai/lines.js';
import { MEASURES, ROWS, cellsTable, cellValue, drivers } from './cells.js';
import SensitivityTable from './SensitivityTable.jsx';
import { sourcesItems } from './sources.jsx';
import { ext } from '@/tabs/shared/ui.jsx';
import { URLS } from '@/tabs/ai/links.js';

// "Across scenarios": every scenario x closure x fiscal rule cell at once,
// for one arm, in the headline year, as a matrix explorer. Rows: fiscal rule
// and closure; columns: the four scenarios. Each cell prints the chosen
// measure's gap; a rule solved for only some scenarios names them on its
// group row, and its other cells stay empty. Clicking a cell sets the pickers
// (scenario, closure, fiscal rule) to it. Every
// solved cell prints its value; the cell in view carries a small "In view"
// marker, and where its figure's home is the story's headline tiles (the
// main arm's GDP, GNI and pay rate) the value is a muted reference, and
// the key links to that home (check_numbers' reference-row rule). Debt/GDP
// has its own matrix on Public finances (AcrossDebt, #fin-across).
//
// It renders on Economy (#ex-across, inside #explore-part-all) and, until
// the All scenarios sub-tab is removed, on that sub-tab: the same component.

export const ECON = MEASURES.filter((m) => m.v !== 'debt_gdp_pp');
const DEBT = MEASURES.filter((m) => m.v === 'debt_gdp_pp');
const clName = (cl) => CLOSURE_LABEL[cl].replace(/^./, (c) => c.toUpperCase());
const shortName = (s) => s.label.replace(' et al. (upper)', '');
export const closureOf = (cl) => (cl === BOUND ? 'closed' : 'central');

// Is this cell one the charts below print for the pickers in view: the
// scenario, rule and closure(s) picked (Both: both foreign-capital cases)?
export function inView(st, sid, cl, rule) {
  if (sid !== st.s || rule !== st.rule) return false;
  return st.closure === 'both' || closureOf(cl) === st.closure;
}
// The story's headline tiles print the main arm's GDP, GNI and pay rate for
// the scenario and closure(s) picked, under the common rule: with another
// rule picked, those cells keep the story as their home.
export function inStory(st, sid, cl, rule, arm) {
  return arm === 'tfp' && rule === 'common' && sid === st.s && (st.closure === 'both' || closureOf(cl) === st.closure);
}

function Cell({ s, row, arm, m, current, story, printHome }) {
  const { set } = useNav();
  const x = cellValue(s.id, arm, row.cl, row.rule, m.v);
  const where = `${SCEN_NAME[s.id]}, ${RULES.find((r) => r.id === row.rule).label.toLowerCase()}, ${CLOSURE_LABEL[row.cl]}`;
  if (x == null)
    return (
      <td className="ex-mx-cell is-hole" data-cell={`${s.id}|${row.key}`}>
        <span className="visually-hidden">{`${where}: not solved`}</span>
      </td>
    );
  const tone = toneOf(m.v, x);
  // where the figure's home is the story's headline, a muted reference value
  const home = story && printHome;
  return (
    <td className={`ex-mx-cell${current ? ' is-current' : ''}${tone ? ` is-${tone}` : ''}`} data-cell={`${s.id}|${row.key}`}>
      <button
        type="button"
        className="ex-mx-btn"
        aria-pressed={current}
        aria-label={`${where}, ${m.label}: ${fmt(x, 2, m.unit)}${current ? ', in view' : ''}${home ? ', the story’s headline' : ''}. Show this cell`}
        onClick={() => set({ s: s.id, closure: closureOf(row.cl), rule: row.rule })}
      >
        <span key={m.v} className={`ex-mx-val${home ? ' is-ref' : ''}`} data-dir={side(x)} data-path={`${row.rule === 'common' ? 'results' : `rules.${row.rule}.results`}.${s.id}.${arm}.${row.cl}.gaps.${m.v}[${HEADLINE_YEAR}]`}>
          {fmt(x, 2, m.unit)}
        </span>
        {current ? (
          <span className="ex-mx-here" aria-hidden="true">
            In view
          </span>
        ) : null}
      </button>
    </td>
  );
}

// A fiscal rule solved for only some scenarios: which, in one muted phrase
// on its group row, so its empty cells need no marks of their own.
function solvedNote(arm, rule, v) {
  const rows = ROWS.filter((row) => row.rule === rule);
  const solved = SCENARIOS.filter((s) => rows.some((row) => cellValue(s.id, arm, row.cl, row.rule, v) != null));
  if (solved.length === SCENARIOS.length) return null;
  const names = solved.map((s) => SCEN_NAME[s.id]);
  return <span className="ex-mx-solved">{names.length ? ` · solved for ${names.join(' and ')} only` : ' · not solved'}</span>;
}

export function Matrix({ arm, m, printHome = true, label }) {
  const { st } = useNav();
  return (
    <div className="ex-mx-wrap">
      <table className="ex-mx" aria-label={label}>
        <thead>
          <tr>
            <th scope="col" className="ex-mx-corner">
              Budget and foreign capital
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
                {r.label}
                {solvedNote(arm, r.id, m.v)}
              </th>
            </tr>
            {ROWS.filter((row) => row.rule === r.id).map((row) => (
              <tr key={row.key}>
                <th scope="row" className="ex-mx-rowhead">
                  <span className="ex-mx-long">{clName(row.cl)}</span>
                  <span className="ex-mx-short" aria-hidden="true">
                    {row.cl === BOUND ? 'None' : 'Some'}
                  </span>
                </th>
                {SCENARIOS.map((s) => (
                  <Cell key={s.id} s={s} row={row} arm={arm} m={m} current={inView(st, s.id, row.cl, row.rule)} story={inStory(st, s.id, row.cl, row.rule, arm)} printHome={printHome} />
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

function MatrixKey({ story = true }) {
  return (
    <ul className="ex-mx-key">
      <li>
        <span className="ex-mx-key-cell" aria-hidden="true" data-icon="" /> Click a cell to show it in the charts above
      </li>
      <li>
        <span className="ex-mx-key-cell is-current" aria-hidden="true" data-icon="" /> In view
        {story ? (
          <>
            {'; grey: the '}
            <NavLink tab="story" anchor="story-part-2">
              story’s headline
            </NavLink>
          </>
        ) : null}
      </li>
    </ul>
  );
}

export default function AllScenarios() {
  // the arm is the one store's (&arm=, lib/nav.jsx), shared with the settings bar
  const { st, set } = useNav();
  const arm = st.armId;
  const setArm = (armId) => set({ armId });
  const [v, setV] = useState('Y');
  const m = ECON.find((x) => x.v === v);
  const armLabel = ARMS.find((a) => a.id === arm).label;
  return (
    <div id="explore-part-all" className="explore-part ex-across">
      <SectionHeading id="ex-across" icon={iconFor('cells')} title="Across scenarios">
        <Lead c="compare">{`Every scenario, foreign-capital case and budget assumption in ${HEADLINE_YEAR}; pick a cell to show it`}</Lead>
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
            <ControlGroup label="Version">
              <Segmented options={ARMS} value={arm} onChange={setArm} label="Version" />
            </ControlGroup>
          </ControlBar>
        }
        unit={<span data-axis-title="y">{`${m.label} gap against the OBR baseline for the same foreign-capital case, %`}</span>}
        legend={<MatrixKey />}
        about={{
          caveats: (
            <Items
              items={[
                { key: 'korinek', icon: 'foreign', text: <>{ext(URLS.korinekT3, 'Korinek et al.')}: US inputs, an upper case, not a UK estimate</> },
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
        sources={sourcesItems({ method: 'rules' })}
        download={{
          title: `Every scenario, foreign-capital case and budget assumption, ${HEADLINE_YEAR}`,
          context: () => `${armLabel} · ${HEADLINE_YEAR} · gap against the OBR baseline for the same foreign-capital case`,
          table: () => cellsTable(arm, armLabel),
          svg: () => matrixSvg(arm, m),
        }}
      >
        <Matrix arm={arm} m={m} label={`${m.title}, ${HEADLINE_YEAR}, ${armLabel}: every scenario, foreign-capital case and budget assumption`} />
      </Card>

      <SectionHeading id="ex-sensitivity" icon={iconFor('foreign')} title="More foreign capital">
        <Lead c="foreign">A sensitivity only: foreigners supply half of excess capital demand</Lead>
      </SectionHeading>
      <SensitivityTable />
    </div>
  );
}

// Public finances (#fin-across): debt/GDP in every cell. Debt/GDP in the
// headline year is printed nowhere else (the debt chart's end labels are
// LATE_YEAR), so every solved cell prints its value, the one in view too.
export function AcrossDebt() {
  const { st, set } = useNav();
  const arm = st.armId;
  const setArm = (armId) => set({ armId });
  const m = DEBT[0];
  const armLabel = ARMS.find((a) => a.id === arm).label;
  return (
    <div className="explore-part ex-across" id="fin-across-part">
      <SectionHeading id="fin-across" icon={iconFor('cells')} title="Debt/GDP across scenarios">
        <Lead c="compare">{`Every scenario, foreign-capital case and budget assumption in ${HEADLINE_YEAR}`}</Lead>
      </SectionHeading>
      <Card
        id="debt-cells"
        icon={iconFor('debt')}
        title={`Debt/GDP in ${HEADLINE_YEAR}, every cell`}
        finding={<Lead c="timing">{`${HEADLINE_YEAR}; the debt chart above runs to ${LATE_YEAR}`}</Lead>}
        controls={
          <ControlBar label="Debt/GDP across scenarios: options">
            <ControlGroup label="Version">
              <Segmented options={ARMS} value={arm} onChange={setArm} label="Version" />
            </ControlGroup>
          </ControlBar>
        }
        unit={<span data-axis-title="y">Debt/GDP gap against the OBR baseline for the same foreign-capital case, percentage points of GDP</span>}
        legend={<MatrixKey story={false} />}
        sources={sourcesItems({ method: 'rules' })}
        download={{
          title: `Debt/GDP, every scenario, foreign-capital case and budget assumption, ${HEADLINE_YEAR}`,
          context: () => `${armLabel} · ${HEADLINE_YEAR} · pp of GDP against the OBR baseline for the same foreign-capital case`,
          table: () => {
            const t = cellsTable(arm, armLabel);
            return { ...t, rows: t.rows.filter((r) => r[0] === m.label) };
          },
          svg: () => matrixSvg(arm, m),
        }}
      >
        <Matrix arm={arm} m={m} printHome={false} label={`Debt/GDP, ${HEADLINE_YEAR}, ${armLabel}: every scenario, foreign-capital case and budget assumption`} />
      </Card>
    </div>
  );
}
