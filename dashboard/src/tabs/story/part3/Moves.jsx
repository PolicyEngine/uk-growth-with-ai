'use client';

import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Items } from '@/components/story/Items.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtBn, fmtMonths, fmtPctSigned1, fmtPp } from './format.js';
import { D, FigureHead, HBar, OutsideRebuildFlag, Source, ladder, Ico } from './shared.jsx';

// Step 7, what moves the cost (results.tex, "What moves the central cost"),
// in two cards over one figure: the three break-even values
// (#p3-moves-step), then UC take-up and new-style JSA on the 20 draws paired
// with the central case (#p3-takeup-step; the central case's own figures on
// these draws are in step 6, which its row links to). The group not yet
// reached is dimmed (hidden on phones), so each state reads on its own.

const BE = D.breakeven;
const TK = [
  { id: 'central_20', icon: 'jobLoss', label: 'The central case on these draws: ', base: true },
  { id: 'takeup', icon: 'takeUp', label: 'Every benefit unit with a displaced worker claims Universal Credit' },
  { id: 'takeup_jsa', icon: 'benefits', label: 'Plus 26 weeks of new-style JSA for those who qualify' },
];
const MAX = Math.max(...TK.map((r) => ladder(r.id).cost_bn));

// Full take-up and JSA against the central case on the same draws: the
// direction words and arrows come from the signs of the differences.
const dir = (d) => (d > 0 ? { icon: 'higher', word: 'rises' } : d < 0 ? { icon: 'lower', word: 'falls' } : { icon: 'onPath', word: 'is unchanged' });
export function takeupDirections() {
  const base = ladder('central_20');
  const full = ladder('takeup_jsa');
  return { cost: dir(full.cost_bn - base.cost_bn), poverty: dir(full.poverty_pp - base.poverty_pp) };
}

const BREAKS = [
  {
    id: 'wage',
    icon: 'pay',
    label: 'Average wage rise for those still employed',
    central: <span data-input="">{fmtPctSigned1(BE.wage.central_pct)}</span>,
    value: fmtPctSigned1(BE.wage.value_pct),
    basis: 'one draw',
  },
  {
    id: 'capital',
    icon: 'capital',
    label: 'Rise in interest and dividend income',
    central: <span data-input="">{fmtPctSigned1(BE.capital.central_pct)}</span>,
    value: `+${Math.round(BE.capital.value_pct)}%`,
    basis: `${BE.capital.draws} draws`,
  },
  {
    id: 'duration',
    icon: 'timing',
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
      <FigureHead icon="breakEven" title="What moves the central cost" unit="Break-even: the value at which the cost is zero, the other two held at their central settings" />
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
              <Ico c={b.icon} /> {b.label} <span className="p3-muted">({b.basis})</span>
            </span>
            <span className="p3-row-value p3-row-value-2">{b.central}</span>
            <span className="p3-be-arrow" aria-hidden="true">
              <Icon name="arrowRight" size={14} />
            </span>
            <span className="p3-row-value">{b.value}</span>
          </li>
        ))}
      </ol>
      <Items
        className={`p3-key-items${be}`}
        items={[
          { icon: 'timing', text: 'Time out of work: from a run keeping half a year’s earnings' },
          { icon: 'benefits', text: 'That also withdraws Universal Credit a real six-month spell would pay' },
          { icon: 'caveat', text: 'So the break-even is likely shorter than shown' },
        ]}
      />
      <p className={`p3-group-head${tk}`}>
        <Ico c="takeUp" /> Benefit take-up and new-style JSA, the same 20 draws as step 6</p>
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
                <Ico c={r.icon} /> {r.label}
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
      <p className={`p3-key${tk}`}>
        <Ico c="measure" size={12} /> Cost: £bn a year. Poverty: change in absolute poverty before housing costs.</p>
      <Source>break-evens by linear interpolation between simulated runs</Source>
    </figure>
  );
}

export default function Moves() {
  const t = takeupDirections();
  const steps = [
    {
      id: 'p3-moves-step',
      kicker: '7 · What moves the cost',
      title: 'Three assumptions decide its sign',
      icon: 'breakEven',
      body: (
        <Items
          items={[
            { icon: 'netSum', text: 'The cost nets flows several times its size' },
            { icon: 'breakEven', text: 'So three assumptions break even close to their central settings:' },
            { icon: 'pay', text: 'The wage rise for those who keep their jobs' },
            { icon: 'capital', text: 'The rise in interest and dividend income' },
            { icon: 'timing', text: 'How long people are out of work' },
          ]}
        />
      ),
    },
    {
      id: 'p3-takeup-step',
      pin: 'bottom',
      kicker: '7 · Take-up and JSA',
      title: 'Benefit take-up moves the cost one way only',
      icon: 'takeUp',
      body: (
        <Items
          items={[
            { icon: 'takeUp', text: 'In the data, not everyone entitled to Universal Credit claims it' },
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
      ),
    },
  ];
  return <Scrolly id="p3-moves" steps={steps} graphic={Graphic} label="Break-even values of three assumptions, and the cost with full benefit take-up and new-style JSA" />;
}
