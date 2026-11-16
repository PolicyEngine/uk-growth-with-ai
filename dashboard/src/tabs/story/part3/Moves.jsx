'use client';

import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtBn, fmtMonths, fmtPctSigned1, fmtPp } from './format.js';
import { D, FigureHead, HBar, OutsideRebuildFlag, Source, ladder } from './shared.jsx';

// Step 7, what moves the cost (results.tex, "What moves the central cost"),
// in two cards over one figure: the three break-even values
// (#p3-moves-step), then UC take-up and new-style JSA on the 20 draws paired
// with the central case (#p3-takeup-step; the central case's own figures on
// these draws are in step 6, which its row links to). The group not yet
// reached is dimmed (hidden on phones), so each state reads on its own.

const BE = D.breakeven;
const TK = [
  { id: 'central_20', label: 'The central case on these draws: ', base: true },
  { id: 'takeup', label: 'Every benefit unit with a displaced worker claims Universal Credit' },
  { id: 'takeup_jsa', label: 'And displaced workers who qualify also get 26 weeks of new-style JSA' },
];
const MAX = Math.max(...TK.map((r) => ladder(r.id).cost_bn));

const BREAKS = [
  {
    id: 'wage',
    label: 'Average wage rise for those still employed',
    central: <span data-input="">{fmtPctSigned1(BE.wage.central_pct)}</span>,
    value: fmtPctSigned1(BE.wage.value_pct),
    basis: 'one draw',
  },
  {
    id: 'capital',
    label: 'Rise in interest and dividend income',
    central: <span data-input="">{fmtPctSigned1(BE.capital.central_pct)}</span>,
    value: `+${Math.round(BE.capital.value_pct)}%`,
    basis: `${BE.capital.draws} draws`,
  },
  {
    id: 'duration',
    label: 'Time out of work',
    central: 'a full year',
    value: fmtMonths(BE.duration.value_months),
    basis: `${BE.duration.draws} draws`,
  },
];

function Graphic(active) {
  const be = active === 0 ? '' : ' p3-dim';
  const tk = active === 1 ? '' : ' p3-dim';
  return (
    <figure className="p3-figure">
      <FigureHead title="What moves the central cost" unit="Break-even: the value at which the cost is zero, the other two held at their central settings" />
      <div className={`p3-cols p3-cols-be${be}`} aria-hidden="true">
        <span />
        <span>Central</span>
        <span />
        <span>Break-even</span>
      </div>
      <ol className="p3-rows p3-be">
        {BREAKS.map((b) => (
          <li key={b.id} className={`p3-row p3-be-row${be}`} data-row={`be-${b.id}`}>
            <span className="p3-row-label">
              {b.label} <span className="p3-muted">({b.basis})</span>
            </span>
            <span className="p3-row-value p3-row-value-2">{b.central}</span>
            <span className="p3-be-arrow" aria-hidden="true">
              <Icon name="arrowRight" size={14} />
            </span>
            <span className="p3-row-value">{b.value}</span>
          </li>
        ))}
      </ol>
      <p className={`p3-key${be}`}>
        Time out of work comes from a run in which the displaced keep half their annual earnings, which also withdraws Universal Credit that a
        real six-month spell would pay, so the break-even is likely shorter than shown.
      </p>
      <p className={`p3-group-head${tk}`}>Benefit take-up and new-style JSA, the same 20 draws as step 6</p>
      <OutsideRebuildFlag className={tk.trim()} />
      <div className={`p3-cols${tk}`} aria-hidden="true">
        <span />
        <span>Cost</span>
        <span>Poverty</span>
      </div>
      <ol className="p3-rows p3-rows-2col">
        {TK.map((r) => {
          const d = ladder(r.id);
          return (
            <li key={r.id} className={`p3-row${tk}`} data-row={r.id}>
              <span className="p3-row-label">
                {r.label}
                {r.base ? <a href="#p3-margin-step">step 6</a> : null}
              </span>{' '}
              <span className="p3-row-bar">
                <HBar value={d.cost_bn} max={MAX} fill={r.base ? 'p3-fill-ref' : 'p3-fill-cost'} />
              </span>{' '}
              <span className="p3-row-value">{r.base ? null : fmtBn(d.cost_bn)}</span>{' '}
              <span className="p3-row-value p3-row-value-2">{r.base ? null : fmtPp(d.poverty_pp)}</span>
            </li>
          );
        })}
      </ol>
      <p className={`p3-key${tk}`}>Cost: £bn a year. Poverty: change in absolute poverty before housing costs.</p>
      <Source>break-evens by linear interpolation between simulated runs</Source>
    </figure>
  );
}

export default function Moves() {
  const steps = [
    {
      id: 'p3-moves-step',
      kicker: '7 · What moves the cost',
      title: 'Three assumptions decide its sign',
      body: (
        <p>
          The cost is the difference between flows several times its size, so three assumptions have break-even values close to their central
          settings: the wage rise for those who keep their jobs, the rise in interest and dividend income, and how long people are out of work.
        </p>
      ),
    },
    {
      id: 'p3-takeup-step',
      kicker: '7 · Take-up and JSA',
      title: 'Benefit take-up moves the cost one way only',
      body: (
        <p>
          In the data, not everyone entitled to Universal Credit claims it. When everyone with a displaced worker claims, and those who qualify
          get new-style JSA, the cost rises and the poverty rise is smaller.{' '}
          <NavLink tab="explore" sub="households" anchor="hh-ladder">
            Every variant, including the OBR-sized runs
          </NavLink>
          .
        </p>
      ),
    },
  ];
  return <Scrolly id="p3-moves" steps={steps} graphic={Graphic} label="Break-even values of three assumptions, and the cost with full benefit take-up and new-style JSA" />;
}
