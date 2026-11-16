'use client';

import { useState } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtBn, fmtPp } from './format.js';
import { AxisTitle, D, FigureHead, Key, MarkProvider, Num, NumMarker, Source, rule, entryClass, useBeat, asLines } from './shared.jsx';
import { Ref } from './sources.jsx';

// Step 5, who loses the job: the cost under the four stylised displacement
// rules (results.tex, "Who loses the job"). The exposure rule is the central
// case, whose cost is printed in step 1: its label links there and its bar
// carries no value. The
// top-loaded stress test, and every rule's poverty and Gini change, are on
// Explore > Households.

const ROWS = [
  { id: 'uniform', label: 'Uniform: every employee equally likely' },
  {
    id: 'junior',
    label: 'Tilted towards workers aged 16 to 24, after ',
    ref: 'klein',
  },
  {
    id: 'exposure',
    label: 'In proportion to AI exposure: the central case',
    same: true,
  },
  {
    id: 'compression',
    label: 'Expertise compression (the study’s rule, after ',
    close: '): exposed higher earners',
    ref: 'autor',
  },
];
// Both panels start at zero: the finding is that cost differs about
// fivefold across rules while the poverty rise hardly moves.
const MAXC = Math.max(...ROWS.map((r) => rule(r.id).cost_bn)) * 1.12;
const MAXP = Math.max(...ROWS.map((r) => rule(r.id).poverty_pp)) * 1.12;
const NAME = {
  uniform: 'Uniform',
  junior: 'Junior-tilted',
  exposure: 'Exposure-based',
  compression: 'Expertise-compression',
};

// The card's claims, from the data (part3.test.jsx).
export function rulesClaims() {
  const rs = ROWS.map((r) => rule(r.id));
  const cheap = rs.reduce((a, b) => (b.cost_bn < a.cost_bn ? b : a));
  const central = rule('exposure');
  const spread = Math.max(...rs.map((r) => r.cost_bn)) - Math.min(...rs.map((r) => r.cost_bn));
  const pov = cheap.poverty_pp > central.poverty_pp ? 'more' : cheap.poverty_pp < central.poverty_pp ? 'less' : 'as much';
  // "slightly" when the gap is within one standard deviation of the central
  // poverty rise across draws (claim audit P3-33)
  const slight = Math.abs(cheap.poverty_pp - central.poverty_pp) < (D.headline.central_poverty.sd ?? 0) ? 'slightly ' : '';
  // the cost's spread relative to its smallest value, against the poverty
  // rise's: "far more" when the cost varies at least twice as much
  const rel = (xs) => (Math.max(...xs) - Math.min(...xs)) / Math.min(...xs);
  const costFar = rel(rs.map((r) => r.cost_bn)) > 2 * rel(rs.map((r) => r.poverty_pp));
  return {
    costFar,
    cheapest: cheap.id,
    spreadWords: spread >= 2 ? 'by several billion pounds a year' : 'by less than two billion pounds a year',
    cheapText:
      cheap.id === 'exposure'
        ? 'The central case costs least'
        : `${NAME[cheap.id]} costs least ${pov === 'more' ? 'but' : 'and'} raises poverty ${pov === 'as much' ? '' : slight}${pov}${pov === 'as much' ? ' as' : ' than'} the central case`,
  };
}

// One row per rule: the cost dot (value printed; the exposure rule is the
// central case, a ring linking to step 1), then a position-only poverty
// dot. Each rule's poverty figure has its home on Explore > Households; the
// read-out below is mounted only while the dot is hovered or focused.
function PovertyDot({ id, d, on }) {
  const [tip, setTip] = useState(false);
  return (
    <span
      className={`p3-dot p3-dot-pov${id === 'exposure' ? ' is-ring' : ''}`}
      data-mark={`poverty ${id}`}
      style={{ left: on ? `${(d.poverty_pp / MAXP) * 100}%` : 0 }}
      tabIndex={on ? 0 : -1}
      role="img"
      aria-label={`${NAME[id]}: poverty rise, position only; values on Explore`}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
      onFocus={() => setTip(true)}
      onBlur={() => setTip(false)}
      onKeyDown={(ev) => ev.key === 'Escape' && setTip(false)}
    >
      {tip ? (
        <span className="p3-tip" role="status">
          {fmtPp(d.poverty_pp)}
        </span>
      ) : null}
    </span>
  );
}

// The dots slide in from zero along their axes on entry (positions only;
// each cost value fades in once its dot lands).
function RulesFigure({ ctx }) {
  const { attach, ...e } = useBeat(ctx?.entered ?? true);
  return (
    <figure ref={attach} className={entryClass(e, 'p3-figure p3-scene')}>
      <FigureHead
        icon="scenario"
        title="Who is displaced: cost, and the poverty rise"
        x="Rule for who is displaced"
        unit={`Both axes from zero. ${rule('uniform').draws} paired draws per rule`}
        replay={e.replay}
      />
      <div className="p3-dp-heads">
        <span>
          <AxisTitle axis="y">Cost, £bn a year</AxisTitle>
        </span>
        <span>
          <AxisTitle axis="y">Absolute poverty, change, percentage points</AxisTitle>
        </span>
      </div>
      <ol className="p3-dp">
        {ROWS.map((r, i) => {
          const d = rule(r.id);
          return (
            <li key={r.id} className="p3-dp-row" data-row={r.id} style={{ '--beat': `${i * 120}ms` }}>
              <span className="p3-row-label">
                {r.id === CLAIMS.cheapest && r.id !== 'exposure' ? <NumMarker n={1} /> : null} {r.label}
                {r.ref ? <Ref id={r.ref} /> : null}
                {r.close ?? null}
              </span>
              <span className="p3-dp-track">
                <span className={`p3-dot p3-dot-cost${r.same ? ' is-ring' : ''}`} data-mark={`cost ${r.id}`} style={{ left: e.on ? `${(d.cost_bn / MAXC) * 100}%` : 0 }}>
                  {r.same ? null : <span className={`p3-dot-val${d.cost_bn / MAXC > 0.6 ? ' is-left' : ''}`}>{fmtBn(d.cost_bn)}</span>}
                </span>
              </span>
              <span className="p3-dp-track">
                <PovertyDot id={r.id} d={d} on={e.on} />
              </span>
            </li>
          );
        })}
      </ol>
      <p className="p3-key">
        <NavLink tab="explore" sub="households" anchor="hh-rules">
          Poverty values by rule, and a top-loaded stress test
        </NavLink>
      </p>
      <Source files={[rule('uniform').file]} />
    </figure>
  );
}

const CLAIMS = rulesClaims();
export function rulesSub() {
  const rs = ROWS.map((r) => rule(r.id).cost_bn);
  return {
    title: 'Who loses the job',
    icon: 'scenario',
    question: 'Does it matter who loses the job?',
    hint: 'Watch the cost dots spread and the poverty dots stay close',
    key: 'who',
    answer: `Cost ${fmtBn(Math.min(...rs))} to ${fmtBn(Math.max(...rs))} a year by rule`,
    answerTo: 'p3-rules-step',
  };
}

// The third sentence: the cheapest rule against the central case, its words
// from rulesClaims (the cheapest rule's name is its colour-keyed word).
function cheapSentence() {
  const c = CLAIMS;
  if (c.cheapest === 'exposure') return <>The central case costs least</>;
  const [, ...rest] = c.cheapText.split(' ');
  return (
    <>
      <Num n={1} mark={c.cheapest} /> <Key id={c.cheapest}>{NAME[c.cheapest]}</Key> {rest.join(' ').replace('the central case', '')}
      <Key id="exposure">the central case</Key>
    </>
  );
}

export const RULE_STEPS = [
  {
    id: 'p3-rules-step',
    icon: 'cost',
    highlight: ['cost', 'poverty'],
    title: (
      <>
        The rule moves the cost {CLAIMS.spreadWords}, the poverty rise {CLAIMS.costFar ? 'far less' : 'too'}
      </>
    ),
  },
  {
    id: 'p3-rules-step-2',
    icon: 'scenario',
    highlight: [CLAIMS.cheapest, 'exposure'],
    title: cheapSentence(),
  },
];

// The rules, for the colour-keyed words: the cost dot's ink.
const RULE_MARKS = Object.fromEntries(
  ROWS.map((r) => [
    r.id,
    {
      color: 'var(--pe-gray-800)',
      shape: r.same ? 'none' : 'circle',
      label: NAME[r.id],
    },
  ]),
);

export default function Rules() {
  return (
    <MarkProvider marks={RULE_MARKS}>
      <Scrolly
        id="p3-rules"
        sub={rulesSub()}
        steps={asLines(RULE_STEPS)}
        graphic={(i, r, ctx) => <RulesFigure ctx={ctx} />}
        label="Cost to the public finances under four rules for who is displaced"
      />
    </MarkProvider>
  );
}
