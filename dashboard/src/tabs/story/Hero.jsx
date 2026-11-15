'use client';

import Icon from '@/components/ab/Icon.jsx';
import { useNav } from '@/lib/nav.jsx';
import { SummaryQuestion } from '@/tabs/ai/Landing.jsx';
import { S, YEARS, SURPRISE_YEAR, ARMS, ARM_COLOR, CENTRAL, BOUND, SCENARIOS } from '@/tabs/ai/surprise.js';

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
  const X = (i) => 20 + (i / (YEARS.length - 1)) * (W - 40);
  const Y = (v) => Y0(lo, hi, v);
  const d = (ys) => ys.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const xs = YEARS.indexOf(SURPRISE_YEAR);
  function Y0(a, b, v = 0) {
    return H - 30 - ((v - a) / (b - a)) * (H - 60);
  }
  return (
    <section className="story-hero" aria-labelledby="story-q">
      <div className="story-hero-text">
        <SummaryQuestion sid={st.s} titleId="story-q" />
        <p className="story-hero-lead">
          Below: where the UK economy and labour market stand as AI arrives, what a model of the whole economy projects, and what a model
          of households finds for incomes, poverty and the public finances if a share of employees lose their jobs.
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
        </svg>
        <p className="story-source">
          Every modelled GDP path against the OBR-central path: four scenarios, three arms, two closures, closed capital dashed. OG-UK,
          PolicyEngine. Shape only; the figures are in part 2.
        </p>
      </div>
    </section>
  );
}
