'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Pill from '@/components/ui/Pill.jsx';
import S from '@/lib/activeData.js';
import { INPUTS, KIND, PART_USED, ROWS } from './inputs.js';
import { SRC } from './sources.js';

// Every input on one table: input, value, a chip for its kind of source and
// one linked source, with a short line on how it is obtained. The full
// derivation (arithmetic and every source) is the row's detail, closed by
// default; a link to the row's id (from a scenario card) opens it. The
// counts above the table filter it by kind of source. Each group (push D,
// Q9.2c) is closed under a header with its count: a closed group shows its
// key rows only (inputs.js KEY_INPUTS); a source-type filter, or a link to a
// row, opens what it needs.
// Method redesign (6.1): a search box above the pill matches each row's
// input, value, short line, derivation and source labels; the pill filters
// by source type and by the part that uses the input ("Used by"). With a
// search or a filter set, every group is open and only matching rows show;
// a group with none is left out. A count line says how many are shown.
const GROUPS = [...new Set(ROWS.map((r) => r.group))];
const COUNTS = Object.fromEntries(Object.keys(KIND).map((k) => [k, ROWS.filter((r) => r.kind === k).length]));
const PART_COUNTS = Object.fromEntries(Object.keys(PART_USED).map((k) => [k, ROWS.filter((r) => r.part === k).length]));
const partText = (k) => `Part ${PART_USED[k].n} · ${PART_USED[k].name}`;
// what a search reads in a row
const HAY = Object.fromEntries(ROWS.map((r) => [r.id, [r.input, r.value, r.short, r.how, r.note ?? '', ...r.src.map((k) => SRC[k]?.label ?? '')].join(' ').toLowerCase()]));
export const rowMatches = (r, { kind = null, part = null, q = '' } = {}) => (!kind || r.kind === kind) && (!part || r.part === part) && (!q.trim() || HAY[r.id].includes(q.trim().toLowerCase()));
const SCEN_NOTE = Object.fromEntries(S.scenarios.map((s) => [s.id, s.sources ?? {}]));

// The scenario file's notes say which steps are arithmetic on a published
// figure; said here without a first person.
const neutral = (v) =>
  v
    .replace(/\(our arithmetic\)/g, '(arithmetic on the published figures, not a figure in the source)')
    .replace(/\(our inference from the IMF calibration, not an IMF figure\)/g, '(an inference from the IMF calibration, not an IMF figure)')
    .replace(/\(our inference\)/g, '(an inference from the IMF calibration, not an IMF figure)')
    .replace(/\(our mapping\)/g, '(a proportional mapping, not a figure in the source)');
const scenNote = (r) => (r.scen ? SCEN_NOTE[r.scen[0]]?.[r.scen[1]] : null);
const hasDetail = (r) => r.how !== r.short || !!r.note || r.src.length > 1 || !!scenNote(r);

export const inputsTable = () => ({
  columns: ['Group', 'Input', 'Value used', 'Source type', 'How it is obtained', 'Sources', 'Used by'],
  rows: INPUTS.map((r) => [r.group, r.input, r.value, r.kindLabel ?? KIND[r.kind].label, r.note ? `${r.how} ${r.note}` : r.how, r.src.map((k) => `${SRC[k].label} <${SRC[k].url}>`).join('; '), partText(r.part)]),
});

function Kind({ k, label }) {
  return (
    <span className={`mx-kind is-${k}`}>
      {label ?? KIND[k].label}
    </span>
  );
}

const link = (k) => (
  <a href={SRC[k].url} target="_blank" rel="noreferrer">
    {SRC[k].label}
  </a>
);

export default function InputsTable() {
  const [kind, setKind] = useState(null);
  const [part, setPart] = useState(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(() => new Set());
  const [groups, setGroups] = useState(() => new Set());
  const root = useRef(null);
  // a link to a row (#in-…) opens its detail
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const row = ROWS.find((r) => r.id === id);
      if (row) {
        setKind(null);
        setPart(null);
        setQ('');
        setOpen((o) => new Set(o).add(id));
        if (!row.key) setGroups((o) => new Set(o).add(row.group));
      }
    };
    go();
    window.addEventListener('hashchange', go);
    // the site's in-page links (lib/scroll.js revealAnchor) send a bubbling
    // "reveal" from the target: a row in a closed group opens its group,
    // so the scroll that follows finds it
    const el = root.current;
    const onReveal = (e) => {
      const tr = e.target?.closest?.('tr.mx-inputs-row');
      const row = tr && ROWS.find((r) => r.id === tr.id);
      if (row) {
        setKind(null);
        setPart(null);
        setQ('');
        setOpen((o) => new Set(o).add(row.id));
        setGroups((o) => new Set(o).add(row.group));
      }
    };
    el?.addEventListener('reveal', onReveal);
    return () => {
      window.removeEventListener('hashchange', go);
      el?.removeEventListener('reveal', onReveal);
    };
  }, []);
  const toggle = (id) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const filtered = !!kind || !!part || !!q.trim();
  const shown = ROWS.filter((r) => rowMatches(r, { kind, part, q }));
  const clear = () => {
    setKind(null);
    setPart(null);
    setQ('');
  };
  return (
    <div className="mx-inputs" data-no-axes="A table of inputs" ref={root}>
      <div className="mx-inputs-filter">
        <div className="mx-inputs-find">
          <label htmlFor="inputs-search">Search inputs</label>
          <input type="search" id="inputs-search" className="mx-inputs-search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false} />
        </div>
        <Pill
          className="is-card"
          title="Options for this table"
          name="Every input"
          sections={[
            {
              id: 'kind',
              label: 'Source type',
              glyph: 'book',
              kind: 'one',
              value: kind ?? 'all',
              options: [{ value: 'all', label: 'All types', desc: 'Every input' }, ...Object.keys(KIND).map((k) => ({ value: k, label: KIND[k].label, desc: `${COUNTS[k]} of ${ROWS.length} inputs` }))],
              onChange: (k) => setKind(k === 'all' ? null : k),
              seg: kind ? KIND[kind].label : 'All types',
              def: !kind,
            },
            {
              id: 'part',
              label: 'Used by',
              glyph: 'layers',
              kind: 'one',
              value: part ?? 'all',
              options: [{ value: 'all', label: 'All parts', desc: `${ROWS.length} inputs` }, ...Object.keys(PART_USED).map((k) => ({ value: k, label: PART_USED[k].name, desc: `${PART_COUNTS[k]} of ${ROWS.length} inputs` }))],
              onChange: (k) => setPart(k === 'all' ? null : k),
              seg: part ? PART_USED[part].name : 'All parts',
              def: !part,
            },
          ]}
        />
      </div>
      <p className="mx-inputs-n" aria-live="polite">
        {shown.length ? (
          `${shown.length} of ${ROWS.length} inputs`
        ) : (
          <>
            No input matches. Clear the search or the filters.{' '}
            <button type="button" className="mx-inputs-clear" onClick={clear}>
              Clear
            </button>
          </>
        )}
      </p>
      <table className="mx-inputs-table">
        <caption className="visually-hidden">Every scenario input and model parameter, its value, its kind of source and the source</caption>
        <thead>
          <tr>
            <th scope="col">Input</th>
            <th scope="col" className="mx-inputs-v">
              Value
            </th>
            <th scope="col">Source type</th>
            <th scope="col">Source</th>
            <th scope="col">Used by</th>
          </tr>
        </thead>
        {GROUPS.map((g) => {
          const rows = ROWS.filter((r) => r.group === g);
          // with a search or a filter: the matching rows only, the group
          // open; a group with none is left out (hidden)
          const all = filtered ? rows.filter((r) => shown.includes(r)) : rows;
          const full = filtered || groups.has(g) || all.every((r) => r.key);
          // a closed group's other rows, and rows a search leaves out, stay
          // in the page, hidden, so a link to one lands (its reveal clears
          // the search and opens the group) and the page dump reads it
          const rowHidden = (r) => (filtered ? !all.includes(r) : !full && !r.key);
          const nShown = full ? all.length : all.filter((r) => r.key).length;
          const gid = `mx-group-${g.toLowerCase().replace(/[^a-z]+/g, '-')}`;
          return (
            <tbody key={g} id={gid} hidden={filtered && !all.length ? true : undefined}>
              <tr className="mx-inputs-group">
                <th colSpan={5} scope="colgroup">
                  {filtered || all.every((r) => r.key) ? (
                    <span>
                      {g} <span className="mx-inputs-count">({all.length})</span>
                    </span>
                  ) : (
                    <button type="button" className="mx-group-toggle" aria-expanded={full} onClick={() => setGroups((o) => { const n = new Set(o); if (n.has(g)) n.delete(g); else n.add(g); return n; })}>
                      <Icon name="chevronDown" size={14} className="mx-chev" />
                      <span>{g}</span> <span className="mx-inputs-count">({all.length})</span>
                      {full ? null : <span className="mx-inputs-count"> · {all.length - nShown} more</span>}
                    </button>
                  )}
                </th>
              </tr>
              {rows.flatMap((r) => {
                const d = hasDetail(r);
                const isOpen = open.has(r.id);
                const note = scenNote(r);
                const out = [
                  <tr key={r.id} id={r.id} className={`mx-inputs-row${isOpen ? ' is-open' : ''}`} hidden={rowHidden(r) ? true : undefined}>
                    <th scope="row">
                      {d ? (
                        <button type="button" className="mx-row-toggle" aria-expanded={isOpen} aria-controls={`${r.id}-detail`} onClick={() => toggle(r.id)}>
                          <Icon name="chevronDown" size={14} className="mx-chev" />
                          <span className="mx-inputs-name">{r.input}</span>
                        </button>
                      ) : (
                        <span className="mx-inputs-name is-plain">{r.input}</span>
                      )}{' '}
                      <span className="mx-inputs-short">{r.short}</span>
                    </th>
                    <td className="mx-inputs-v">{r.value}</td>
                    <td className="mx-inputs-k">
                      <Kind k={r.kind} label={r.kindLabel} />
                    </td>
                    <td className="mx-inputs-src">
                      {link(r.src[0])}
                      {r.src.length > 1 ? <span className="mx-inputs-more"> +{r.src.length - 1}</span> : null}
                    </td>
                    <td className="mx-inputs-part" data-part={r.part}>
                      Part {PART_USED[r.part].n}
                      <span className="mx-inputs-part-name"> · {PART_USED[r.part].name}</span>
                    </td>
                  </tr>,
                ];
                if (d && isOpen && !rowHidden(r))
                  out.push(
                    <tr key={`${r.id}-d`} id={`${r.id}-detail`} className="mx-inputs-detail">
                      <td colSpan={5}>
                        <p>
                          {r.how}
                          {r.note ? <> {r.note}</> : null}
                        </p>
                        {note ? <p className="mx-inputs-file">Scenario file: {neutral(note)}</p> : null}
                        <p className="mx-inputs-cites">
                          Sources:{' '}
                          {r.src.map((k, i) => (
                            <span key={k}>
                              {i ? '; ' : ''}
                              {link(k)}
                            </span>
                          ))}
                          .
                        </p>
                      </td>
                    </tr>,
                  );
                return out;
              })}
            </tbody>
          );
        })}
      </table>
      <p className="mx-sub mx-inputs-foot">Open a row for its arithmetic</p>
    </div>
  );
}
