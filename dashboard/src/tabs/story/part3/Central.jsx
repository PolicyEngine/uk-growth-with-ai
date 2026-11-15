'use client';

import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { TileGrid } from '@/components/story/primitives.jsx';
import { fmtBn, fmtInputPct, fmtMillions, fmtPp, fmtPpSpread } from './format.js';
import { D, FigureHead, Source } from './shared.jsx';

// Block 1, the central case. The scoreboard (graphic) is the home of the
// four headline figures; the cards carry the basis, spread and variants.

const H = D.headline;
// The prescribed displacement rate, from the note on the displaced count.
export const CENTRAL_RATE = Number(/([\d.]+)% prescribed/.exec(H.central_displaced.note)?.[1] ?? NaN);
const CENTRAL_RATE_TEXT = fmtInputPct(CENTRAL_RATE);
// The relative poverty line, from the note on the relative poverty change.
export const RELATIVE_LINE = Number(/([\d.]+)% of the/.exec(H.central_poverty_relative.note ?? '')?.[1] ?? NaN);
const RELATIVE_LINE_TEXT = fmtInputPct(RELATIVE_LINE);
const KICKER = 'The central case';

const STATS = [
  { id: 'displaced', icon: 'users', value: fmtMillions(H.central_displaced.value), label: 'employees displaced (assumed)' },
  { id: 'cost', icon: 'landmark', value: fmtBn(H.central_cost.value), label: 'cost to the public finances, a year' },
  { id: 'poverty', icon: 'home', value: fmtPp(H.central_poverty.value), label: 'absolute poverty before housing costs' },
  { id: 'gini', icon: 'scale', value: fmtPp(H.central_gini.value), label: 'Gini coefficient, in points' },
];

function Graphic(active) {
  const tiles = Array.from({ length: 100 }, (_, k) => ({
    key: k,
    x: k % 10,
    y: Math.floor(k / 10),
    color: k < CENTRAL_RATE ? 'var(--series-2)' : 'var(--pe-gray-200)',
    delay: k * 4,
  }));
  return (
    <figure className="p3-figure">
      <FigureHead title="The central case, one year" unit="Mean across random draws of who is displaced" />
      <div className="p3-central">
        <div className="p3-central-tiles">
          <TileGrid tiles={tiles} width={10} height={10} size={14} gap={3} label="Tile grid of employees; the coloured tiles are those assumed displaced in the central case" />
          <p className="p3-tile-key" data-axis="">
            One tile = 1% of employees
          </p>
        </div>
        <ul className="p3-stats">
          {STATS.map((s, i) => (
            <li key={s.id} className={`p3-stat${i <= active ? ' is-reached' : ''}${i === active ? ' is-current' : ''}`} data-stat={s.id}>
              <Icon name={s.icon} size={18} />
              <span className="p3-stat-value">{s.value}</span>{' '}
              <span className="p3-stat-label">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <Source />
    </figure>
  );
}

export default function Central() {
  const steps = [
    {
      id: 'p3-central-assume',
      kicker: KICKER,
      title: 'Displacement is an input',
      body: (
        <>
          <p>
            {CENTRAL_RATE_TEXT ? (
              <>
                The study assumes that{' '}
                <span data-input="" data-path="headline.central_displaced.note">
                  {CENTRAL_RATE_TEXT}
                </span>{' '}
                of employees lose their job for the whole year,
              </>
            ) : (
              <>The study assumes that a share of employees lose their job for the whole year,</>
            )}{' '}
            each with a chance in proportion to the AI exposure of their occupation. The study also assumes that the wages of those who
            keep their jobs rise, and that interest and dividend income rises.
          </p>
          <p>Each figure here is the mean of {H.central_cost.draws} random draws of who is displaced.</p>
        </>
      ),
    },
    {
      id: 'p3-central-cost',
      kicker: KICKER,
      title: 'The cost to the public finances',
      body: (
        <>
          <p>
            The cost is the fall in the government balance: income tax, employee and employer National Insurance, and benefits. It
            counts no corporation tax. Across the {H.central_cost.draws} draws its standard deviation is {fmtBn(H.central_cost.sd)}.
          </p>
          <p>The cost is the difference between flows several times its size, and its sign depends on the assumed wage and capital income rises.</p>
        </>
      ),
    },
    {
      id: 'p3-central-poverty',
      kicker: KICKER,
      title: 'Absolute poverty before housing costs',
      body: (
        <>
          <p>
            The poverty line is held at its baseline value, and the change is in the share of people below it. The study reads this as
            an upper bound, because every displaced worker is out of work for the whole year. Its standard deviation across draws is {fmtPpSpread(H.central_poverty.sd)}.
          </p>
          <p>
            After housing costs the change is {fmtPp(H.central_poverty_ahc.value)}; against a relative line
            {RELATIVE_LINE_TEXT ? (
              <>
                , at{' '}
                <span data-input="" data-path="headline.central_poverty_relative.note">
                  {RELATIVE_LINE_TEXT}
                </span>{' '}
                of the new median,
              </>
            ) : (
              ','
            )}{' '}
            it is {fmtPp(H.central_poverty_relative.value)}.
          </p>
        </>
      ),
    },
    {
      id: 'p3-central-gini',
      kicker: KICKER,
      title: 'Inequality',
      body: (
        <p>
          The Gini coefficient changes by the amount shown, in points (the coefficient times 100). Its standard
          deviation across draws is {fmtPpSpread(H.central_gini.sd)}.
        </p>
      ),
    },
  ];
  return <Scrolly id="p3-central" steps={steps} graphic={Graphic} label="The central case: people displaced, cost, poverty and inequality" />;
}
