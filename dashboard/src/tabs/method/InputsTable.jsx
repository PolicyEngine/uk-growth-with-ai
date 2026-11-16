'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { INPUTS, KIND } from './inputs.js';
import { SRC } from './sources.js';
import IconText from './IconText.jsx';

// Every input on one table, each with a chip for its kind of source and a
// link to that source (or to the code, for a modelling choice).
const GROUPS = [...new Set(INPUTS.map((r) => r.group))];
const COUNTS = Object.fromEntries(Object.keys(KIND).map((k) => [k, INPUTS.filter((r) => r.kind === k).length]));

export const inputsTable = () => ({
  columns: ['Group', 'Input', 'Value used', 'Source type', 'How it is obtained', 'Sources'],
  rows: INPUTS.map((r) => [r.group, r.input, r.value, KIND[r.kind].label, r.how, r.src.map((k) => `${SRC[k].label} <${SRC[k].url}>`).join('; ')]),
});

export default function InputsTable() {
  return (
    <div className="mx-inputs" id="m-inputs">
      <ul className="mx-inputs-key" aria-label="Source types">
        {Object.entries(KIND).map(([k, v]) => (
          <li key={k}>
            <span className={`mx-kind is-${k}`}>
              <Icon name={iconFor(v.icon)} size={14} />
              {v.label}
            </span>
            <span className="mx-kind-n">{COUNTS[k]}</span>
          </li>
        ))}
      </ul>
      <div className="table-wrap" data-no-axes="A table of inputs">
        <table className="data-table mx-inputs-table">
          <caption className="visually-hidden">Every scenario input and model parameter, its value, its kind of source and the source</caption>
          <thead>
            <tr>
              <th scope="col">Input</th>
              <th scope="col">Value used</th>
              <th scope="col">Source type</th>
              <th scope="col">How it is obtained, and the source</th>
            </tr>
          </thead>
          {GROUPS.map((g) => (
            <tbody key={g}>
              <tr className="table-group">
                <th colSpan={4} scope="colgroup">
                  {g}
                </th>
              </tr>
              {INPUTS.filter((r) => r.group === g).map((r) => (
                <tr key={r.input}>
                  <th scope="row">{r.input}</th>
                  <td className="mx-inputs-v">{r.value}</td>
                  <td>
                    <span className={`mx-kind is-${r.kind}`}>
                      <Icon name={iconFor(KIND[r.kind].icon)} size={14} />
                      {KIND[r.kind].label}
                    </span>
                  </td>
                  <td>
                    {r.how}{' '}
                    <span className="mx-inputs-src">
                      {r.src.map((k, i) => (
                        <span key={k}>
                          {i ? '; ' : ''}
                          <a href={SRC[k].url} target="_blank" rel="noreferrer">
                            {SRC[k].label}
                          </a>
                        </span>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="mx-sub">
        <IconText icon="arithmetic">Derived: computed by this study from OBR or IMF figures, by a rule they do not publish.</IconText>
      </p>
    </div>
  );
}
