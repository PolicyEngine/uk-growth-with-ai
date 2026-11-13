'use client';

import Icon from '@/components/ab/Icon.jsx';
import { TipBox } from '@/components/ab/Tip.jsx';
import { RANGES, SOURCES } from '@/data/literature.js';
import { gap, fmt, CENTRAL, BOUND, HEADLINE_YEAR, scenarioById, CLOSURE_LABEL } from '@/tabs/ai/surprise.js';
import { useHover } from '../shared/ui.jsx';

// Range bars: published level gaps (bars, or dots for a single figure)
// against our headline-year gaps for UK central and Korinek et al. (upper)
// (automation + productivity arm), both read from surprise2028.json through
// gap(). Our values appear in the tooltips only: their home is Results.
const META = {
  gdp: { title: 'GDP', v: 'Y', icon: 'factory', unit: '% against the OBR-central path', step: 2 },
  wage: { title: 'Average wage', v: 'w', icon: 'banknote', unit: '% against the OBR-central path', step: 1 },
};
const OURS = ['uk_central', 'korinek'];
const n1 = (x) => `${x < 0 ? '−' : x > 0 ? '+' : ''}${String(parseFloat(Math.abs(x).toFixed(2)))}%`;

function ticks(lo, hi, step) {
  const out = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(+t.toFixed(6));
  return out;
}

export default function RangeBars({ metric }) {
  const m = META[metric];
  const { hi, ref, bind } = useHover();
  const pub = RANGES[metric];
  const ours = OURS.map((sid) => ({
    sid,
    label: scenarioById(sid).label,
    c: gap(sid, 'tfp', CENTRAL, m.v),
    b: gap(sid, 'tfp', BOUND, m.v),
  }));
  const vals = [
    0,
    ...pub.flatMap((r) => (r.none ? [] : [r.lo, r.hi])),
    ...ours.flatMap((o) => [o.c, o.b]).filter((x) => x != null),
  ];
  const lo = Math.floor(Math.min(...vals) / m.step) * m.step;
  const top = Math.ceil(Math.max(...vals) / m.step) * m.step;
  const pad = m.step * 0.25;
  const x0 = Math.min(lo, 0) - pad;
  const x1 = top + pad;
  const px = (v) => ((v - x0) / (x1 - x0)) * 100;
  const tk = ticks(Math.min(lo, 0), top, m.step);

  const rowTip = (key, body) => (hi === key ? <TipBox className="mx-tip">{body}</TipBox> : null);

  return (
    <div className="info-card mx-card mx-figure mx-ranges" ref={ref}>
      <h3 className="info-card-title">
        <Icon name={m.icon} size={18} />
        <span>
          {m.title}: ours in {HEADLINE_YEAR} against published estimates
        </span>
      </h3>
      <p className="mx-fig-sub">{m.unit}. Hover, tap or tab to a row for its figures.</p>
      <div className="mx-rb">
        <div className="mx-rb-group">Ours, automation + productivity, {HEADLINE_YEAR}</div>
        {ours.map((o) => {
          const key = `o-${o.sid}`;
          return (
            <div key={key} className={`mx-rb-row is-ours${hi === key ? ' is-hi' : ''}`} {...bind(key, `${o.label}: ${CLOSURE_LABEL[CENTRAL]} ${fmt(o.c)}, ${CLOSURE_LABEL[BOUND]} ${fmt(o.b)}`)}>
              <span className="mx-rb-label">
                <b>{o.label}</b>
                <span>OG-UK, year 4 of adoption</span>
              </span>
              <span className="mx-rb-plot">
                <span className="mx-rb-zero" style={{ left: `${px(0)}%` }} />
                {o.c != null && o.b != null ? (
                  <span className="mx-rb-link" style={{ left: `${px(Math.min(o.c, o.b))}%`, width: `${Math.abs(px(o.c) - px(o.b))}%` }} />
                ) : null}
                {o.c != null ? <span className="mx-rb-dot is-c" style={{ left: `${px(o.c)}%` }} /> : null}
                {o.b != null ? <span className="mx-rb-dot is-b" style={{ left: `${px(o.b)}%` }} /> : null}
                {o.c == null && o.b == null ? <span className="mx-rb-pending">pending</span> : null}
                {o.c != null && o.b == null ? (
                  <span className="mx-rb-note" style={{ left: `${px(o.c)}%` }}>
                    closed capital pending
                  </span>
                ) : null}
                {rowTip(
                  key,
                  <>
                    <b>{o.label}</b>
                    <span>
                      Central closure {fmt(o.c)}; closed capital {fmt(o.b)}
                    </span>
                  </>,
                )}
              </span>
            </div>
          );
        })}
        <div className="mx-rb-group">Published</div>
        {pub.map((r, i) => {
          const key = `p-${i}`;
          const s = SOURCES[r.src];
          const fig = r.none ? 'no number' : r.lo === r.hi ? n1(r.lo) : `${n1(r.lo)} to ${n1(r.hi)}`;
          return (
            <div key={key} className={`mx-rb-row${hi === key ? ' is-hi' : ''}`} {...bind(key, `${r.label}, ${r.horizon}: ${fig}. ${r.note}`)}>
              <span className="mx-rb-label">
                <b>{r.label}</b>
                <span>{r.horizon}</span>
              </span>
              <span className="mx-rb-plot">
                <span className="mx-rb-zero" style={{ left: `${px(0)}%` }} />
                {r.none ? (
                  <span className="mx-rb-none">No number published</span>
                ) : r.lo === r.hi ? (
                  <span className="mx-rb-pt" style={{ left: `${px(r.lo)}%` }} />
                ) : (
                  <span className="mx-rb-bar" style={{ left: `${px(r.lo)}%`, width: `${px(r.hi) - px(r.lo)}%` }} />
                )}
                {r.mark != null ? <span className="mx-rb-tick" style={{ left: `${px(r.mark)}%` }} /> : null}
                {rowTip(
                  key,
                  <>
                    <b>{s.short}</b>
                    <span>
                      {fig} · {r.horizon}
                    </span>
                    <span>{r.note}</span>
                    <span className="mx-tip-tag">{s.loc}</span>
                    {s.read ? <span>{s.read}</span> : null}
                  </>,
                )}
              </span>
            </div>
          );
        })}
        <div className="mx-rb-row mx-rb-axis" aria-hidden="true">
          <span className="mx-rb-label" />
          <span className="mx-rb-plot">
            {tk.map((t) => (
              <span key={t} className="mx-rb-axtick" style={{ left: `${px(t)}%` }}>
                {t > 0 ? `+${t}` : t < 0 ? `−${Math.abs(t)}` : '0'}%
              </span>
            ))}
          </span>
        </div>
      </div>
      <ul className="mx-rb-key">
        <li>
          <span className="mx-rb-dot is-c is-key" /> Central closure
        </li>
        <li>
          <span className="mx-rb-dot is-b is-key" /> Closed capital
        </li>
        <li>
          <span className="mx-rb-bar is-key" /> Published range
        </li>
        <li>
          <span className="mx-rb-pt is-key" /> Single figure
        </li>
        <li>
          <span className="mx-rb-tick is-key" /> Source&rsquo;s own central case
        </li>
      </ul>
    </div>
  );
}
