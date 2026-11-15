'use client';

import Icon from '@/components/ab/Icon.jsx';
import Card from '@/components/ui/Card.jsx';
import MAP from '@/data/site-evidence-map.json';

// The UK evidence map: a table of UK studies of AI's economic effects, from
// data/site-evidence-map.json. While that file has no rows the card says the
// table is being compiled and names who it will cover; once rows arrive they
// render here with no code change (each row: the columns' keys, plus `url`
// and `checked`).
export default function EvidenceMap({ map = MAP }) {
  const { columns, rows, organisations } = map;
  const has = rows.length > 0;
  return (
    <Card
      id="uk-evidence-map"
      icon="table"
      title="UK studies of AI’s economic effects"
      finding={
        has
          ? `${rows.length} UK studies of AI’s economic effects, with what each estimates and over which horizon. Not our results.`
          : 'A table of UK studies of AI’s economic effects is being compiled. It will sit here, with what each study estimates, over which horizon and how.'
      }
      logo={false}
      about={{ sources: 'Each row links to the study and gives the date it was checked. The table is maintained in data/site-evidence-map.json.' }}
      aboutTitle="About this table"
      download={has ? { title: 'UK evidence map', context: 'UK studies of the economic effects of AI; not PolicyEngine results', table: () => ({ columns: [...columns.map((c) => c.label), 'Link', 'Checked'], rows: rows.map((r) => [...columns.map((c) => r[c.key] ?? ''), r.url ?? '', r.checked ?? '']) }) } : undefined}
    >
      {has ? (
        <div className="table-wrap">
          <table className="data-table evidence-table">
            <caption className="visually-hidden">UK studies of the economic effects of AI</caption>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id ?? i}>
                  {columns.map((c, j) =>
                    j === 0 ? (
                      <th key={c.key} scope="row">
                        {r[c.key]}
                      </th>
                    ) : (
                      <td key={c.key}>{c.key === 'title' && r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r[c.key]}</a> : r[c.key]}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="evidence-slot">
          <p className="evidence-slot-status">
            <Icon name="hourglass" size={16} />
            <span>Being compiled</span>
          </p>
          <p className="evidence-slot-who">Organisations it will cover:</p>
          <ul className="evidence-slot-list">
            {organisations.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
