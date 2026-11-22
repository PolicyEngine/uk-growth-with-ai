'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Pill from '@/components/ui/Pill.jsx';
import S from '@/lib/activeData.js';
import { INPUTS, KIND, ROWS } from './inputs.js';
import { SRC } from './sources.js';

// Every input on one table: input, value, a chip for its kind of source and
// one linked source, with a short line on how it is obtained. The full
// derivation (arithmetic and every source) is the row's detail, closed by
// default; a link to the row's id (from a scenario card) opens it. The
// counts above the table filter it by kind of source. Each group (push D,
// Q9.2c) is closed under a header with its count: a closed group shows its
// key rows only (inputs.js KEY_INPUTS); a source-type filter, or a link to a
// row, opens what it needs.
const GROUPS = [...new Set(ROWS.map((r) => r.group))];
const COUNTS = Object.fromEntries(Object.keys(KIND).map((k) => [k, ROWS.filter((r) => r.kind === k).length]));
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
  columns: ['Group', 'Input', 'Value used', 'Source type', 'How it is obtained', 'Sources'],
  rows: INPUTS.map((r) => [r.group, r.input, r.value, r.kindLabel ?? KIND[r.kind].label, r.note ? `${r.how} ${r.note}` : r.how, r.src.map((k) => `${SRC[k].label} <${SRC[k].url}>`).join('; ')]),
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
  const [open, setOpen] = useState(() => new Set());
  const [groups, setGroups] = useState(() => new Set());
  // a link to a row (#in-…) opens its detail
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const row = ROWS.find((r) => r.id === id);
      if (row) {
        setKind(null);
        setOpen((o) => new Set(o).add(id));
        if (!row.key) setGroups((o) => new Set(o).add(row.group));
      }
    };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);
  const toggle = (id) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const shown = ROWS.filter((r) => !kind || r.kind === kind);
  return (
    <div className="mx-inputs" data-no-axes="A table of inputs">
      <div className="mx-inputs-filter">
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
          ]}
        />
      </div>
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
          </tr>
        </thead>
        {GROUPS.map((g) => {
          const all = shown.filter((r) => r.group === g);
          if (!all.length) return null;
          const full = !!kind || groups.has(g) || all.every((r) => r.key);
          // a closed group's other rows stay in the page, hidden, so a link
          // to one lands (its hash opens the group) and the page dump reads it
          const rows = all;
          const nShown = full ? all.length : all.filter((r) => r.key).length;
          const gid = `mx-group-${g.toLowerCase().replace(/[^a-z]+/g, '-')}`;
          return (
            <tbody key={g} id={gid}>
              <tr className="mx-inputs-group">
                <th colSpan={4} scope="colgroup">
                  {kind || all.every((r) => r.key) ? (
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
                  <tr key={r.id} id={r.id} className={`mx-inputs-row${isOpen ? ' is-open' : ''}`} hidden={!full && !r.key ? true : undefined}>
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
                  </tr>,
                ];
                if (d && isOpen && (full || r.key))
                  out.push(
                    <tr key={`${r.id}-d`} id={`${r.id}-detail`} className="mx-inputs-detail">
                      <td colSpan={4}>
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
