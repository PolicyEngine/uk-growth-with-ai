'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { useEntry, useSnap } from '@/components/story/motion.js';
import { CENTRAL, HEADLINE_YEAR, SCEN_NAME, SURPRISE_YEAR, YEARS, fmt, gap } from '@/tabs/ai/surprise.js';
import { D, MODEL_YEAR, PROVISIONAL } from './part3/shared.jsx';
import { PAPER_URL, REFS, REPO_URL } from './part3/sources.jsx';
import QStage from '@/components/story/QStage.jsx';

// The close of the story: Two lenses (two-lenses-design.md, with Fable's
// refinements B1-B8 in charts-finale-fable.md). Two overlapping circles,
// one per model, each holding its kicker, scope, time scope and the "can
// say" chips; the overlap is the public finances; each lens's "outside"
// chips sit just outside its rim. Under them the pay contrast: in OG-UK pay
// is a result, in uk-ai-study an input, in opposite directions. One
// closing line, then the "Go deeper" links.
//
// No new facts: the chips are the old table's content, each at most four
// words, and each "can say" chip is a real link to the scene where that
// result appears (real lists, one per lens, with headings). The two pay
// figures restate their homes: -1.27% (data-axis) is part 2's headline pay
// tile at UK central, central closure, fixed whatever the header says;
// +2.6% is the study's quoted input (data-input). The circles and arrows
// are decorative (aria-hidden); the lists and cards are the content.
//
// Motion (reversible, the openers' scroll logic: useEntry): the lenses
// slide in from either side, the chips rise in turn, the overlap label,
// the pay row and the closing line follow; it replays on every re-entry
// from above and is drawn final on a jump or reload (useSnap); static
// under reduced motion.
const M = D.method;
const STUDY = `uk-ai-study${PROVISIONAL ? ' (provisional)' : ''}`;

// The close's question: shown big on the pinned screen; the header below is
// the title, so the question is not printed twice.
export const CLOSE_SUB = {
  title: 'Two lenses',
  icon: 'compare',
  question: 'What can each model say?',
};

export const CLOSE_LINE = 'Different models, years and assumptions, including opposite pay directions: their numbers are not added or compared.';

// The lenses' content (B2, B3, B6). `to`: the scene a chip links to.
export const LENSES = [
  {
    id: 'oguk',
    name: 'OG-UK',
    icon: 'gdp',
    scope: 'The whole economy',
    time: `${SURPRISE_YEAR} to ${YEARS[YEARS.length - 1]} and beyond`,
    can: [
      { text: 'Output', to: 'p2-morph', scene: 'GDP, scenario by scenario' },
      { text: 'Pay rates', to: 'story-headline', scene: 'the headline figures' },
      { text: 'National income', to: 'story-output', scene: 'where output goes' },
      { text: 'Effects by birth year', to: 'p2-who', scene: 'gains and losses by generation' },
    ],
    outside: [
      { text: 'Unemployment', tip: 'Everyone who wants to work is employed' },
      { text: 'Forecasts of levels', tip: 'Results are gaps against the OBR-central path' },
    ],
  },
  {
    id: 'study',
    name: STUDY,
    icon: 'households',
    scope: 'UK households',
    time: `One year, ${MODEL_YEAR}`,
    can: [
      { text: 'Who loses income', to: 'p3-deciles', scene: 'where the loss falls' },
      { text: 'Poverty', to: 'p3-central', scene: 'the central case' },
      { text: 'Inequality', to: 'p3-central', scene: 'the central case' },
    ],
    outside: [
      { text: 'Change over time', tip: 'Recovery, re-employment, prices' },
      { text: 'Whether jobs are lost', tip: 'Job loss is assumed' },
    ],
  },
];

// The OG-UK pay figure: UK central, central closure, the headline year,
// fixed (B4).
const PAY_SID = 'uk_central';
export const PAY_RESULT = gap(PAY_SID, 'tfp', CENTRAL, 'w');

// Six links at most, plain text.
const DEEPER = [
  {
    nav: { tab: 'explore', sub: 'economy' },
    label: 'Explore the OG-UK results',
  },
  {
    nav: { tab: 'explore', sub: 'households' },
    label: 'Explore the household results',
  },
  { nav: { tab: 'method', sub: 'how' }, label: 'Method and sources' },
  {
    href: PAPER_URL,
    label: PROVISIONAL ? 'The study’s draft paper (PDF)' : 'The study’s paper (PDF)',
  },
  { href: REPO_URL, label: 'Code: uk-ai-study' },
  { href: REFS.oguk.url, label: 'Code: uk-growth-with-ai' },
];

// A "can say" chip: a link to its scene; hover or focus says where it goes.
function CanChip({ chip, i }) {
  const [hot, setHot] = useState(false);
  return (
    <li className="lens-chip-li" style={{ '--i': i }}>
      <NavLink
        tab="story"
        anchor={chip.to}
        className="lens-chip"
        onMouseEnter={() => setHot(true)}
        onMouseLeave={() => setHot(false)}
        onFocus={() => setHot(true)}
        onBlur={() => setHot(false)}
      >
        {chip.text}
      </NavLink>
      {hot ? (
        <span className="lens-chip-where" role="tooltip">
          In the story: {chip.scene}
        </span>
      ) : null}
    </li>
  );
}

function Lens({ lens }) {
  const h = `lens-${lens.id}-h`;
  return (
    <div className={`lens-circle is-${lens.id}`}>
      <h3 className="lens-kicker" id={h}>
        <Icon name={iconFor(lens.icon)} size={14} /> {lens.name}
      </h3>
      <p className="lens-scope">{lens.scope}</p>
      <p className="lens-time">{lens.time}</p>
      <h4 className="visually-hidden">{lens.name}: can say</h4>
      <ul className="lens-chips" aria-label={`${lens.name}: can say`}>
        {lens.can.map((c, i) => (
          <CanChip key={c.text} chip={c} i={i} />
        ))}
      </ul>
    </div>
  );
}

function Outside({ lens }) {
  return (
    <div className={`lens-outside is-${lens.id}`}>
      <h4 className="visually-hidden">{lens.name}: outside this lens</h4>
      <ul className="lens-chips is-outside" aria-label={`${lens.name}: outside this lens`}>
        {lens.outside.map((c) => (
          <li key={c.text} className="lens-chip-li">
            <TipTarget className="lens-chip is-outside" label={`${c.text}: outside this lens`} tip={<span>{c.tip}</span>}>
              {c.text}
            </TipTarget>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TwoLenses() {
  const [ref, entry] = useEntry({ line: 0.8 });
  const snap = useSnap(ref, entry);
  const [og, st] = LENSES;
  return (
    <section className="story-part story-close" id="story-close" aria-labelledby="story-close-h">
      <QStage id="story-close" question={CLOSE_SUB.question} icon="compare" keyWord="model" />
      <header className="story-part-head" id="q-story-close">
        <h2 id="story-close-h">{CLOSE_SUB.title}</h2>
      </header>
      {/* SOURCES: move into notes icon: "+2.6% for those still in work is an
          input, after Doorley et al. (2026)" (REFS.doorley.url); "−1.27% is
          part 2's headline pay-rate gap, UK central, central closure, 2031". */}
      <figure ref={ref} className={`lens-fig story-frame${entry.entered ? ' is-in' : ''}${snap ? ' is-snap' : ''}`} aria-labelledby="story-close-h">
        <div className="lens-venn">
          <svg className="lens-rings" viewBox="0 0 540 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <circle className="lens-ring is-oguk" cx="150" cy="150" r="148" />
            <circle className="lens-ring is-study" cx="390" cy="150" r="148" />
          </svg>
          <svg className="lens-rings is-phone" viewBox="0 0 300 552" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <circle className="lens-ring is-oguk" cx="150" cy="150" r="148" />
            <circle className="lens-ring is-study" cx="150" cy="402" r="148" />
          </svg>
          <Lens lens={og} />
          <p className="lens-overlap">
            <Icon name={iconFor('finances')} size={14} /> The public finances
          </p>
          <Lens lens={st} />
          <Outside lens={og} />
          <Outside lens={st} />
        </div>
        <div className="lens-pay">
          <div className="lens-pay-card is-oguk">
            <p className="lens-pay-head">Pay is a result</p>
            <p className="lens-pay-fig">
              <Icon name={iconFor('gapDown')} size={18} strokeWidth={2.25} />
              <NavLink tab="story" anchor="story-headline" className="lens-pay-num" data-axis="">
                {fmt(PAY_RESULT)}
              </NavLink>
            </p>
            <p className="lens-pay-sub">
              pay rates, {SCEN_NAME[PAY_SID]}, {HEADLINE_YEAR}
            </p>
          </div>
          <span className="lens-pay-arrow" aria-hidden="true">
            <Icon name="arrowLeftRight" size={18} />
          </span>
          <div className="lens-pay-card is-study">
            <p className="lens-pay-head">Pay is an input</p>
            <p className="lens-pay-fig">
              <Icon name={iconFor('gapUp')} size={18} strokeWidth={2.25} />
              <span className="lens-pay-num" data-input="">
                +{Number(M.survivor_wage_pct)}%
              </span>
            </p>
            <p className="lens-pay-sub">for those still in work</p>
          </div>
        </div>
        <p className="lens-close">{CLOSE_LINE}</p>
      </figure>
      <p className="lens-deeper">
        <span className="lens-deeper-label">Go deeper</span>
        {DEEPER.map((l) =>
          l.nav ? (
            <NavLink key={l.label} tab={l.nav.tab} sub={l.nav.sub}>
              {l.label}
            </NavLink>
          ) : (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ),
        )}
      </p>
    </section>
  );
}
