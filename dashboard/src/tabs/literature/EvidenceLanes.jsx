'use client';

import { iconFor } from '@/lib/concepts.js';
import Icon from '@/components/ab/Icon.jsx';
import IconText from '@/tabs/method/IconText.jsx';
import { Items } from '@/components/story/Items.jsx';

import Card from '@/components/ui/Card.jsx';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { cssColour, esc } from '@/lib/download.js';
import { TipBox } from '@/components/ab/Tip.jsx';
import { RANGES } from '@/data/literature.js';
import MAP from '@/data/site-evidence-map.json';
import { gap, fmt, CENTRAL, BOUND, HEADLINE_YEAR, scenarioById, CLOSURE_LABEL } from '@/tabs/ai/surprise.js';
import { useHover } from '../shared/ui.jsx';
import { NavLink } from '@/lib/nav.jsx';
import './evidence.css';

// Evidence lanes: one lane per measure that has plotted figures (GDP and the
// average wage today; a new measure gains a lane when its rows carry `plot`,
// with a META entry for its title and axis). Each lane draws published level gaps (bars, or dots for a single figure), each
// against its own study's baseline, from the UK evidence map
// (site-evidence-map.json, through RANGES), beside our headline-year gaps for
// UK central and Korinek et al., substantial (US) (automation + productivity arm)
// against the forecast path, read from surprise2028.json through gap().
// Published figures are printed in the evidence map; ours on Explore. Here
// both appear in the tooltips only. A figure not confirmed in the published
// text (`unverified`) is left out, as it is from the map.
// A lane's `v` names OG-UK's variable where ours is comparable; lanes
// without one show published figures only. Adoption and exposure are levels,
// not effects. `kind: 'shares'` draws one row's `shares` as a 100% bar.
const META = {
  // `unit`: the lane's one short unit line (item 36, M5); what OG-UK's
  // figures are against, and that adoption and exposure are levels, are
  // in the card's More info
  gdp: { title: 'GDP', v: 'Y', icon: iconFor('gdp'), unit: 'GDP, % vs each study’s baseline', step: 2 },
  wage: { title: 'Average wage', v: 'w', icon: iconFor('pay'), unit: 'Average wage, % vs each study’s baseline', step: 1 },
  adoption: { title: 'AI adoption by firms', icon: iconFor('business'), unit: '% of businesses using AI', step: 10, level: true },
  exposure: { title: 'Jobs exposed to AI', icon: iconFor('workers'), unit: '% of UK workers, by occupation', kind: 'shares' },
  distribution: { title: 'Inequality', icon: iconFor('inequality'), unit: 'Gini points vs each study’s baseline', step: 5, suf: ' Gini pts' },
};
// Plotted rows of a measure the shared RANGES does not carry, read from the
// map in the same shape (each row with `plot` set to the measure)
const plotted = (metric) =>
  MAP.rows
    .filter((r) => r.plot === metric && !r.unverified)
    .map((r) => ({ ids: [r.id], label: r.plotLabel, short: r.institution, horizon: r.plotHorizon, note: r.note, loc: r.loc, url: r.url, lo: r.lo, hi: r.hi, mark: r.mark ?? null, none: false, unverified: false }));
const OURS = ['uk_central', 'korinek'];
// Signed for gaps; a level (adoption) prints without a sign
const n1 = (x, suf = '%', level = false) => `${x < 0 ? '−' : x > 0 && !level ? '+' : ''}${String(parseFloat(Math.abs(x).toFixed(2)))}${suf}`;

function ticks(lo, hi, step) {
  const out = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(+t.toFixed(6));
  return out;
}

function rows(metric) {
  const m = META[metric];
  const pub = (RANGES[metric] ?? plotted(metric)).filter((r) => !r.unverified);
  const ours = !m.v ? [] : OURS.map((sid) => ({
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
  const hl = cssColour('var(--series-2)');
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
  if (ours.length) group(`OG-UK, automation + productivity, ${HEADLINE_YEAR}`);
  for (const o of ours) {
    const cy = y + ROW / 2;
    label(o.label, 'OG-UK, year 4 of adoption');
    if (o.c != null && o.b != null) out += `<line x1="${X(o.c)}" x2="${X(o.b)}" y1="${cy}" y2="${cy}" stroke="${hl}" stroke-width="3"/>`;
    if (o.b != null) out += `<circle cx="${X(o.b)}" cy="${cy}" r="5.5" fill="${C.surface}" stroke="${hl}" stroke-width="2.5"/>`;
    if (o.c != null) out += `<circle cx="${X(o.c)}" cy="${cy}" r="6" fill="${hl}"/>`;
    out += `<text x="${x1 + 16}" y="${cy + 4}" font-size="12" fill="${C.ink}">${esc(`Some foreign capital ${fmt(o.c)}, no foreign capital ${fmt(o.b)}`)}</text>`;
    y += ROW;
  }
  group('Published');
  for (const r of pub) {
    const cy = y + ROW / 2;
    label(r.label, r.unverified ? `${r.horizon} · unverified` : r.horizon);
    const fig = r.none ? 'No number published' : r.lo === r.hi ? n1(r.lo, m.suf, m.level) : `${n1(r.lo, m.suf, m.level)} to ${n1(r.hi, m.suf, m.level)}`;
    if (!r.none && r.lo === r.hi) out += `<circle cx="${X(r.lo)}" cy="${cy}" r="6" fill="${s5}" stroke="${C.surface}" stroke-width="2"/>`;
    else if (!r.none) out += `<rect x="${X(r.lo)}" y="${cy - 6}" width="${Math.max(2, X(r.hi) - X(r.lo))}" height="12" rx="3" fill="${s5}" fill-opacity="${r.unverified ? 0.12 : 0.45}" stroke="${s5}" stroke-opacity="0.7"${r.unverified ? ' stroke-dasharray="3 2"' : ''}/>`;
    if (r.mark != null) out += `<rect x="${X(r.mark) - 1.5}" y="${cy - 9}" width="3" height="18" rx="1" fill="${C.ink}"/>`;
    out += `<text x="${x1 + 16}" y="${cy + 4}" font-size="12" fill="${r.none ? C.muted : C.ink}">${esc(fig)}</text>`;
    y += ROW;
  }
  out = `<line x1="${X(0)}" x2="${X(0)}" y1="${top0}" y2="${y}" stroke="${C.zeroLine}"/>` + out;
  for (const t of ticks(Math.min(Math.floor(Math.min(...vals) / m.step) * m.step, 0), top, m.step)) {
    out += `<text x="${X(t)}" y="${y + 16}" font-size="11" text-anchor="middle" fill="${C.tick}">${t > 0 ? `${m.level ? '' : '+'}${t}` : t < 0 ? `−${Math.abs(t)}` : '0'}${m.suf ? '' : '%'}</text>`;
  }
  return { w: W, h: y + 26, markup: out };
}

const legendKeys = () => [
  { label: 'Some foreign capital', color: cssColour('var(--series-2)'), shape: 'dot' },
  { label: 'No foreign capital', color: cssColour('var(--series-2)'), shape: 'ring' },
  { label: 'Published range', color: cssColour('var(--series-5)'), shape: 'box' },
  { label: 'Single figure', color: cssColour('var(--series-5)'), shape: 'dot' },
  { label: 'Source’s own central case', color: CHART_COLOURS.ink, shape: 'tick' },
];

function table(metric) {
  const { m, pub, ours } = rows(metric);
  return {
    columns: ['Measure', 'Row', 'Horizon', 'Low (%)', 'High (%)', 'Source central case (%)', 'Note', 'Source location', 'Link'],
    rows: [
      ...ours.flatMap((o) => [
        [m.title, `${o.label}, some foreign capital`, `OG-UK, ${HEADLINE_YEAR}`, o.c, o.c, null, 'OG-UK, automation + productivity, against the OBR’s central forecast path', 'surprise2028.json', ''],
        [m.title, `${o.label}, no foreign capital`, `OG-UK, ${HEADLINE_YEAR}`, o.b, o.b, null, 'OG-UK, automation + productivity, against the OBR’s central forecast path', 'surprise2028.json', ''],
      ]),
      ...pub.map((r) => [m.title, r.label, r.horizon, r.none ? null : r.lo, r.none ? null : r.hi, r.mark ?? null, `${r.note}${r.unverified ? ' (unverified)' : ''}; against the study’s own baseline`, `${r.short}, ${r.loc}`, r.url]),
    ],
  };
}

function LaneHead({ m, y = 'Each estimate' }) {
  return (
    <>
      <h3 className="mx-lane-h">
        <Icon name={m.icon} size={16} />
        <span>{m.title}</span>
      </h3>
      <p className="mx-lane-unit">
        <IconText icon="measure">
          <span data-axis-title="x">{m.unit}</span>
          {' · '}
          <span data-axis-title="y">{y}</span>
        </IconText>
      </p>
    </>
  );
}

// A composition lane: each row's `shares` as one 100% bar, its parts labelled
// (the shares are the row's printed value, in the map below)
const shareRows = (metric) => MAP.rows.filter((r) => r.metric === metric && r.shares && !r.unverified);
const SHADES = ['var(--pe-gray-700)', 'var(--pe-gray-500)', 'var(--pe-gray-300)'];
function SharesLane({ metric, hi, bind }) {
  const m = META[metric];
  return (
    <div className="mx-lane" id={`ranges-${metric}`}>
      <LaneHead m={m} y="Each source" />
      {shareRows(metric).map((r) => (
        <div key={r.id} className="mx-share">
          <span className="mx-rb-label">
            <b>{r.plotLabel}</b>
            <span>
              {r.horizon} ·{' '}
              <a className="ev-rb-home" href={`#ev-row-${r.id}`}>
                figures in the table
              </a>
            </span>
          </span>
          <span className="mx-share-bar">
            {r.shares.map((x, i) => {
              const key = `s-${r.id}-${i}`;
              return (
                <span key={key} className={`mx-share-part${hi === key ? ' is-hi' : ''}`} style={{ flexGrow: x.pct, background: SHADES[i % SHADES.length] }} {...bind(key, `${x.label}: ${x.pct}%`)}>
                  {hi === key ? (
                    <TipBox className="mx-tip">
                      <b>{x.label}</b>
                      <span>{x.pct}% of UK workers</span>
                    </TipBox>
                  ) : null}
                </span>
              );
            })}
          </span>
          <ul className="mx-share-key">
            {r.shares.map((x, i) => (
              <li key={x.label}>
                <span className="mx-share-sw" style={{ background: SHADES[i % SHADES.length] }} data-icon="" />
                {x.label}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Lane({ metric, hi, bind }) {
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
    <div className="mx-lane" id={`ranges-${metric}`}>
      <LaneHead m={m} />
      <div className="mx-rb">
        {ours.length ? <div className="mx-rb-group">OG-UK, automation + productivity, {HEADLINE_YEAR}</div> : null}
        {ours.map((o) => {
          const key = `o-${o.sid}`;
          return (
            <div key={key} className={`mx-rb-row is-ours${hi === key ? ' is-hi' : ''}`} {...bind(key, `${o.label}: ${CLOSURE_LABEL[CENTRAL]} ${fmt(o.c)}, ${CLOSURE_LABEL[BOUND]} ${fmt(o.b)}`)}>
              <span className="mx-rb-label">
                <b>{o.label}</b>
                <span>
                  OG-UK, year 4 of adoption ·{' '}
                  <NavLink tab="explore" sub="economy" anchor="economy-wall" patch={{ s: o.sid }} className="nav-link ev-rb-home">
                    figures on Explore
                  </NavLink>
                </span>
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
                    no foreign capital pending
                  </span>
                ) : null}
                {rowTip(
                  key,
                  <>
                    <b>{o.label}</b>
                    <span>
                      Some foreign capital {fmt(o.c)}; no foreign capital {fmt(o.b)}
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
          const fig = r.none ? 'no number' : r.lo === r.hi ? n1(r.lo, m.suf, m.level) : `${n1(r.lo, m.suf, m.level)} to ${n1(r.hi, m.suf, m.level)}`;
          return (
            <div key={key} className={`mx-rb-row${hi === key ? ' is-hi' : ''}`} {...bind(key, `${r.label}, ${r.horizon}: ${fig}${r.unverified ? ', unverified' : ''}. ${r.note}`)}>
              <span className="mx-rb-label">
                <b>{r.label}</b>
                <span>
                  {r.horizon}
                  {r.unverified ? <em className="ev-unverified"> · unverified</em> : null} ·{' '}
                  <a className="ev-rb-home" href={`#ev-row-${r.ids[0]}`}>
                    {r.none ? 'in the table' : r.lo === r.hi ? 'figure in the table' : 'figures in the table'}
                  </a>
                </span>
              </span>
              <span className="mx-rb-plot">
                <span className="mx-rb-zero" style={{ left: `${px(0)}%` }} />
                {r.none ? (
                  <span className="mx-rb-none">No number published</span>
                ) : r.lo === r.hi ? (
                  <span className="mx-rb-pt" style={{ left: `${px(r.lo)}%` }} />
                ) : (
                  <span className={`mx-rb-bar${r.unverified ? ' is-unverified' : ''}`} style={{ left: `${px(r.lo)}%`, width: `${px(r.hi) - px(r.lo)}%` }} />
                )}
                {r.mark != null ? <span className="mx-rb-tick" style={{ left: `${px(r.mark)}%` }} /> : null}
                {rowTip(
                  key,
                  <>
                    <b>{r.short}</b>
                    <span>
                      {fig} · {r.horizon}
                    </span>
                    <span>{r.note}</span>
                    <span className="mx-tip-tag">{r.loc}</span>
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
                {t > 0 ? `${m.level ? '' : '+'}${t}` : t < 0 ? `−${Math.abs(t)}` : '0'}
                {m.suf ? '' : '%'}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

const LANES = Object.keys(META).filter((k) => (META[k].kind === 'shares' ? shareRows(k).length : (RANGES[k] ?? plotted(k)).length));
const RANGE_LANES = LANES.filter((k) => META[k].kind !== 'shares');
const TITLE = `Published estimates by measure, with OG-UK’s in ${HEADLINE_YEAR} where comparable`;

export default function EvidenceLanes() {
  const { hi, ref, bind } = useHover();
  return (
    <Card
      id="evidence-lanes"
      icon={iconFor('range')}
      title={TITLE}
      className="mx-ranges ev-rb"
      replication={{ code: 'https://github.com/PolicyEngine/uk-growth-with-ai/blob/dashboard/story/dashboard/src/tabs/literature/EvidenceLanes.jsx', result: 'https://github.com/PolicyEngine/uk-growth-with-ai/blob/dashboard/story/dashboard/src/data/site-evidence-map.json' }}
      finding={<IconText icon="link">One lane per measure. Published figures live in the evidence map, OG-UK’s on Explore.</IconText>}
      unit={<IconText icon="measure">Each lane has its own scale and unit.</IconText>}
      more={[
        { label: 'Compared with', text: 'Published figures: each study’s own baseline. OG-UK’s figures: the OBR’s central forecast path.' },
        { label: 'Measure', text: 'Adoption is a level, not a gap; exposure is a share of workers, not a gap.' },
        { label: 'How it is drawn', text: 'Each estimate at its own horizon, with its source.' },
      ]}
      legend={
        <ul className="mx-rb-key">
          <li>
            <span className="mx-rb-dot is-c is-key" data-icon="" /> Some foreign capital
          </li>
          <li>
            <span className="mx-rb-dot is-b is-key" data-icon="" /> No foreign capital
          </li>
          <li>
            <span className="mx-rb-bar is-key" data-icon="" /> Published range
          </li>
          <li>
            <span className="mx-rb-pt is-key" data-icon="" /> Single figure
          </li>
          <li>
            <span className="mx-rb-tick is-key" data-icon="" /> Source&rsquo;s own central case
          </li>
        </ul>
      }
      about={{
        how: (
          <Items
            items={[
              { icon: 'model', text: `OG-UK: automation + productivity, ${HEADLINE_YEAR} gap against the OBR’s central forecast path.` },
              { icon: 'source', text: 'Published: each study’s own level gap, against its own baseline.' },
              { icon: 'ai', text: 'Those baselines mostly have no AI.' },
              { icon: 'timing', text: 'Each at its own horizon; none is converted.' },
              { icon: 'range', text: 'Units differ by measure, so each lane has its own axis.' },
            ]}
          />
        ),
        sources: (
          <Items
            items={[
              { icon: 'table', text: 'Each published row is a row of the UK evidence map below.' },
              { icon: 'excluded', text: 'A figure not confirmed in the published text is left out.' },
            ]}
          />
        ),
      }}
      download={{
        title: TITLE,
        context: () => `OG-UK: automation + productivity, against the OBR’s central forecast path; published figures against each study’s own baseline. Lanes: ${RANGE_LANES.map((k) => `${META[k].title} (${META[k].unit})`).join('; ')}`,
        table: () => {
          const ts = RANGE_LANES.map(table);
          // composition lanes: one row per share, low = high = the share
          const shares = LANES.filter((k) => META[k].kind === 'shares').flatMap((k) =>
            shareRows(k).flatMap((r) => r.shares.map((x) => [META[k].title, `${r.plotLabel}: ${x.label}`, r.horizon, x.pct, x.pct, null, `${META[k].unit}`, `${r.institution}, ${r.loc}`, r.url])),
          );
          return { columns: ts[0].columns, rows: [...ts.flatMap((t) => t.rows), ...shares] };
        },
        svg: () => {
          const parts = RANGE_LANES.map(rangeSvg);
          let y = 0;
          let markup = '';
          parts.forEach((part, i) => {
            markup += `<text x="0" y="${y + 16}" font-size="14" font-weight="700">${esc(META[RANGE_LANES[i]].title)}</text><g transform="translate(0 ${y + 28})">${part.markup}</g>`;
            y += part.h + 44;
          });
          return { w: Math.max(...parts.map((part) => part.w)), h: y, markup };
        },
        legend: legendKeys,
      }}
    >
      <div className="mx-lanes" ref={ref}>
        {LANES.map((k) => (META[k].kind === 'shares' ? <SharesLane key={k} metric={k} hi={hi} bind={bind} /> : <Lane key={k} metric={k} hi={hi} bind={bind} />))}
      </div>
    </Card>
  );
}

