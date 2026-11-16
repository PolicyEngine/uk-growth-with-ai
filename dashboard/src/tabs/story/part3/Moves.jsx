'use client';

import { useState } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtMonths, fmtPctSigned0, fmtPctSigned1 } from './format.js';
import { D, FigureHead, Num, NumMarker, Source, entryClass, useBeat, asLines } from './shared.jsx';
import { Ref } from './sources.jsx';

// Step 7, what moves the cost (results.tex, "What moves the central cost"):
// the three break-even values, one card over one figure. Full UC take-up and
// new-style JSA, with their figures, are on Explore > Households (#hh-ladder);
// the figure's last note links there.

const BE = D.breakeven;

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
    label: 'Wage rise for those still employed',
    central: BE.wage.central_pct,
    centralText: 'Central',
    value: BE.wage.value_pct,
    valueText: fmtPctSigned1(BE.wage.value_pct),
    basis: BE.wage.draws === 1 ? 'one draw' : `${BE.wage.draws} draws`,
  },
  {
    id: 'capital',
    label: 'Rise in interest and dividend income',
    central: BE.capital.central_pct,
    centralText: 'Central',
    value: BE.capital.value_pct,
    valueText: fmtPctSigned0(BE.capital.value_pct),
    basis: `${BE.capital.draws} draws`,
  },
  {
    id: 'duration',
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
              <NumMarker n={i + 1} /> {b.label}
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
              <span className="p3-be-word is-cost">a net cost</span>
              <span className="p3-be-word is-zero">zero</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// The tracks, with the Central | Break-even switch (it plays once on entry,
// Central to Break-even; a reader can set it after).
function MovesFigure({ ctx }) {
  const { attach, ...e } = useBeat(ctx?.entered ?? true);
  const [chosen, setChosen] = useState(null);
  const pos = chosen ?? (e.on ? 'be' : 'central');
  return (
    <figure ref={attach} className={entryClass(e, 'p3-figure p3-scene')}>
      <FigureHead
        icon="breakEven"
        title="What moves the central cost"
        y="Each assumption’s setting, from zero"
        unit={`Break-even: zero cost, the other two at central settings; interpolated between runs. ${BE.capital.draws} paired draws${BE.wage.draws === 1 ? '; wage row one draw' : ''}`}
        replay={() => {
          setChosen(null);
          e.replay();
        }}
        actions={<Switch pos={pos} setPos={setChosen} />}
      />
      <Tracks dim="" pos={pos} />
      <p className="p3-key">Time out of work comes from a half-year run that also withdraws UC a real spell pays: the break-even is likely shorter.</p>
      <p className="p3-key">
        Full benefit take-up and new-style JSA, as on <Ref id="jsa" />:{' '}
        <NavLink tab="explore" sub="households" anchor="hh-ladder">
          Explore, households
        </NavLink>
        .
      </p>
      <Source files={[D.breakeven.wage.file, D.breakeven.capital.file, D.breakeven.duration.file]} />
    </figure>
  );
}

const LABEL = 'Break-even values of three assumptions: wage rise, capital-income rise and time out of work';

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
export const MOVES_STEPS = [
  {
    id: 'p3-moves-step',
    icon: 'breakEven',
    highlight: ['breakeven'],
    title: (
      <>
        A {more(BW)} assumed wage <Num n={1} mark="be-wage" /> or {more(BC) === more(BW) ? '' : `${more(BC)} `}capital-income <Num n={2} mark="be-capital" /> rise, or {spell} spells{' '}
        <Num n={3} mark="be-duration" />, erase the cost
      </>
    ),
  },
];

export default function Moves() {
  return <Scrolly id="p3-moves" sub={movesSub()} steps={asLines(MOVES_STEPS)} graphic={(i, r, ctx) => <MovesFigure ctx={ctx} />} label={LABEL} />;
}
