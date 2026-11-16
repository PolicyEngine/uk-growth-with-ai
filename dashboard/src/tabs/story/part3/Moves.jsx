'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { useIsPhone } from '@/components/story/motion.js';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Items } from '@/components/story/Items.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtBn, fmtMonths, fmtPctSigned0, fmtPctSigned1, fmtPp } from './format.js';
import { About, D, FigureHead, OutsideRebuildFlag, Source, ladder, Ico, entryClass, useEntry } from './shared.jsx';

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
              <span className="p3-be-point" style={{ left: `${xc}%` }}>
                {b.centralText}
              </span>
              <span className={`p3-be-point is-be${xb < xc ? ' is-left' : ''}`} style={{ left: `${xb}%` }}>
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
            {r.base ? null : (
              <span className="p3-ladder-val" style={{ left: `${r.x}%` }}>
                {fmtBn(r.d.cost_bn)}
              </span>
            )}
          </span>
          <span className="p3-row-value p3-row-value-2">{r.base ? null : fmtPp(r.d.poverty_pp)}</span>
        </li>
      ))}
    </ol>
  );
}

function MovesFigure({ active, all = false }) {
  const [ref, e] = useEntry();
  // the switch plays once on entry, Central to Break-even; a reader can set it after
  const [chosen, setChosen] = useState(null);
  const pos = chosen ?? (e.on ? 'be' : 'central');
  const be = all || active === 0 ? '' : ' p3-dim';
  const tk = all || active === 1 ? '' : ' p3-dim';
  return (
    <figure className={entryClass(e, 'p3-figure p3-scene')} ref={ref}>
      <FigureHead icon="breakEven" title="What moves the central cost" unit="Break-even: the value at which the cost is zero, the other two held at their central settings, by linear interpolation between runs" replay={{ ...e.replay, onClick: () => { setChosen(null); e.replay.onClick(); } }} />
      <div className={`p3-be-head${be}`}>
        <Switch pos={pos} setPos={setChosen} />
      </div>
      <Tracks dim={be} pos={pos} />
      <Items
        className={`p3-key-items${be}`}
        items={[
          { icon: 'timing', text: 'Time out of work: from a run keeping half a year’s earnings' },
          { icon: 'benefits', text: 'That also withdraws Universal Credit a real six-month spell would pay' },
          { icon: 'caveat', text: 'So the break-even is likely shorter than shown' },
        ]}
      />
      <p className={`p3-group-head${tk}`}>
        <Ico c="takeUp" /> Benefit take-up and new-style JSA, the same 20 draws as step 6
      </p>
      <OutsideRebuildFlag className={tk.trim()} />
      <div className={`p3-cols p3-cols-ladder${tk}`} aria-hidden="true">
        <span>Cost, £bn a year</span>
        <span>Poverty</span>
      </div>
      <Ladder dim={tk} on={all ? e.on : active === 1} />
      <Source>break-evens by linear interpolation between simulated runs</Source>
    </figure>
  );
}

const LABEL = 'Break-even values of three assumptions, and the cost with full benefit take-up and new-style JSA';

function Once({ id, steps, figure, label }) {
  return (
    <div className="scrolly is-single p3-once" id={id}>
      <div className="scrolly-graphic" role="group" aria-label={label}>
        <div className="scrolly-graphic-inner">{figure}</div>
      </div>
      <ol className="scrolly-steps">
        {steps.map((s) => (
          <li key={s.id} id={s.id} className="scrolly-step">
            <div className="scrolly-card">
              <p className="scrolly-kicker">{s.kicker}</p>
              <h3 className="scrolly-title">
                <Icon name={iconFor(s.icon)} size={18} className="scrolly-title-icon" />
                <span>{s.title}</span>
              </h3>
              <div className="scrolly-body">{s.body}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Moves() {
  const phone = useIsPhone();
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
            { icon: 'breakEven', text: 'The cost nets far larger flows, so three assumptions break even nearby:' },
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
  // Phones: it prints values, so it is drawn once, complete, above both cards
  // (the shared Scrolly's phone="once"; until that lands, laid out here with
  // the same step ids and card classes).
  if (phone) return <Once id="p3-moves" steps={steps} figure={<MovesFigure active={1} all />} label={LABEL} />;
  return <Scrolly id="p3-moves" steps={steps} graphic={(i) => <MovesFigure active={i} />} label={LABEL} />;
}
