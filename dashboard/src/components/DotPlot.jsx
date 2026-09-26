'use client';

// Cleveland dot plot in HTML/CSS: labels and values are real text, so they
// stay legible at any column width. Each dot sits on a stem drawn from the
// reference value (e.g. index = 100), so the gap is read from the reference,
// not from an arbitrary axis floor.
//
// `groups`: [{ shade?: bool, note?: string, rows: [{ label, value, color, hollow?, strong? }] }]
// `domain`: [lo, hi]; `step`: tick spacing; `ref`: reference value for the rule.

export default function DotPlot({ groups, domain, step, reference, valueFormat = (v) => v.toFixed(1), ariaLabel }) {
  const [lo, hi] = domain;
  const pct = (v) => `${((v - lo) / (hi - lo)) * 100}%`;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);

  return (
    <div className="dotplot" role="img" aria-label={ariaLabel}>
      <div className="dp-grid" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} className={`dp-gridline${t === reference ? ' ref' : ''}`} style={{ left: pct(t) }} />
        ))}
      </div>
      {groups.map((g, gi) => (
        <div key={gi} className={`dp-group${g.shade ? ' shade' : ''}`}>
          {g.note ? <div className="dp-note">{g.note}</div> : null}
          {g.rows.map((r) => {
            const a = Math.min(r.value, reference);
            const b = Math.max(r.value, reference);
            return (
              <div key={r.label} className="dp-row">
                <div className={`dp-label${r.strong ? ' strong' : ''}`}>{r.label}</div>
                <div className="dp-track">
                  <span className="dp-stem" style={{ left: pct(a), width: `calc(${pct(b)} - ${pct(a)})`, background: r.color }} />
                  <span
                    className={`dp-dot${r.hollow ? ' hollow' : ''}`}
                    style={{ left: pct(r.value), borderColor: r.color, background: r.hollow ? undefined : r.color }}
                  />
                  <span className="dp-value" style={{ left: pct(r.value) }}>
                    {valueFormat(r.value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div className="dp-row dp-axis" aria-hidden="true">
        <div className="dp-label" />
        <div className="dp-track">
          {ticks.map((t) => (
            <span key={t} className="dp-tick" style={{ left: pct(t) }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
