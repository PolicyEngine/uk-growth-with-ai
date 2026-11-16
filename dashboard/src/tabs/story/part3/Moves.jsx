'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Items } from '@/components/story/Items.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtBn, fmtMonths, fmtPctSigned0, fmtPctSigned1, fmtPp } from './format.js';
import { About, D, FigureHead, OutsideRebuildFlag, Source, ladder, Ico, entryClass, useBeat } from './shared.jsx';

// Step 7, what moves the cost (results.tex, "What moves the central cost"),
// in two cards over one figure: the three break-even values
// (#p3-moves-step), then UC take-up and new-style JSA on the 20 draws paired
// with the central case (#p3-takeup-step; the central case's own figures on
// these draws are in step 6, which its row links to). The group not yet
// reached is dimmed (hidden on phones), so each state reads on its own.

const BE = D.breakeven;
const TK = [
  { id: 'central_20', icon: 'jobLoss', label: 'Central case, these draws: ', base: true },
  { id: 'takeup', icon: 'takeUp', label: 'Everyone with a displaced worker claims UC' },
  { id: 'takeup_jsa', icon: 'benefits', label: 'Plus 26 weeks of new-style JSA' },
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
    centralText: <a href="#p3-central-step">Central, step 1</a>,
    value: BE.wage.value_pct,
    valueText: fmtPctSigned1(BE.wage.value_pct),
    basis: BE.wage.draws === 1 ? 'one draw' : `${BE.wage.draws} draws`,
  },
  {
    id: 'capital',
    icon: 'capital',
    label: 'Rise in interest and dividend income',
    central: BE.capital.central_pct,
    centralText: <a href="#p3-central-step">Central, step 1</a>,
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
          <li key={b.id} className={`p3-be-track-row is-${pos}`} data-row={`be-${b.id}`} style={{ '--beat': `${i * 250}ms` }}>
            <p className="p3-row-label">
              <Ico c={b.icon} /> {b.label} <span className="p3-basis">{b.basis}</span>
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
        <li key={r.id} className="p3-ladder-row" data-row={r.id} style={{ '--beat': `${i * 450}ms` }}>
          <span className="p3-row-label">
            <Ico c={r.icon} /> {r.label}
            {r.base ? <a href="#p3-margin-step">step 6</a> : null}
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
        unit="Break-even: zero cost, the other two at central settings; interpolated between runs"
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
            <Ico c="takeUp" /> Take-up and JSA, the same 20 draws as step 6
          </p>
          <OutsideRebuildFlag />
          <div className="p3-cols p3-cols-ladder" aria-hidden="true">
            <span>Cost</span>
            <span>Poverty</span>
          </div>
          <Ladder dim="" on={all ? e.on : active === 1 && e.on} />
        </section>
      </div>
      <Source />
    </figure>
  );
}

const LABEL = 'Break-even values of three assumptions, and the cost with full benefit take-up and new-style JSA';

export default function Moves() {
  const t = takeupDirections();
  const steps = [
    {
      id: 'p3-moves-step',
      kicker: '7 · What moves the cost',
      title: 'Three assumptions decide its sign',
      icon: 'breakEven',
      body: (
        <>
          <Items
            items={[
              { icon: 'breakEven', text: 'The cost nets far larger flows, so three assumptions break even nearby:' },
              { icon: 'pay', text: 'The wage rise for those who keep their jobs' },
              { icon: 'capital', text: 'The rise in interest and dividend income' },
              { icon: 'timing', text: 'How long people are out of work' },
            ]}
          />
          <About>
            <Items
              items={[
                { icon: 'timing', text: 'Time out of work: from a run keeping half a year’s earnings' },
                { icon: 'benefits', text: 'That also withdraws Universal Credit a real six-month spell would pay' },
                { icon: 'caveat', text: 'So the break-even is likely shorter than shown' },
              ]}
            />
          </About>
        </>
      ),
    },
    {
      id: 'p3-takeup-step',
      pin: 'bottom',
      kicker: '7 · Take-up and JSA',
      title: 'Benefit take-up moves the cost one way only',
      icon: 'takeUp',
      body: (
        <>
        <Items
          items={[
            { icon: 'benefits', text: 'Here everyone with a displaced worker claims; qualifiers get new-style JSA' },
            { icon: t.cost.icon, text: `The cost ${t.cost.word}` },
            { icon: t.poverty.icon, text: `The poverty rise ${t.poverty.word === 'falls' ? 'is smaller' : t.poverty.word === 'rises' ? 'is larger' : 'is unchanged'}` },
            {
              icon: 'link',
              text: (
                <NavLink tab="explore" sub="households" anchor="hh-ladder">
                  Every variant, including the OBR-sized runs
                </NavLink>
              ),
            },
          ]}
        />
        <About>
          <Items items={[{ icon: 'takeUp', text: 'In the data, not everyone entitled to Universal Credit claims it' }]} />
        </About>
        </>
      ),
    },
  ];
  // Phones: it prints values, so it is drawn once, complete, above both cards.
  return <Scrolly id="p3-moves" steps={steps} phone="once" graphic={(i, r, ctx) => <MovesFigure active={i} all={!!ctx?.once} ctx={ctx} />} label={LABEL} />;
}
