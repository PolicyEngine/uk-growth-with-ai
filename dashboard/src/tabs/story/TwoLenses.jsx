'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { useEntry, useSnap } from '@/components/story/motion.js';
import { CENTRAL, HEADLINE_YEAR, SCEN_NAME, SURPRISE_YEAR, YEARS, fmt, gap } from '@/tabs/ai/surprise.js';
import { D, MODEL_YEAR, PROVISIONAL } from './part3/shared.jsx';
import { REFS } from './part3/sources.jsx';
import { MEASURE, TABS } from '@/lib/labels.js';
import QStage from '@/components/story/QStage.jsx';
import SourceLine from '@/components/ui/SourceLine.jsx';
import { docItem, navItem } from '@/lib/sourceItems.js';

// The close of the story: Two lenses (two-lenses-design.md, with Fable's
// refinements B1-B8 in charts-finale-fable.md, and item 34's transition,
// Vahid's yes of 18 Nov). A centred opener: the kicker, the title, a
// two-line recap of the two models (their scope and years: these moved out
// of the circles) and one sign-aware reason they are never added. Then the
// figure: two overlapping circles, one per model, each its model name over
// its "can say" chips; the overlap is the public finances; each lens's
// "outside" chips sit just outside its rim. Under them the pay contrast: in
// OG-UK pay is a result, in uk-ai-study an input. The page ends on "What’s
// next": one linked line per tab.
//
// No new facts: the chips are the old table's content, each at most four
// words, and each "can say" chip is a real link to the scene where that
// result appears (real lists, one per lens, with headings). The two pay
// figures restate their homes: -1.27% (data-axis) is part 2's headline pay
// tile at UK central, some foreign capital, fixed whatever the header says;
// +2.6% is the study's quoted input (data-input). The circles and arrows
// are decorative (aria-hidden); the lists and cards are the content.
//
// Motion (reversible, the openers' scroll logic: useEntry): the lenses
// slide in from either side (on phones they fade only: item 35, nothing
// moves against the finger), the chips rise in turn, the overlap label and
// the pay row follow; it replays on every re-entry from above and is drawn
// final on a jump or reload (useSnap); static under reduced motion. The
// opener's recap and reason are static text.
const M = D.method;
const STUDY = `Household study${PROVISIONAL ? ' (provisional)' : ''}`;

// The close's question: shown big on the pinned screen; the header below is
// the title, so the question is not printed twice.
export const CLOSE_SUB = {
  title: 'Two lenses',
  icon: 'compare',
  question: 'What can each model say?',
  hint: 'The macro model for the whole economy over years; the household study for one year',
};

export const CLOSE_KICKER = 'Part 4 · Both models';
const LAST_YEAR = YEARS[YEARS.length - 1];

// (a) The recap: one line per model, led by its lens icon: its method and
// years, then why the story needs it (push D, Q2; Vahid: "say which model
// or method, say why we need each"), within the close's 25-word cap. Each
// claim is Method's or Household method's (the macro model's output, pay
// and public finances over the years; the study's tax-benefit model,
// deciles and poverty). No pay figure and no sign: the pay cards are that
// fact's home.
export const CLOSE_RECAP = [
  // `when` is kept on one line (a year range never splits at its dash)
  {
    id: 'oguk',
    icon: 'gdp',
    name: 'The macro model',
    rest: 'an overlapping-generations model of the UK economy,',
    when: `${SURPRISE_YEAR} to ${LAST_YEAR}`,
    end: ' and beyond.',
    why: 'Needed for output, pay and public finances over the years.',
  },
  {
    id: 'study',
    icon: 'households',
    name: 'The household study (PolicyEngine UK)',
    rest: 'a tax-benefit microsimulation of UK households in one year,',
    when: MODEL_YEAR,
    end: '.',
    why: 'Needed for income losses by decile, and poverty.',
  },
];

// The lenses' content (B2, B3, B6). `to`: the scene a chip links to.
export const LENSES = [
  {
    id: 'oguk',
    name: 'The macro model',
    icon: 'gdp',
    can: [
      { text: 'Output', to: 'p2-morph', scene: 'GDP, scenario by scenario' },
      // names from lib/labels.js MEASURE (R1-14)
      { text: MEASURE.w.name, to: 'story-headline', scene: 'the headline figures' },
      { text: MEASURE.NNI.name, to: 'story-output', scene: 'where output goes' },
      { text: 'Effects by birth year', to: 'p2-who', scene: 'gains and losses by generation' },
    ],
    outside: [
      { text: 'Unemployment', tip: 'Everyone who wants to work is employed' },
      { text: 'Forecasts of levels', tip: 'Results are gaps against the OBR’s central forecast path' },
    ],
  },
  {
    id: 'study',
    name: STUDY,
    icon: 'households',
    can: [
      { text: 'Who loses income', to: 'p3-deciles', scene: 'where the loss falls' },
      // the main case's second step lights poverty and the Gini together;
      // inequality has no scene or step of its own
      { text: 'Poverty', to: 'p3-central-step-2', scene: 'the main case' },
      { text: 'Inequality', to: 'p3-central-step-2', scene: 'the main case' },
    ],
    outside: [
      { text: 'Change over time', tip: 'The years after the first: recovery and prices' },
      { text: 'Whether jobs are lost', tip: 'Job loss is assumed' },
    ],
  },
];

// Where the overlap and the study's pay input link: the Story's
// public-finances scene, and the beat that sources the study's inputs.
export const FINANCES_TO = 'p3-channels';
export const PAY_INPUT_TO = 'beat-7pct';

// The OG-UK pay figure: UK central, some foreign capital, the headline year,
// fixed (B4).
const PAY_SID = 'uk_central';
export const PAY_RESULT = gap(PAY_SID, 'tfp', CENTRAL, 'w');

// (b) The reason, one sentence, sign-aware: "pay moves in opposite
// directions" only while the two pay figures differ in sign.
export function closeWhy(result = PAY_RESULT, input = Number(M.survivor_wage_pct)) {
  const pay = Math.sign(result) !== Math.sign(input) ? 'and pay moves in opposite directions' : 'and pay is a result in one and an input in the other';
  return `They differ in years and assumptions, ${pay}, so their numbers sit side by side and are never added or compared.`;
}
export const CLOSE_WHY = closeWhy();

// (c) What's next: one linked line per tab, the names from TABS (never the
// short form). The study paper and both repositories are on Method: Data
// and code links the repositories, Household method and Detail and
// sources the paper.
const tab = (id) => TABS.find((t) => t.id === id);
const sub = (t, id) => tab(t).subs.find((x) => x.id === id);
export const CLOSE_NEXT = [
  {
    tab: 'explore',
    sub: tab('explore').subs[0].id,
    icon: tab('explore').icon,
    name: tab('explore').label,
    rest: `the results by topic. ${tab('explore').subs.map((x, i) => (i ? x.label.toLowerCase() : x.label)).join(', ')}.`,
  },
  { tab: 'method', sub: 'how', icon: tab('method').icon, name: tab('method').label, rest: 'how each model works, every input and its source.' },
  { tab: 'method', sub: 'code', icon: sub('method', 'code').icon, name: sub('method', 'code').label, rest: 'the data files, the model code and how to rerun it.' },
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
        {lens.name}
      </h3>
      <h4 className="visually-hidden">{lens.name}: can say</h4>
      <ul className="lens-chips" aria-label={`${lens.name}: can say`}>
        {lens.can.map((c, i) => (
          <CanChip key={c.text} chip={c} i={i} />
        ))}
      </ul>
    </div>
  );
}

// What each lens leaves out: one plain muted line under it (18 Nov, Vahid:
// "nicer"; no dashed pills): an "outside" icon, "Leaves out:", then the
// items with a dot between, each with its tip.
function Outside({ lens }) {
  return (
    <div className={`lens-outside is-${lens.id}`}>
      <h4 className="visually-hidden">{lens.name}: outside this lens</h4>
      <div className="lens-out-line">
        <Icon name="eyeOff" size={14} className="lens-out-ic" />
        <span className="lens-out-label" aria-hidden="true">
          Leaves out:
        </span>
        <ul className="lens-chips is-outside" aria-label={`${lens.name}: outside this lens`}>
          {lens.outside.map((c) => (
            <li key={c.text} className="lens-out-li">
              <TipTarget className="lens-out-item" label={`${c.text}: outside this lens`} tip={<span>{c.tip}</span>}>
                {c.text}
              </TipTarget>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// The pay cards' sources, behind one button at the end of the pay row: the
// figures themselves are not restated (each has its home).
function LensSource() {
  return (
    <SourceLine
      items={[docItem(REFS.doorley.label, REFS.doorley.url, undefined, REFS.doorley.title), navItem('Part 2: the headline figures', 'story', 'story-headline')]}
      groups={[
        {
          title: 'How to read',
          notes: [
            {
              icon: 'gapUp',
              text: (
                <>
                  Pay for those still in work is an input of the study, after{' '}
                  <a href={REFS.doorley.url} target="_blank" rel="noopener noreferrer">
                    Doorley et al. (2026)
                  </a>
                </>
              ),
            },
            { icon: 'gapDown', text: `Pay rates are part 2’s headline pay-rate gap: ${SCEN_NAME[PAY_SID]}, some foreign capital, ${HEADLINE_YEAR}` },
          ],
        },
      ]}
    />
  );
}

export default function TwoLenses() {
  const [ref, entry] = useEntry({ line: 0.8 });
  const snap = useSnap(ref, entry);
  const [og, st] = LENSES;
  return (
    <section className="story-part story-close" id="story-close" aria-labelledby="story-close-h">
      <QStage id="story-close" question={CLOSE_SUB.question} hint={CLOSE_SUB.hint} icon="compare" keyWord="model" />
      <header className="part-opener close-opener" id="q-story-close">
        <p className="part-opener-meta">{CLOSE_KICKER}</p>
        <h2 id="story-close-h">{CLOSE_SUB.title}</h2>
        <ul className="close-recap">
          {CLOSE_RECAP.map((r) => (
            <li key={r.id}>
              <Icon name={iconFor(r.icon)} size={16} strokeWidth={1.8} className="close-ic" />
              <span>
                <strong>{r.name}</strong>: {r.rest} <span className="close-when">{r.when}</span>
                {r.end} {r.why}
              </span>
            </li>
          ))}
        </ul>
        <p className="close-why">{CLOSE_WHY}</p>
      </header>
      <figure
        ref={ref}
        className={`lens-fig story-frame${entry.entered ? ' is-in' : ''}${snap ? ' is-snap' : ''}`}
        aria-labelledby="story-close-h"
        data-hover-exempt="a diagram of what each model covers, no values; each item carries its own tip"
      >
        <div className="lens-venn">
          {/* item 35: the lens is 88px wide on desktop and 72px tall on
              phones, so the overlap label (on the 14px tick token) sits
              inside both rims */}
          <svg className="lens-rings" viewBox="0 0 508 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <circle className="lens-ring is-oguk" cx="150" cy="150" r="148" />
            <circle className="lens-ring is-study" cx="358" cy="150" r="148" />
          </svg>
          <svg className="lens-rings is-phone" viewBox="0 0 300 528" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <circle className="lens-ring is-oguk" cx="150" cy="150" r="148" />
            <circle className="lens-ring is-study" cx="150" cy="378" r="148" />
          </svg>
          <Lens lens={og} />
          {/* the overlap links to the Story's public-finances scene, the
              cost by channel (#p3-channels); OG-UK's debt path is on
              Explore, linked from the headline figures */}
          <p className="lens-overlap">
            <Icon name={iconFor('finances')} size={14} />{' '}
            <NavLink tab="story" anchor={FINANCES_TO} className="lens-overlap-link">
              The public finances
            </NavLink>
          </p>
          <Lens lens={st} />
          <Outside lens={og} />
          <Outside lens={st} />
        </div>
        <div className="lens-pay">
          <div className="lens-pay-card is-oguk">
            <p className="lens-pay-head">Pay is a result</p>
            <p className="lens-pay-fig">
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
              {/* the input's source: part 3's opening beat and its sources */}
              <NavLink tab="story" anchor={PAY_INPUT_TO} className="lens-pay-num" data-input="">
                +{Number(M.survivor_wage_pct)}%
              </NavLink>
            </p>
            <p className="lens-pay-sub">for those still in work</p>
          </div>
        </div>
        <div className="lens-pay-src">
          <LensSource />
        </div>
      </figure>
      <nav className="close-next" aria-labelledby="close-next-h">
        <p className="close-next-kicker" id="close-next-h">
          What’s next
        </p>
        <ul className="close-next-list">
          {CLOSE_NEXT.map((l) => (
            <li key={`${l.tab}-${l.sub}`}>
              <NavLink tab={l.tab} sub={l.sub} className="close-next-link">
                <Icon name={l.icon} size={16} strokeWidth={1.8} className="close-ic" />
                <span>
                  <strong>{l.name}</strong>: {l.rest}{' '}
                  <span className="close-next-arrow" aria-hidden="true">
                    →
                  </span>
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
