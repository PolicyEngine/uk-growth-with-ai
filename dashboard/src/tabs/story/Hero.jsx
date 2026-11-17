'use client';

import SourceLine from '@/components/ui/SourceLine.jsx';
import { docItem, navItem } from '@/lib/sourceItems.js';
import Icon from '@/components/ab/Icon.jsx';
import { METHOD } from '@/lib/labels.js';
import { NavLink, useNav } from '@/lib/nav.jsx';
import { REPO } from '@/tabs/ai/links.js';
import { heroItems } from '@/tabs/ai/Landing.jsx';
import { primaryClosure } from '@/tabs/ai/lines.js';
import { dirConcept } from '@/tabs/story/part2/dir.js';
import { BOUND, HEADLINE_YEAR, LATE_YEAR, S, SCENARIOS, SCEN_NAME, SURPRISE_YEAR, YEARS, fmt } from '@/tabs/ai/surprise.js';

// The first screen: the story's first question, its answer as one big
// figure (GDP against the OBR-central path in 2031 for the scenario and
// closure chosen in the header; its home is part 2's headline tiles,
// #story-headline, which it links to; the owner asked for it here too), and
// a chart of the four scenarios' GDP paths (main arm) over the whole
// horizon. The first frame is the final one: the figure is printed as it
// is (no count-up) and nothing fades or draws in. Each line is labelled
// with its name and its 2031 value: at the line end on desktop, as a legend
// row under the chart at 600px and below (two drawings; CSS shows one, so
// the hidden one's text is not read), so labels never collide. The 2031
// guide line names the year, so the end values do not repeat it.

// Korinek et al.'s US case is dashed (not calibrated to the UK)
const LINE = { uk_low: 'uk', uk_central: 'uk', uk_high: 'uk', korinek: 'us' };
export const HERO_AXIS_TITLE = 'GDP gap against the OBR-central path, %';
const TICK_YEARS = [YEARS[0], SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR];

// The main arm's GDP path for each solved scenario at closure `cl`.
export const heroSeries = (cl) =>
  SCENARIOS.map((s) => {
    const r = S.results[s.id]?.tfp?.[cl];
    return r?.status === 'done' ? { id: s.id, name: SCEN_NAME[s.id], y: r.gaps.Y, at: r.gaps.Y[YEARS.indexOf(HEADLINE_YEAR)] } : null;
  }).filter(Boolean);

const pathD = (ys, X, Y) => ys.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');

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
  const H = wide ? 400 : 300;
  const fs = wide ? 13 : 15;
  const L = wide ? 46 : 50;
  const R = wide ? W - 176 : W - 16;
  const T = wide ? 64 : 84;
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
  const band = low && high
    ? `${pathD(high.y, X, Y)}L${low.y
        .map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`)
        .reverse()
        .join('L')}Z`
    : null;
  const bandAt = YEARS.indexOf(LATE_YEAR - 2);
  const bandMid = band ? (Y(high.y[bandAt]) + Y((byId.uk_central ?? low).y[bandAt])) / 2 : 0;
  const labels = wide ? spread(lines.map((l) => ({ ...l, y: Y(l.y[last]) })), fs * 2.6, T, B - fs) : [];
  // the chosen scenario drawn last, on top
  const order = [...lines].sort((a, b) => (a.id === sid) - (b.id === sid));
  const on = (l) => (l.id === sid ? ' is-on' : '');
  return (
    <svg
      className={`story-svg hf-svg ${wide ? 'is-wide' : 'is-narrow'}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`GDP gap against the OBR-central path, ${YEARS[0]} to ${YEARS[last]}, four scenarios, main arm`}
      style={{ '--hf-fs': `${fs}px` }}
    >
      <text className="hf-axis-title" data-axis-title="y" data-axis="" x={2} y={fs + 2}>
        {HERO_AXIS_TITLE}
      </text>
      {ticks.map((v) => (
        <g key={v} data-axis="">
          {v ? <line className="hf-grid" x1={L} x2={R} y1={Y(v)} y2={Y(v)} /> : null}
          <text className="hf-tick" x={L - 8} y={Y(v)} dy="0.35em" textAnchor="end">
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
        <line x1={XY(SURPRISE_YEAR)} x2={XY(SURPRISE_YEAR)} y1={T - (wide ? 22 : 46)} y2={B} />
        <text x={XY(SURPRISE_YEAR) + (wide ? -5 : 5)} y={T - (wide ? 10 : 32)} textAnchor={wide ? 'end' : 'start'}>
          AI arrives, {SURPRISE_YEAR}
        </text>
        <line x1={XY(HEADLINE_YEAR)} x2={XY(HEADLINE_YEAR)} y1={T - 22} y2={B} />
        <text x={XY(HEADLINE_YEAR) + 5} y={T - 10}>
          Shock complete, {HEADLINE_YEAR}
        </text>
      </g>
      <line className="hf-zero" x1={L} x2={R} y1={Y(0)} y2={Y(0)} />
      <text className="hf-zero-label" data-axis="" x={XY(HEADLINE_YEAR) + 6} y={Y(0) + fs + 3}>
        OBR-central path = 0
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
        <path key={l.id} d={pathD(l.y, X, Y)} className={`hf-line is-${LINE[l.id]}${on(l)}`} data-mark={l.id} />
      ))}
      {order.map((l) => (
        <circle key={l.id} className={`hf-dot is-${LINE[l.id]}${on(l)}`} cx={XY(HEADLINE_YEAR)} cy={Y(l.at)} r={l.id === sid ? 4.5 : 3.5} data-mark={l.id} />
      ))}
      {labels.map((l) => (
        <text key={l.id} className={`hf-end is-${LINE[l.id]}${on(l)}`} x={X(last) + 10} y={l.y - fs * 0.5}>
          <tspan className="hf-end-name">{l.name}</tspan>
          <tspan x={X(last) + 10} dy={fs * 1.3} className="hf-end-value">
            {fmt(l.at)}
          </tspan>
        </text>
      ))}
    </svg>
  );
}

export default function Hero() {
  const { st } = useNav();
  const sid = st.s;
  const cl = primaryClosure(st.closure);
  const lines = heroSeries(cl);
  const sel = lines.find((l) => l.id === sid);
  const items = heroItems(sid, cl);
  // the first item gives GDP's direction, which the figure shows; the
  // next ones then name the path they compare with, not "it"
  const rest = sel ? items.slice(1).map((it) => ({ ...it, text: String(it.text).replace(/ it( too)?$/, ' the OBR-central path$1') })) : items;
  const tone = dirConcept(sel?.at) === 'gapUp' ? 'is-gain' : dirConcept(sel?.at) === 'gapDown' ? 'is-loss' : '';
  const closure = cl === BOUND ? 'closed capital' : 'central closure';
  return (
    <section id="story-hero" className="story-hero hf" aria-labelledby="story-q">
      <div className="story-hero-text">
        <div className="hero">
          <h2 id="story-q" className="hero-q">
            What happens to the UK economy if AI arrives in {SURPRISE_YEAR}?
          </h2>
          {sel ? (
            <div className="hf-figure">
              <NavLink tab="story" anchor="story-headline" className={`hf-figure-value ${tone}`} aria-label={`GDP ${fmt(sel.at)} against the OBR-central path in ${HEADLINE_YEAR}: the headline figures in part 2`}>
                <span data-path={`results.${sid}.tfp.${cl}.gaps.Y.${HEADLINE_YEAR}`}>{fmt(sel.at)}</span>
              </NavLink>
              <p className="hf-figure-label">
                GDP against the{' '}
                <NavLink tab="method" anchor={METHOD.shock.id}>
                  OBR-central path
                </NavLink>{' '}
                in {HEADLINE_YEAR}
                <span className="hf-figure-meta">
                  {sel.name} scenario, {closure}: a scenario result, not a forecast
                </span>
              </p>
            </div>
          ) : null}
          {rest.map((it) => (
            <p key={it.text} className="hero-a hf-statement">
              {it.text}.
            </p>
          ))}
        </div>
        <a className="story-scroll-cue" href="#story-part-1">
          <Icon name="arrowDown" size={16} /> Start with where the UK stands
        </a>
      </div>
      <figure className="story-hero-art hf-art">
        <Fan lines={lines} sid={sid} wide />
        <Fan lines={lines} sid={sid} wide={false} />
        <ul className="hf-legend" aria-label={`The four scenarios, GDP gap in ${HEADLINE_YEAR}`}>
          {lines.map((l) => (
            <li key={l.id} className={`hf-chip is-${LINE[l.id]}${l.id === sid ? ' is-on' : ''}`} data-mark={l.id}>
              <span className="hf-swatch" aria-hidden="true" />
              <span className="hf-chip-name">{l.name}</span> <span className="hf-chip-value">{fmt(l.at)}</span>
            </li>
          ))}
        </ul>
        <figcaption className="hf-src">
          <SourceLine
            items={[docItem('OG-UK runs', REPO, 'PolicyEngine'), navItem('Method: the model', 'method', 'm-model')]}
            notes={[`Main arm, ${closure}.`]}
          />
        </figcaption>
      </figure>
    </section>
  );
}
