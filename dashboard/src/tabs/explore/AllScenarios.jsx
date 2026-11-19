'use client';

import { useState } from 'react';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import Pill from '@/components/ui/Pill.jsx';
import { versionSection } from '@/components/ui/SettingsBar.jsx';
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
// each measure's one line in the pill (item-11-pill-fable.md section 5)
const MEASURE_DESC = { Y: 'Total output produced in the UK', GNI: 'Income UK residents keep', w: 'The wage per unit of labour' };
const DEBT = MEASURES.filter((m) => m.v === 'debt_gdp_pp');
const clName = (cl) => CLOSURE_LABEL[cl].replace(/^./, (c) => c.toUpperCase());
const shortName = (s) => s.short ?? s.label;
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
        <span className="ex-mx-dash" role="img" aria-label={`${where}: not solved`} title={`${where}: not solved`}>
          –
        </span>
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

// The rules solved for only some scenarios, and which: said once, in the
// key beside the not-solved dash, so the empty cells carry only the dash.
export function solvedNote(arm, v) {
  const parts = RULES.map((r) => {
    const rows = ROWS.filter((row) => row.rule === r.id);
    const solved = SCENARIOS.filter((s) => rows.some((row) => cellValue(s.id, arm, row.cl, row.rule, v) != null));
    return solved.length === SCENARIOS.length ? null : { rule: r.label, names: solved.map((s) => SCEN_NAME[s.id]).join(' and ') };
  }).filter(Boolean);
  if (!parts.length) return null;
  const say = (p) => (p.names ? `solved for ${p.names} only` : 'not solved');
  if (parts.every((p) => p.names === parts[0].names)) {
    const rules = parts.map((p, i) => (i ? p.rule.charAt(0).toLowerCase() + p.rule.slice(1) : p.rule));
    return `${rules.join(' and ')}: ${say(parts[0])}`;
  }
  return parts.map((p) => `${p.rule}: ${say(p)}`).join('; ');
}

// Debt/GDP under debt-neutral transfers is held on the path by design
const DN_DEBT = 'debt held on the path by design, so 0 by construction';

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
                {m.v === 'debt_gdp_pp' && r.id === 'dn' ? <span className="ex-mx-solved">{` · ${DN_DEBT}`}</span> : null}
              </th>
            </tr>
            {ROWS.filter((row) => row.rule === r.id).map((row) => (
              <tr key={row.key} className={m.v === 'debt_gdp_pp' && r.id === 'dn' ? 'is-by-design' : undefined}>
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

// The key: swatches with short names (pushB-final-rulings-fable.md 2):
// the in-view cell, on Economy the grey story values (linked), and the
// not-solved dash when some cells are not solved. The sentences that
// explain them are in the card's More info (MatrixMore).
function MatrixKey({ story = true, note }) {
  return (
    <ul className="ex-mx-key is-swatches">
      <li>
        <span className="ex-mx-key-cell is-current" aria-hidden="true" /> In view
      </li>
      {story ? (
        <li>
          <span className="ex-mx-key-ref" aria-hidden="true" />{' '}
          <NavLink tab="story" anchor="story-part-2">
            Story’s headline
          </NavLink>
        </li>
      ) : null}
      {note ? (
        <li>
          <span className="ex-mx-dash" aria-hidden="true">
            –
          </span>{' '}
          Not solved
        </li>
      ) : null}
    </ul>
  );
}

// The key's sentences, in More info: how to read the cells first, then
// `children` (the card's other lines), then the caveat on which rules are
// solved where, one paragraph per rule (each under 25 words).
// The matrix cards' More info (item 36): how to read the grid, what each
// cell is against, then the solved-cells note as caveats (Card.jsx
// cardMore puts the rows under How to read and `notes` under Caveats).
function matrixRows({ story = true, extra = [] }) {
  return [
    { label: 'How it is drawn', text: `The outlined cell is the case the charts show; click another to show it.${story ? ' Grey values are the story’s headline.' : ''}` },
    ...extra,
    { label: 'Compared with', text: 'Each cell against the OBR’s central forecast path for its own foreign-capital case.' },
  ];
}
const noteLines = (note) => (note ? note.split('; ').map((t) => `${t}.`) : null);

export default function AllScenarios() {
  // the arm is the one store's (&arm=, lib/nav.jsx), shared with the page pill
  const { st, set } = useNav();
  const arm = st.armId;
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
        controls={
          <Pill
            className="is-card"
            title="Options for this table"
            name={`${m.title} in ${HEADLINE_YEAR}, every cell`}
            sections={[
              {
                id: 'measure',
                label: 'Measure',
                glyph: 'ruler',
                kind: 'one',
                value: v,
                options: ECON.map((x) => ({ value: x.v, label: x.label, desc: MEASURE_DESC[x.v] })),
                onChange: setV,
                seg: m.label,
                def: v === 'Y',
              },
              versionSection(st, set),
            ]}
          />
        }
        unit={<span data-axis-title="y">{`${m.label}: % gap vs forecast path, ${HEADLINE_YEAR}`}</span>}
        legend={<MatrixKey note={solvedNote(arm, m.v)} />}
        // item 37: which choice moves each measure (gated in cells.js,
        // item-37-fable.md), the chosen measure's line first, in the card's
        // one closed More info
        moreId="across-more"
        more={matrixRows({
          extra: [{ label: 'What moves it', text: <Items className="ex-notes" items={drivers(arm, [v, ...ECON.map((x) => x.v).filter((x) => x !== v)]).map((d) => ({ key: `${d.kind}-${d.measures.join('')}`, icon: d.kind === 'still' ? 'onPath' : d.kind === 'lead' ? d.choice : 'compare', text: d.text }))} /> }],
        })}
        notes={noteLines(solvedNote(arm, m.v))}
        about={{
          caveats: (
            <Items
              items={[
                { key: 'korinek', icon: 'foreign', text: <>{ext(URLS.korinekT3, 'Korinek et al., substantial (US)')}: the upper case, not a UK estimate</> },
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
          context: () => `${armLabel} · ${HEADLINE_YEAR} · gap against the OBR’s central forecast path for the same foreign-capital case`,
          table: () => cellsTable(arm, armLabel),
          svg: () => matrixSvg(arm, m),
        }}
      >
        <Matrix arm={arm} m={m} label={`${m.title}, ${HEADLINE_YEAR}, ${armLabel}: every scenario, foreign-capital case and budget assumption`} />
      </Card>

      <SectionHeading id="ex-sensitivity" icon={iconFor('foreign')} title="More foreign capital">
        <Lead c="foreign">A sensitivity only: foreign investors supply half of the extra capital firms want</Lead>
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
  const m = DEBT[0];
  const armLabel = ARMS.find((a) => a.id === arm).label;
  return (
    <div className="explore-part ex-across" id="fin-across-part">
      <SectionHeading id="fin-across" icon={iconFor('cells')} title="Debt/GDP across scenarios">
        <Lead c="compare">{`Every scenario, foreign-capital case and budget assumption in ${HEADLINE_YEAR}; pick a cell to show it`}</Lead>
      </SectionHeading>
      <Card
        id="debt-cells"
        icon={iconFor('debt')}
        title={`Debt/GDP gap in ${HEADLINE_YEAR}, every case`}
        // item 37: debt/GDP's "moves most" line, from the Economy card, gated the same way
        finding={drivers(arm, ['debt_gdp_pp'])[0]?.kind !== 'pending' && drivers(arm, ['debt_gdp_pp'])[0]?.text ? `${drivers(arm, ['debt_gdp_pp'])[0].text}.` : null}
        controls={<Pill className="is-card" title="Options for this table" name={`Debt/GDP gap in ${HEADLINE_YEAR}, every case`} sections={[versionSection(st, set, true)]} />}
        unit={<span data-axis-title="y">{`Debt/GDP: pp gap vs forecast path, ${HEADLINE_YEAR}`}</span>}
        legend={<MatrixKey story={false} note={solvedNote(arm, m.v)} />}
        moreId="debt-cells-more"
        more={matrixRows({ story: false, extra: [{ label: 'Period', text: `This table is ${HEADLINE_YEAR}; the debt chart above runs to ${LATE_YEAR}.` }] })}
        notes={noteLines(solvedNote(arm, m.v))}
        sources={sourcesItems({ method: 'rules' })}
        download={{
          title: `Debt/GDP, every scenario, foreign-capital case and budget assumption, ${HEADLINE_YEAR}`,
          context: () => `${armLabel} · ${HEADLINE_YEAR} · pp of GDP against the OBR’s central forecast path for the same foreign-capital case`,
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
