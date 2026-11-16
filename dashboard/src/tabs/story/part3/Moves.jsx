'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import Scrolly from '@/components/story/Scrolly.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtBn, fmtMonths, fmtPctSigned0, fmtPctSigned1, fmtPp } from './format.js';
import { AxisTitle, D, DrawsChip, FigureHead, Fold, Num, NumMarker, OutsideRebuildFlag, Source, ladder, Ico, entryClass, useBeat, asLines } from './shared.jsx';
import { Ref } from './sources.jsx';

// Step 7, what moves the cost (results.tex, "What moves the central cost"),
// in two cards over one figure: the three break-even values
// (#p3-moves-step), then UC take-up and new-style JSA on the 20 draws paired
// with the central case (#p3-takeup-step; the central case's own figures on
// these draws are in step 6, which its row links to). The group not yet
// reached is dimmed (hidden on phones), so each state reads on its own.

const BE = D.breakeven;
const TK = [
  { id: 'central_20', icon: 'jobLoss', label: 'Central case, these draws', base: true },
  { id: 'takeup', icon: 'takeUp', label: 'Everyone with a displaced worker claims UC' },
  { id: 'takeup_jsa', icon: 'benefits', label: 'Plus 26 weeks of new-style JSA, as on ', ref: 'jsa' },
];
const MAX = Math.max(...TK.map((r) => ladder(r.id).cost_bn));

// Full take-up and JSA against the central case on the same draws: the
// direction words and arrows come from the signs of the differences.
const dir = (d) => (d > 0 ? { icon: 'rise', word: 'rises' } : d < 0 ? { icon: 'fall', word: 'falls' } : { icon: 'onPath', word: 'is unchanged' });
export function takeupDirections() {
  const base = ladder('central_20');
  const full = ladder('takeup_jsa');
  return { cost: dir(full.cost_bn - base.cost_bn), poverty: dir(full.poverty_pp - base.poverty_pp) };
}

// Break-even tracks (scene 3-7, state 0). One track per input, from zero,
// with two labelled points, "Central" and "Break-even", and a marker that
// travels between them (kind d: an input marker along its own axis). No
// cost is shown at Central, in transit or at Break-even beyond two words,
// "a net cost" and "zero". The central wage and capital settings have their
// home in step 1 (linked); each break-even value is printed once, here.
// Each row's basis is its own: the wage row is one draw, the others 20.
export const BREAKS = [
  {
    id: 'wage',
    icon: 'pay',
    label: 'Wage rise for those still employed',
    central: BE.wage.central_pct,
    centralText: 'Central',
    value: BE.wage.value_pct,
    valueText: fmtPctSigned1(BE.wage.value_pct),
    basis: BE.wage.draws === 1 ? 'one draw' : `${BE.wage.draws} draws`,
  },
  {
    id: 'capital',
    icon: 'capital',
    label: 'Rise in interest and dividend income',
    central: BE.capital.central_pct,
    centralText: 'Central',
    value: BE.capital.value_pct,
    valueText: fmtPctSigned0(BE.capital.value_pct),
    basis: `${BE.capital.draws} draws`,
  },
  {
    id: 'duration',
    icon: 'timing',
    label: 'Time out of work',
    central: 12,
    centralText: 'Central: a full year',
    value: BE.duration.value_months,
    valueText: fmtMonths(BE.duration.value_months),
    basis: `${BE.duration.draws} draws`,
  },
];

// The Central | Break-even switch: a radio group (arrow keys move it).
function Switch({ pos, setPos }) {
  const opts = [
    ['central', 'Central'],
    ['be', 'Break-even'],
  ];
  const key = (ev) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) return;
    ev.preventDefault();
    setPos(pos === 'be' ? 'central' : 'be');
  };
  return (
    <span className="p3-switch" role="radiogroup" aria-label="Marker position" onKeyDown={key}>
      {opts.map(([k, name]) => (
        <button key={k} type="button" role="radio" aria-checked={pos === k} tabIndex={pos === k ? 0 : -1} className={pos === k ? 'is-on' : ''} onClick={() => setPos(k)}>
          {name}
        </button>
      ))}
    </span>
  );
}

function Tracks({ dim, pos }) {
  return (
    <ol className={`p3-be-tracks${dim}`}>
      {BREAKS.map((b, i) => {
        const max = Math.max(b.central, b.value) * 1.18;
        const xc = (b.central / max) * 100;
        const xb = (b.value / max) * 100;
        return (
          <li key={b.id} className={`p3-be-track-row is-${pos}`} data-row={`be-${b.id}`} data-mark={`breakeven be-${b.id}`} style={{ '--beat': `${i * 250}ms` }}>
            <p className="p3-row-label">
              <NumMarker n={i + 1} /> <Ico c={b.icon} /> {b.label}
            </p>
            <span className="p3-be-track" aria-hidden="true">
              <span className="p3-be-tick" style={{ left: `${xc}%` }} />
              <span className="p3-be-tick is-be" style={{ left: `${xb}%` }} />
              <span className="p3-be-mover" style={{ '--x': pos === 'be' ? xb : xc }}>
                <span className="p3-be-marker" />
              </span>
            </span>
            <span className="p3-be-points">
              {/* each label grows away from the other point, so the two never overlap */}
              <span className={`p3-be-point ${xc < xb ? 'is-end' : 'is-start'}`} style={{ left: `${xc}%` }}>
                {b.centralText}
              </span>
              <span className={`p3-be-point is-be ${xb < xc ? 'is-end' : 'is-start'}`} style={{ left: `${xb}%` }}>
                Break-even <strong className="p3-row-value">{b.valueText}</strong>
              </span>
            </span>
            <span className="p3-be-cost">
              <span className="p3-be-word is-cost">
                <Icon name={iconFor('cost')} size={13} /> a net cost
              </span>
              <span className="p3-be-word is-zero">
                <Icon name={iconFor('onPath')} size={13} /> zero
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// The take-up ladder (state 1): three rungs on a cost axis from zero, one
// base (20 paired draws). The central case on these draws is a reference
// ring linking to step 6, with no value; arrows draw from rung to rung.
function Ladder({ dim, on }) {
  // arrows draw when the take-up card is the active one
  const rows = TK.map((r) => ({ ...r, d: ladder(r.id), x: (ladder(r.id).cost_bn / (MAX * 1.12)) * 100 }));
  return (
    <ol className={`p3-ladder${dim}${on ? ' is-on' : ''}`}>
      {rows.map((r, i) => (
        <li key={r.id} className="p3-ladder-row" data-row={r.id} data-mark={`takeup rung-${r.id}`} style={{ '--beat': `${i * 450}ms` }}>
          <span className="p3-row-label">
            {i ? <NumMarker n={i + 3} /> : null} <Ico c={r.icon} /> {r.label}
            {r.ref ? <Ref id={r.ref} /> : null}
          </span>
          <span className="p3-ladder-track">
            {i > 0 ? (
              // the move from the rung above: a ghost ring where it stood and an arrow along the cost axis
              <>
                <span className="p3-ladder-ghost" style={{ left: `${rows[i - 1].x}%` }} />
                <span className={`p3-ladder-arrow${r.x < rows[i - 1].x ? ' is-back' : ''}`} style={{ left: `${Math.min(rows[i - 1].x, r.x)}%`, width: `${Math.abs(r.x - rows[i - 1].x)}%` }} />
              </>
            ) : null}
            <span className={`p3-ladder-dot${r.base ? ' is-ring' : ''}`} style={{ left: `${r.x}%` }} />
          </span>{' '}
          <span className="p3-row-value p3-ladder-val">{r.base ? null : fmtBn(r.d.cost_bn)}</span>{' '}
          <span className="p3-row-value p3-row-value-2">{r.base ? null : fmtPp(r.d.poverty_pp)}</span>
        </li>
      ))}
    </ol>
  );
}

// Desktop: the two states side by side, so the figure is short enough to
// stay in view while each card holds its state; the state not reached is
// dimmed (marks fade, text greys), as before. Phones (Scrolly's
// phone="once", ctx.once): both states, complete, one above the other.
function MovesFigure({ active, all = false, ctx }) {
  const e = useBeat(ctx?.entered ?? true);
  // the switch plays once on entry, Central to Break-even; a reader can set it after
  const [chosen, setChosen] = useState(null);
  const pos = chosen ?? (e.on ? 'be' : 'central');
  const show = (k) => all || active === k;
  return (
    <figure className={entryClass(e, 'p3-figure p3-scene')}>
      <FigureHead
        icon="breakEven"
        title="What moves the central cost"
        y="Each assumption’s setting, from zero"
        unit={
          <>
            Break-even: zero cost, the other two at central settings; interpolated between runs{' '}
            <DrawsChip>
              {BE.capital.draws} paired draws{BE.wage.draws === 1 ? '; wage row one draw' : ''}
            </DrawsChip>
          </>
        }
        replay={() => {
          setChosen(null);
          e.replay();
        }}
      />
      <div className={`p3-states${all ? ' is-all' : ''}`}>
        <section className={`p3-state${show(0) ? '' : ' is-off'}`} data-state="breakeven">
          <div className="p3-be-head">
            <Switch pos={pos} setPos={setChosen} />
          </div>
          <Tracks dim="" pos={pos} />
        </section>
        <section className={`p3-state${show(1) ? '' : ' is-off'}`} data-state="takeup">
          <p className="p3-group-head p3-group-first">
            <Ico c="takeUp" /> Take-up and JSA
          </p>
          <OutsideRebuildFlag />
          <div className="p3-cols p3-cols-ladder">
            <AxisTitle axis="y">Cost, £bn a year</AxisTitle>
            <AxisTitle axis="y">Poverty, pp</AxisTitle>
          </div>
          <Ladder dim="" on={all ? e.on : active === 1 && e.on} />
        </section>
      </div>
      <Source files={[D.breakeven.wage.file, D.breakeven.capital.file, D.breakeven.duration.file, ladder('takeup').file]} />
    </figure>
  );
}

const LABEL = 'Break-even values of three assumptions, and the cost with full benefit take-up and new-style JSA';

export function movesSub() {
  return {
    title: 'What moves the cost',
    icon: 'breakEven',
    question: 'Which assumptions move the cost most?',
    hint: 'Watch each marker travel to break-even',
    key: 'assumptions',
    answer: `Break-even: wages ${fmtPctSigned1(BE.wage.value_pct)}, capital income ${fmtPctSigned0(BE.capital.value_pct)}`,
    answerTo: 'p3-moves-step',
  };
}

// The direction words of the break-evens against their central settings.
const more = (b) => (b.value > b.central ? 'larger' : 'smaller');
const [BW, BC, BD] = BREAKS;
const spell = BD.value < BD.central ? 'shorter' : 'longer';
const T = takeupDirections();
const povWord = T.poverty.word === 'falls' ? 'shrink the poverty rise' : T.poverty.word === 'rises' ? 'add to the poverty rise' : 'leave the poverty rise';
export const MOVES_STEPS = [
  {
    id: 'p3-moves-step',
    kicker: 'Step 7 · What moves the cost',
    icon: 'breakEven',
    highlight: ['breakeven'],
    title: (
      <>
        A {more(BW)} assumed wage <Num n={1} mark="be-wage" /> or {more(BC) === more(BW) ? '' : `${more(BC)} `}capital-income <Num n={2} mark="be-capital" /> rise, or {spell} spells <Num n={3} mark="be-duration" />, erase the cost
      </>
    ),
    body: (
      <Fold
        groups={[
          {
            label: 'Assumed',
            items: [
              <>
                The wage and capital-income rises are <Ref id="doorley">Doorley et al. (2026)</Ref>’s; their central settings are in <a href="#p3-central-step">step 1</a>
              </>,
            ],
          },
          {
            label: 'Caveat',
            items: ['Time out of work comes from a run keeping half a year’s earnings', 'That run also withdraws UC a real six-month spell would pay, so the break-even is likely shorter than shown'],
          },
        ]}
      />
    ),
  },
  {
    id: 'p3-takeup-step',
    icon: 'takeUp',
    highlight: ['takeup'],
    title: (
      <>
        Full UC take-up <Num n={4} mark="rung-takeup" /> and new-style JSA <Num n={5} mark="rung-takeup_jsa" /> {T.cost.word === 'rises' ? 'raise the cost' : T.cost.word === 'falls' ? 'lower the cost' : 'leave the cost'}{' '}
        and {povWord}
      </>
    ),
    body: (
      <Fold
        groups={[
          { label: 'Definitions', items: ['Everyone with a displaced worker claims UC; qualifiers also get 26 weeks of new-style JSA'] },
          { label: 'Caveat', items: ['In the study’s data, not everyone newly entitled to UC claims'] },
          {
            label: 'See also',
            items: [
              <NavLink key="v" tab="explore" sub="households" anchor="hh-ladder">
                Every variant, including the OBR-sized runs
              </NavLink>,
            ],
          },
        ]}
      />
    ),
  },
];

export default function Moves() {
  // Phones: it prints values, so it is drawn once, complete, above both cards.
  return (
    <Scrolly id="p3-moves" sub={movesSub()} steps={asLines(MOVES_STEPS)} phone="once" graphic={(i, r, ctx) => <MovesFigure active={i} all={!!ctx?.once} ctx={ctx} />} label={LABEL} />
  );
}
