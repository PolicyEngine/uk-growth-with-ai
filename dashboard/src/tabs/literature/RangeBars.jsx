'use client';

import Card from '@/components/ui/Card.jsx';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { cssColour, esc } from '@/lib/download.js';
import { TipBox } from '@/components/ab/Tip.jsx';
import { RANGES, SOURCES } from '@/data/literature.js';
import { gap, fmt, CENTRAL, BOUND, HEADLINE_YEAR, scenarioById, CLOSURE_LABEL } from '@/tabs/ai/surprise.js';
import { useHover } from '../shared/ui.jsx';

// Range bars: published level gaps (bars, or dots for a single figure)
// against our headline-year gaps for UK central and Korinek et al. (upper)
// (automation + productivity arm), both read from surprise2028.json through
// gap(). Our values appear in the tooltips only: their home is Explore.
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

function rows(metric) {
  const m = META[metric];
  const pub = RANGES[metric];
  const ours = OURS.map((sid) => ({
    sid,
    label: scenarioById(sid).label,
    c: gap(sid, 'tfp', CENTRAL, m.v),
    b: gap(sid, 'tfp', BOUND, m.v),
  }));
  return { m, pub, ours };
}

// The chart as SVG from the data, for the PNG and SVG downloads. The file
// stands alone, so it prints each row's figures beside it.
function rangeSvg(metric) {
  const { m, pub, ours } = rows(metric);
  const vals = [0, ...pub.flatMap((r) => (r.none ? [] : [r.lo, r.hi])), ...ours.flatMap((o) => [o.c, o.b]).filter((x) => x != null)];
  const lo = Math.min(0, Math.floor(Math.min(...vals) / m.step) * m.step) - m.step * 0.25;
  const top = Math.ceil(Math.max(...vals) / m.step) * m.step + m.step * 0.25;
  const W = 1000;
  const x0 = 330;
  const x1 = 760;
  const X = (v) => x0 + ((v - lo) / (top - lo)) * (x1 - x0);
  const C = CHART_COLOURS;
  const hl = cssColour('var(--c-highlight)');
  const s5 = cssColour('var(--series-5)');
  const ROW = 34;
  let y = 0;
  let out = '';
  const group = (t) => {
    out += `<text x="0" y="${y + 16}" font-size="12" font-weight="600" fill="${C.axisTitle}">${esc(t)}</text>`;
    y += 26;
  };
  const label = (a, b) => {
    out += `<text x="0" y="${y + 14}" font-size="12" font-weight="600" fill="${C.ink}">${esc(a)}</text>`;
    out += `<text x="0" y="${y + 28}" font-size="11" fill="${C.muted}">${esc(b)}</text>`;
  };
  const top0 = y;
  group(`Ours, automation + productivity, ${HEADLINE_YEAR}`);
  for (const o of ours) {
    const cy = y + ROW / 2;
    label(o.label, 'OG-UK, year 4 of adoption');
    if (o.c != null && o.b != null) out += `<line x1="${X(o.c)}" x2="${X(o.b)}" y1="${cy}" y2="${cy}" stroke="${hl}" stroke-width="3"/>`;
    if (o.b != null) out += `<circle cx="${X(o.b)}" cy="${cy}" r="5.5" fill="${C.surface}" stroke="${hl}" stroke-width="2.5"/>`;
    if (o.c != null) out += `<circle cx="${X(o.c)}" cy="${cy}" r="6" fill="${hl}"/>`;
    out += `<text x="${x1 + 16}" y="${cy + 4}" font-size="12" fill="${C.ink}">${esc(`Central ${fmt(o.c)}, closed capital ${fmt(o.b)}`)}</text>`;
    y += ROW;
  }
  group('Published');
  for (const r of pub) {
    const cy = y + ROW / 2;
    label(r.label, r.horizon);
    const fig = r.none ? 'No number published' : r.lo === r.hi ? n1(r.lo) : `${n1(r.lo)} to ${n1(r.hi)}`;
    if (!r.none && r.lo === r.hi) out += `<circle cx="${X(r.lo)}" cy="${cy}" r="6" fill="${s5}" stroke="${C.surface}" stroke-width="2"/>`;
    else if (!r.none) out += `<rect x="${X(r.lo)}" y="${cy - 6}" width="${Math.max(2, X(r.hi) - X(r.lo))}" height="12" rx="3" fill="${s5}" fill-opacity="0.45" stroke="${s5}" stroke-opacity="0.7"/>`;
    if (r.mark != null) out += `<rect x="${X(r.mark) - 1.5}" y="${cy - 9}" width="3" height="18" rx="1" fill="${C.ink}"/>`;
    out += `<text x="${x1 + 16}" y="${cy + 4}" font-size="12" fill="${r.none ? C.muted : C.ink}">${esc(fig)}</text>`;
    y += ROW;
  }
  out = `<line x1="${X(0)}" x2="${X(0)}" y1="${top0}" y2="${y}" stroke="${C.zeroLine}"/>` + out;
  for (const t of ticks(Math.min(Math.floor(Math.min(...vals) / m.step) * m.step, 0), top, m.step)) {
    out += `<text x="${X(t)}" y="${y + 16}" font-size="11" text-anchor="middle" fill="${C.tick}">${t > 0 ? `+${t}` : t < 0 ? `−${Math.abs(t)}` : '0'}%</text>`;
  }
  return { w: W, h: y + 26, markup: out };
}

const legendKeys = () => [
  { label: 'Central closure', color: cssColour('var(--c-highlight)'), shape: 'dot' },
  { label: 'Closed capital', color: cssColour('var(--c-highlight)'), shape: 'ring' },
  { label: 'Published range', color: cssColour('var(--series-5)'), shape: 'box' },
  { label: 'Single figure', color: cssColour('var(--series-5)'), shape: 'dot' },
  { label: 'Source’s own central case', color: CHART_COLOURS.ink, shape: 'tick' },
];

function table(metric) {
  const { pub, ours } = rows(metric);
  return {
    columns: ['Row', 'Horizon', 'Low (%)', 'High (%)', 'Source central case (%)', 'Note'],
    rows: [
      ...ours.flatMap((o) => [
        [`${o.label}, central closure`, `OG-UK, ${HEADLINE_YEAR}`, o.c, o.c, null, 'Ours, automation + productivity'],
        [`${o.label}, closed capital`, `OG-UK, ${HEADLINE_YEAR}`, o.b, o.b, null, 'Ours, automation + productivity'],
      ]),
      ...pub.map((r) => [r.label, r.horizon, r.none ? null : r.lo, r.none ? null : r.hi, r.mark ?? null, `${r.note} (${SOURCES[r.src].short}, ${SOURCES[r.src].loc})`]),
    ],
  };
}

export default function RangeBars({ metric }) {
  const { hi, ref, bind } = useHover();
  const { m, pub, ours } = rows(metric);
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
    <Card
      id={`ranges-${metric}`}
      icon={m.icon}
      title={`${m.title}: ours in ${HEADLINE_YEAR} against published estimates`}
      className="mx-ranges"
      finding="Our figures are in the tooltips here: their home is Explore. Hover, tap or tab to a row for its figures."
      unit={m.unit}
      legend={
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
      }
      about={{
        how: `Ours: the automation + productivity arm’s ${HEADLINE_YEAR} gap against the OBR-central path, from the same solves as Explore. Published: each source’s own level gap, at its own horizon.`,
        sources: 'Every published figure was read from the primary text; each row’s tooltip gives the page or table, and the sources are listed under Sources.',
      }}
      download={{
        title: `${m.title}: ours in ${HEADLINE_YEAR} against published estimates`,
        context: () => `Ours: automation + productivity · ${m.unit}`,
        table: () => table(metric),
        svg: () => rangeSvg(metric),
        legend: legendKeys,
      }}
    >
      <div className="mx-rb" ref={ref}>
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
    </Card>
  );
}
