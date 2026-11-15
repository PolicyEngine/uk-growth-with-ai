'use client';

import Icon from '@/components/ab/Icon.jsx';
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
  // pushed apart so they never overlap; the zero line is named too.
  const LH = 24;
  const names = SCENARIOS.map((sc) => {
    const r = S.results[sc.id]?.tfp?.[CENTRAL];
    return r?.status === 'done' ? { id: sc.id, y: Y(r.gaps.Y[r.gaps.Y.length - 1]) } : null;
  })
    .filter(Boolean)
    .sort((p, q) => p.y - q.y);
  names.forEach((n, i) => {
    if (i && n.y < names[i - 1].y + LH) n.y = names[i - 1].y + LH;
  });
  const zeroY = Y(0);
  const last = names[names.length - 1];
  const zeroLabelY = last && Math.abs(last.y - (zeroY + 22)) < LH ? last.y + LH : zeroY + 22;
  return (
    <section className="story-hero" aria-labelledby="story-q">
      <div className="story-hero-text">
        <SummaryQuestion sid={st.s} titleId="story-q" />
        <p className="story-hero-lead">
          Below: where the UK economy and labour market stand as AI arrives, what a model of the whole economy projects, and what a model
          of households finds for incomes, poverty and the public finances if a share of employees are assumed to lose their jobs.
        </p>
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
          {names.map((n) => (
            <text key={n.id} x={X(YEARS.length - 1) + 8} y={n.y} dy="0.35em" className="hero-name">
              {SCEN_NAME[n.id]}
            </text>
          ))}
          <text x={X(YEARS.length - 1) + 8} y={zeroLabelY} className="hero-name is-zero">
            OBR-central path
          </text>
          <text x={X(xs) + 6} y={H - 26} className="hero-name is-zero">
            AI arrives, {SURPRISE_YEAR}
          </text>
        </svg>
        <p className="story-source">
          Every modelled GDP path against the OBR-central path (the flat line): four scenarios, three arms, two closures, closed capital
          dashed; each scenario named at the end of its main arm. OG-UK, PolicyEngine. Shape only; the figures are in part 2.
        </p>
      </div>
    </section>
  );
}
