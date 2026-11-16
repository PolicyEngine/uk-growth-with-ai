'use client';

import Icon from '@/components/ab/Icon.jsx';
import { Items } from '@/components/story/Items.jsx';
import { useNav } from '@/lib/nav.jsx';
import { SummaryQuestion } from '@/tabs/ai/Landing.jsx';
import { S, YEARS, SURPRISE_YEAR, ARMS, ARM_COLOR, CENTRAL, BOUND, SCENARIOS, SCEN_NAME } from '@/tabs/ai/surprise.js';

// The first screen: the question and the one-line answer for the scenario
// and closure in the header, beside an image of every modelled GDP path
// (four scenarios, three arms, two closures) leaving the OBR-central path
// together in 2028 and fanning out to 2036. The image is art, not a chart:
// no values, the figures are in part 2. It is static: nothing plays by
// itself on the story. The drawing is hidden from screen readers; the
// caption under it says what it shows.
const W = 640;
const H = 420;

export default function Hero() {
  const { st } = useNav();
  const lines = [];
  for (const s of SCENARIOS)
    for (const a of ARMS)
      for (const cl of [CENTRAL, BOUND]) {
        const r = S.results[s.id]?.[a.id]?.[cl];
        if (r?.status === 'done') lines.push({ key: `${s.id}-${a.id}-${cl}`, arm: a.id, cl, y: r.gaps.Y });
      }
  const all = lines.flatMap((l) => l.y);
  const lo = Math.min(-1, ...all);
  const hi = Math.max(1, ...all);
  // a right gutter for the four scenario names
  const X = (i) => 20 + (i / (YEARS.length - 1)) * (W - 150);
  const Y = (v) => Y0(lo, hi, v);
  const d = (ys) => ys.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const xs = YEARS.indexOf(SURPRISE_YEAR);
  function Y0(a, b, v = 0) {
    return H - 30 - ((v - a) / (b - a)) * (H - 60);
  }
  // Scenario names at the end of each main-arm, central-closure line,
  // pushed apart so they never overlap; the zero line is named too. Two
  // sets, wide and narrow (larger type in a
  // narrower plot) a name with a bracket breaks before it and the zero
  // label is shortened, so every label stays inside the drawing. CSS shows
  // one set (story.css, .hero-names).
  const ends = SCENARIOS.map((sc) => {
    const r = S.results[sc.id]?.tfp?.[CENTRAL];
    return r?.status === 'done' ? { id: sc.id, y0: Y(r.gaps.Y[r.gaps.Y.length - 1]) } : null;
  })
    .filter(Boolean)
    .sort((p, q) => p.y0 - q.y0);
  const zeroY = Y(0);
  const layout = (lh, split) => {
    const out = ends.map((e) => {
      const name = SCEN_NAME[e.id];
      const cut = split ? name.indexOf(' (') : -1;
      const parts = cut > 0 ? [name.slice(0, cut), name.slice(cut + 1)] : [name];
      return { id: e.id, y: e.y0, parts };
    });
    // a two-line name sits half a line above and below its line end
    const top = (n) => n.y - ((n.parts.length - 1) * lh) / 2;
    const bottom = (n) => n.y + ((n.parts.length - 1) * lh) / 2;
    out.forEach((n, i) => {
      if (i && top(n) < bottom(out[i - 1]) + lh) n.y += bottom(out[i - 1]) + lh - top(n);
    });
    const last = out[out.length - 1];
    const zero = last && Math.abs(bottom(last) - (zeroY + 22)) < lh ? bottom(last) + lh : zeroY + 22;
    return { names: out, zero, top };
  };
  // names with a bracket break before it at every width: one line ran past
  // the drawing's edge at 1440
  const wide = layout(24, true);
  const narrow = layout(20, true);
  const nameSet = ({ names, zero, top }, cls, lh, zeroText) => (
    <g className={`hero-names ${cls}`}>
      {names.map((n) => (
        <text key={n.id} x={X(YEARS.length - 1) + 8} y={top(n)} dy="0.35em" className="hero-name">
          {n.parts.map((t, i) => (
            <tspan key={t} x={X(YEARS.length - 1) + 8} dy={i ? lh : undefined}>
              {t}
            </tspan>
          ))}
        </text>
      ))}
      <text x={W - 2} y={zero} textAnchor="end" className="hero-name is-zero">
        {zeroText}
      </text>
    </g>
  );
  return (
    <section className="story-hero" aria-labelledby="story-q">
      <div className="story-hero-text">
        <SummaryQuestion sid={st.s} titleId="story-q" />
        <p className="story-hero-lead">Below, in three parts:</p>
        <Items
          className="hero-parts"
          items={[
            { icon: 'record', text: <a href="#story-part-1">Where the UK economy and labour market stand</a> },
            { icon: 'model', text: <a href="#story-part-2">What a model of the whole economy projects</a> },
            { icon: 'households', text: <a href="#story-part-3">Incomes, poverty, public finances, if some jobs are assumed lost</a> },
          ]}
        />
        <a className="story-scroll-cue" href="#story-part-1">
          <Icon name="arrowDown" size={16} /> Start with where the UK stands
        </a>
      </div>
      <div className="story-hero-art">
        <svg className="story-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <line x1={X(0)} x2={X(YEARS.length - 1)} y1={Y(0)} y2={Y(0)} stroke="var(--pe-gray-300)" />
          <line x1={X(xs)} x2={X(xs)} y1={20} y2={H - 20} stroke="var(--pe-gray-300)" strokeDasharray="3 4" />
          {lines.map((l) => (
            <path
              key={l.key}
              d={d(l.y)}
              className="hero-path"
              stroke={ARM_COLOR[l.arm]}
              strokeWidth={l.cl === CENTRAL ? 2 : 1.25}
              strokeDasharray={l.cl === BOUND ? '4 3' : undefined}
              opacity={l.cl === CENTRAL ? 0.85 : 0.45}
            />
          ))}
          {nameSet(wide, 'is-wide', 24, 'OBR-central path')}
          {nameSet(narrow, 'is-narrow', 20, 'OBR path')}
          <text x={X(xs) + 6} y={H - 26} className="hero-name is-zero">
            AI arrives, {SURPRISE_YEAR}
          </text>
        </svg>
        <Items
          className="hero-key"
          items={[
            { icon: 'path', text: 'Every modelled GDP path, against the OBR-central path (flat)' },
            { icon: 'range', text: 'Four scenarios, three arms, two closures' },
            { icon: 'closure', text: 'Closed capital dashed; names at each main arm’s end' },
            { icon: 'caveat', text: 'Shape only: the figures are in part 2' },
          ]}
        />
        <p className="story-source">Source: OG-UK, PolicyEngine.</p>
      </div>
    </section>
  );
}
