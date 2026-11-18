'use client';

import SourceLine from '@/components/ui/SourceLine.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { asOfItems } from '@/components/story/AsOf.jsx';
import { docItem, navItem } from '@/lib/sourceItems.js';
import Icon from '@/components/ab/Icon.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import { REPO } from '@/tabs/ai/links.js';
import { METHOD, PAGE_TITLE } from '@/lib/labels.js';
import { primaryClosure } from '@/tabs/ai/lines.js';
import { paySigns } from '@/tabs/story/part2/caveats.js';
import { BOUND, HEADLINE_YEAR, LATE_YEAR, S, SCENARIOS, SCEN_NAME, SURPRISE_YEAR, YEARS, fmt, gap, payLine } from '@/tabs/ai/surprise.js';

// The first screen: the story's first question, then one result unit on
// the chart's own frame (hero-redesign-fable.md; no card, border or
// shadow): a plain muted kicker line (scenario, year, what the figures are
// gaps to, with the figure's one "Sources and notes" icon at its end), then
// three stats of one anatomy (name, number, one short line): GDP, pay rates
// and national income, the 2031 gaps against the OBR's central forecast
// path for the scenario and closure chosen in the header. Each number links
// to its home, part 2's headline ledger (#story-headline); each name opens
// its definition. Values are in neutral ink: the sign carries the
// direction. Then a chart of the four scenarios' GDP paths (main arm). Each
// line starts in 2028, the first year with the extra AI, the chosen one at
// a hollow dot; before it the only mark is the zero line (the forecast
// path, its own AI included). The first frame is the final one: the
// figures are printed as they are (no count-up) and nothing fades or draws
// in. Each line is labelled with its name and its 2031 value: at the line
// end on desktop, as a legend row under the chart at 600px and below (two
// drawings; CSS shows one, so the hidden one's text is not read).

// Korinek et al.'s US case is dashed (not calibrated to the UK)
const LINE = { uk_low: 'uk', uk_central: 'uk', uk_high: 'uk', korinek: 'us' };
export const HERO_AXIS_TITLE = 'GDP gap against the OBR’s central forecast path, %';
// the baseline's name, in full and short (Vahid's term)
const BASELINE = 'OBR’s central forecast path';
const BASELINE_SHORT = 'forecast path';
const TICK_YEARS = [YEARS[0], SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR];
// the first year with the extra AI: every line and the range band start here
const I0 = YEARS.indexOf(SURPRISE_YEAR);

// The main arm's GDP path for each solved scenario at closure `cl`.
export const heroSeries = (cl) =>
  SCENARIOS.map((s) => {
    const r = S.results[s.id]?.tfp?.[cl];
    return r?.status === 'done'
      ? {
          id: s.id,
          name: SCEN_NAME[s.id],
          short: s.short ?? SCEN_NAME[s.id],
          y: r.gaps.Y,
          at: r.gaps.Y[YEARS.indexOf(HEADLINE_YEAR)],
        }
      : null;
  }).filter(Boolean);

// A line from year index `from` on (form (b): no segment before 2028).
const pathD = (ys, X, Y, from = 0) =>
  ys
    .slice(from)
    .map((v, i) => `${i ? 'L' : 'M'}${X(i + from).toFixed(1)},${Y(v).toFixed(1)}`)
    .join('');

// End labels (two lines each) pushed apart so none overlaps the next, kept
// between lo and hi.
function spread(items, gap, lo, hi) {
  const out = [...items].sort((a, b) => a.y - b.y).map((d) => ({ ...d }));
  for (let i = 1; i < out.length; i++) if (out[i].y - out[i - 1].y < gap) out[i].y = out[i - 1].y + gap;
  const over = out.length ? out[out.length - 1].y - hi : 0;
  if (over > 0) out.forEach((d) => (d.y -= over));
  for (let i = out.length - 2; i >= 0; i--) if (out[i + 1].y - out[i].y < gap) out[i].y = out[i + 1].y - gap;
  out.forEach((d) => (d.y = Math.max(lo, d.y)));
  return out;
}

// One drawing. `wide`: a right gutter holding the end labels; otherwise
// none (the legend row under the chart names the lines).
function Fan({ lines, sid, wide }) {
  const W = wide ? 640 : 480;
  // one row of guide labels above the plot (T)
  const H = wide ? 382 : 268;
  const fs = wide ? 13 : 15;
  const L = wide ? 46 : 50;
  const R = wide ? W - 176 : W - 16;
  const T = wide ? 46 : 52;
  const B = H - (wide ? 36 : 40);
  const all = lines.flatMap((l) => l.y);
  const top = Math.max(1, Math.ceil(Math.max(0, ...all)));
  const step = top > 4 ? 2 : 1;
  const hi = Math.ceil(top / step) * step;
  const lo = -hi * 0.1;
  const last = YEARS.length - 1;
  const X = (i) => L + (i / last) * (R - L);
  const XY = (yr) => X(YEARS.indexOf(yr));
  const Y = (v) => B - ((v - lo) / (hi - lo)) * (B - T);
  const ticks = [];
  for (let v = 0; v <= hi + 1e-9; v += step) ticks.push(v);
  const byId = Object.fromEntries(lines.map((l) => [l.id, l]));
  const low = byId.uk_low;
  const high = byId.uk_high;
  // the UK range from 2028 on: its left edge a vertical on the 2028 guide
  const band =
    low && high
      ? `${pathD(high.y, X, Y, I0)}L${low.y
          .map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`)
          .slice(I0)
          .reverse()
          .join('L')}Z`
      : null;
  const bandAt = YEARS.indexOf(LATE_YEAR - 2);
  const bandMid = band ? (Y(high.y[bandAt]) + Y((byId.uk_central ?? low).y[bandAt])) / 2 : 0;
  // end labels: two lines each, with clear space between blocks
  const labels = wide
    ? spread(
        lines.map((l) => ({ ...l, y: Y(l.y[last]) })),
        fs * 3,
        T,
        B - fs,
      )
    : [];
  const sel = byId[sid];
  // the chosen scenario drawn last, on top
  const order = [...lines].sort((a, b) => (a.id === sid) - (b.id === sid));
  const on = (l) => (l.id === sid ? ' is-on' : '');
  return (
    <svg
      className={`story-svg hf-svg ${wide ? 'is-wide' : 'is-narrow'}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`GDP gap against the ${BASELINE}, ${YEARS[0]} to ${YEARS[last]}, four scenarios, main version; each line starts in ${SURPRISE_YEAR}; before it every scenario is on the ${BASELINE_SHORT}`}
      style={{ '--hf-fs': `${fs}px` }}
    >
      <text className="hf-axis-title" data-axis-title="y" data-axis="" x={2} y={fs + 2}>
        {HERO_AXIS_TITLE}
      </text>
      {ticks.map((v) => (
        <g key={v} data-axis="">
          {v ? <line className="hf-grid" x1={L} x2={R} y1={Y(v)} y2={Y(v)} /> : null}
          {/* left-aligned on the axis title's edge: the result unit and the
              y labels share one left edge (polish D) */}
          <text className="hf-tick" x={2} y={Y(v)} dy="0.35em" textAnchor="start">
            {v ? `+${v}%` : '0%'}
          </text>
        </g>
      ))}
      <g data-axis="">
        {TICK_YEARS.map((yr) => (
          <text key={yr} className="hf-tick" x={XY(yr)} y={B + fs + 8} textAnchor="middle">
            {yr}
          </text>
        ))}
      </g>
      <g className="hf-ann" data-axis="">
        {/* one row: each label 5px right of its guide (the x ticks give the
            years); the guides end at the zero line, so the zero label under
            it crosses neither */}
        <line x1={XY(SURPRISE_YEAR)} x2={XY(SURPRISE_YEAR)} y1={T - 22} y2={Y(0)} />
        <text x={XY(SURPRISE_YEAR) + 5} y={T - 10} textAnchor="start">
          Extra AI starts
        </text>
        <line x1={XY(HEADLINE_YEAR)} x2={XY(HEADLINE_YEAR)} y1={T - 22} y2={Y(0)} />
        <text x={XY(HEADLINE_YEAR) + 5} y={T - 10} textAnchor="start">
          Extra AI in full
        </text>
      </g>
      <line className="hf-zero" x1={L} x2={R} y1={Y(0)} y2={Y(0)} />
      {/* at the left end, under the flat stretch before 2028 */}
      <text className="hf-zero-label" data-axis="" x={L} y={Y(0) + fs + 3} textAnchor="start">
        0 = {BASELINE_SHORT}, its own AI included
      </text>
      {band ? (
        <g className="hf-band-g">
          <path className="hf-band" d={band} />
          <text className="hf-band-label" data-axis="" x={X(bandAt)} y={bandMid} dy="0.35em" textAnchor="middle">
            UK range, low to high
          </text>
        </g>
      ) : null}
      {order.map((l) => (
        <path key={l.id} d={pathD(l.y, X, Y, I0)} className={`hf-line is-${LINE[l.id]}${on(l)}`} data-mark={l.id} />
      ))}
      {/* the chosen line's start: a hollow dot at its 2028 value */}
      {sel ? <circle className={`hf-dot-start is-${LINE[sel.id]}`} cx={X(I0)} cy={Y(sel.y[I0])} r={4} data-mark={sel.id} /> : null}
      {order.map((l) => (
        <circle key={l.id} className={`hf-dot is-${LINE[l.id]}${on(l)}`} cx={XY(HEADLINE_YEAR)} cy={Y(l.at)} r={l.id === sid ? 4.5 : 3.5} data-mark={l.id} />
      ))}
      {labels.map((l) => (
        <text key={l.id} className={`hf-end is-${LINE[l.id]}${on(l)}`} x={X(last) + 10} y={l.y - fs * 0.5}>
          {/* the trailing space keeps name and value apart for a screen
              reader (the value's own x places it; nothing moves) */}
          <tspan className="hf-end-name">{`${l.short} `}</tspan>
          <tspan x={X(last) + 10} dy={fs * 1.3} className="hf-end-value">
            {fmt(l.at)}
          </tspan>
        </text>
      ))}
    </svg>
  );
}

// The three stats, one anatomy each: name (its definition in the tip),
// value (two decimals, signed, neutral ink) and one short line. The pay
// line comes from the data (payLine: "slower growth, not a cut" only while
// pay still rises every year); national income's is part 2's ledger's.
// The headline year as years into the shock (2028 is year 1): the figures
// are level gaps that year, not growth rates.
export const YEARS_ON = HEADLINE_YEAR - SURPRISE_YEAR + 1;
export function heroStats(sid, cl) {
  const y = gap(sid, 'tfp', cl, 'Y');
  const w = gap(sid, 'tfp', cl, 'w');
  const g = gap(sid, 'tfp', cl, 'GNI');
  if (y == null || w == null) return null;
  const pay = payLine(sid, cl, w);
  return [
    {
      id: 'gdp',
      v: 'Y',
      name: 'GDP',
      x: y,
      line: 'produced in the UK',
      tip: `Gross domestic product: everything produced in the UK. A gap in the level, ${YEARS_ON} years on; not a growth rate.`,
    },
    {
      id: 'pay',
      v: 'w',
      name: 'Pay rates',
      x: w,
      line: pay,
      tip: [
        'Pay per unit of labour, adjusted for skill; not average earnings.',
        pay === 'slower growth, not a cut' ? 'A gap in the level: pay still rises every year, more slowly.' : null,
        w < -0.005 && paySigns(sid) === 'flips' ? 'With more foreign capital, the gap would be positive.' : null,
      ]
        .filter(Boolean)
        .join(' '),
    },
    g == null
      ? null
      : {
          id: 'gni',
          v: 'GNI',
          name: 'National income',
          x: g,
          line: 'GDP less net income paid abroad',
          // with no foreign capital, Y − GNI is the interest paid to gilt holders abroad
          tip:
            cl === BOUND
              ? 'Gross national income (GNI): the income UK residents keep. GDP less the income paid to gilt holders abroad.'
              : 'Gross national income (GNI): the income UK residents keep. GDP less the income paid to owners abroad.',
        },
  ].filter(Boolean);
}

export default function Hero() {
  const { st } = useNav();
  const sid = st.s;
  const cl = primaryClosure(st.closure);
  const lines = heroSeries(cl);
  const sel = lines.find((l) => l.id === sid);
  const stats = sel ? heroStats(sid, cl) : null;
  const closure = cl === BOUND ? 'no foreign capital' : 'some foreign capital';
  return (
    <section id="story-hero" className="story-hero hf" aria-labelledby="story-q">
      <div className="story-hero-text">
        <div className="hero">
          {/* the series name, small and quiet, above the question; then
              the question in two sentences: a lighter lead-in, then the
              question, which carries the weight */}
          <p className="hero-series">{PAGE_TITLE}</p>
          <h2 id="story-q" className="hero-q">
            <span className="hero-q-lead">AI is already here.</span> <span className="hero-q-main">What if, from {SURPRISE_YEAR}, it takes on more work than the OBR expects?</span>
          </h2>
        </div>
        <a className="story-scroll-cue" href="#story-part-1">
          <Icon name="arrowDown" size={16} /> Start with where the UK stands
        </a>
      </div>
      <figure className="story-hero-art hf-art hf-frame">
        <div className="hf-unit" role="group" aria-label={sel ? `The answer in ${HEADLINE_YEAR}, ${sel.name} scenario` : `The answer in ${HEADLINE_YEAR}`}>
          {/* the kicker: plain and muted, the figure's sources icon at its
              end. One line at every width: a figure under 480px drops the
              gap clause (the axis title under it says it), and Korinek's
              name, already a scenario's, goes without the word */}
          <p className="hf-kicker">
            {sel ? (
              <span className="hf-kicker-text">
                {sel.id === 'korinek' ? sel.short : `${sel.short} scenario`} · {HEADLINE_YEAR}
                <span className="hf-kicker-gap"> · gap to the {BASELINE_SHORT}</span> ·{' '}
              </span>
            ) : null}
            {/* the last words and the icon never part */}
            <span className="hf-kicker-end">
              {sel ? <span className="hf-kicker-text">not a forecast</span> : null}
              <SourceLine
                items={[
                  docItem('OG-UK runs', REPO, 'PolicyEngine'),
                  navItem('Method: the model', 'method', 'm-model'),
                  navItem('Part 2: the headline figures', 'story', 'story-headline'),
                  ...asOfItems(),
                ]}
                groups={[
                  {
                    title: 'How to read',
                    notes: [
                      {
                        icon: 'closure',
                        text: `Main version, ${closure} (chosen in the header).`,
                      },
                      {
                        icon: 'path',
                        text: (
                          <>
                            Extra AI beyond the OBR&rsquo;s starts in {SURPRISE_YEAR}, as a surprise, and is in full by {HEADLINE_YEAR}. Gaps are against the{' '}
                            <NavLink tab="method" anchor={METHOD.shock.id}>
                              OBR&rsquo;s central forecast path
                            </NavLink>
                            .
                          </>
                        ),
                      },
                    ],
                  },
                ]}
              />
            </span>
          </p>
          {stats ? (
            <dl className="hf-stats">
              {stats.map((m) => (
                <div key={m.id} className={`hf-stat is-${m.id}`}>
                  <dt className="hf-stat-name">
                    <TipTarget label={`What is ${m.name}?`} tip={<span>{m.tip}</span>}>
                      {m.name}
                    </TipTarget>
                  </dt>
                  <dd className="hf-stat-value">
                    <NavLink
                      tab="story"
                      anchor="story-headline"
                      className="hf-figure-value"
                      aria-label={`${m.name} ${fmt(m.x)} against the ${BASELINE} in ${HEADLINE_YEAR}: the headline figures in part 2`}
                    >
                      <span className="hf-num" data-path={`results.${sid}.tfp.${cl}.gaps.${m.v}.${HEADLINE_YEAR}`}>
                        {fmt(m.x)}
                      </span>
                    </NavLink>
                  </dd>
                  {m.line ? <dd className="hf-stat-line">{m.line}</dd> : null}
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <Fan lines={lines} sid={sid} wide />
        <Fan lines={lines} sid={sid} wide={false} />
        <ul className="hf-legend" aria-label={`The four scenarios, GDP gap in ${HEADLINE_YEAR}`}>
          {lines.map((l) => (
            <li key={l.id} className={`hf-chip is-${LINE[l.id]}${l.id === sid ? ' is-on' : ''}`} data-mark={l.id}>
              <span className="hf-swatch" aria-hidden="true" />
              <span className="hf-chip-name">{l.short}</span> <span className="hf-chip-value">{fmt(l.at)}</span>
            </li>
          ))}
        </ul>
      </figure>
    </section>
  );
}
