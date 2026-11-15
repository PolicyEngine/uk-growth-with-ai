'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { TileGrid } from '@/components/story/primitives.jsx';
import { fmtGbp, fmtShare } from './format.js';
import { D, FigureHead, HBar, Source, ladder } from './shared.jsx';

// Block 5, who the displaced are, in the OBR-sized run. A 100-tile grid
// (one tile = 1% of benefit units with a displaced worker) highlights one
// group per step. The groups overlap and the data give no cross-tabulation,
// so each step fills the first N tiles and implies nothing about which
// units are in two groups. The cards are the home of the shares; the grid
// prints none. Then UC per worker, a block of its own.

const X = D.displaced;

const TILE_STEPS = [
  { key: 'claim_uc', grid: 'Benefit units with a displaced worker', fill: 'var(--series-2)' },
  { key: 'claim_uc_entitled', grid: 'Of those entitled to UC once displaced', fill: 'var(--series-2)' },
  { key: 'capital_over_limit', grid: 'Benefit units with a displaced worker', fill: 'var(--series-3)' },
  { key: 'other_earner', grid: 'Benefit units with a displaced worker', fill: 'var(--series-4)' },
  { key: 'homeowner', grid: 'Benefit units with a displaced worker', fill: 'var(--series-5)' },
];

function TileGraphic(active) {
  const s = TILE_STEPS[active] ?? TILE_STEPS[0];
  const n = Math.round(X[s.key].value);
  const tiles = Array.from({ length: 100 }, (_, k) => ({
    key: k,
    x: k % 10,
    y: Math.floor(k / 10),
    color: k < n ? s.fill : 'var(--pe-gray-200)',
    delay: (k % 10) * 15,
  }));
  return (
    <figure className="p3-figure">
      <FigureHead title="Who the displaced are, OBR-sized run" unit={s.grid} />
      <div className="p3-tiles-wrap">
        <TileGrid tiles={tiles} width={10} height={10} size={14} gap={3} label="Tile grid of benefit units with a displaced worker; the coloured tiles are the group the active step describes" />
      </div>
      <p className="p3-tile-key" data-axis="">
        One tile = 1% of the benefit units counted
      </p>
      <Source />
    </figure>
  );
}

const UC_ROWS = [
  { key: 'uc_per_displaced', label: 'Added UC per displaced worker', step: 0 },
  { key: 'uc_per_existing_unemployed', label: 'UC per person already unemployed', step: 0 },
  { key: 'uc_per_displaced_takeup', label: 'Added UC per displaced worker, every displaced worker’s benefit unit claims', step: 1 },
];
const UC_MAX = Math.max(...UC_ROWS.map((r) => X[r.key].value));

function UcGraphic(active) {
  return (
    <figure className="p3-figure">
      <FigureHead title="Universal Credit per person, OBR-sized run" unit="£ a year" />
      <ol className="p3-rows">
        {UC_ROWS.map((r) => {
          const on = r.step <= active;
          return (
            <li key={r.key} className={`p3-row${on ? ' is-reached' : ' is-pending'}`} data-row={r.key}>
              <span className="p3-row-label">{r.label}</span>
              {' '}
              <span className="p3-row-bar">
                <HBar value={X[r.key].value} max={UC_MAX} on={on} fill={r.key === 'uc_per_existing_unemployed' ? 'p3-fill-ref' : 'p3-fill-cost'} />
              </span>
              {' '}
              <span className="p3-row-value">{fmtGbp(X[r.key].value)}</span>
            </li>
          );
        })}
      </ol>
      <Source />
    </figure>
  );
}

export function DisplacedTiles() {
  const steps = [
    {
      id: 'p3-who-claim',
      kicker: 'Who the displaced are',
      title: 'Claiming Universal Credit',
      body: (
        <>
          <p>
            These figures come from the OBR-sized run and count benefit units (a single adult or a couple and their children) that
            contain a displaced worker. The groups overlap.
          </p>
          <p>Under the data’s take-up flags, {fmtShare(X.claim_uc.value)} of these units claim Universal Credit.</p>
        </>
      ),
    },
    {
      id: 'p3-who-entitled',
      title: 'Entitled but not claiming',
      body: (
        <p>
          Counting only the units entitled to Universal Credit once the worker is displaced, {fmtShare(X.claim_uc_entitled.value)} claim
          it. Among entitled units in which someone was already unemployed, {fmtShare(X.existing_unemployed_claim.value)} claim.
        </p>
      ),
    },
    {
      id: 'p3-who-capital',
      title: 'Savings above the limit',
      body: (
        <p>
          {fmtShare(X.capital_over_limit.value)} of the units hold capital above the Universal Credit limit of{' '}
          <span data-input="" data-path="displaced.capital_over_limit.label">
            £16,000
          </span>
          , which rules out a claim.
        </p>
      ),
    },
    {
      id: 'p3-who-earner',
      title: 'Another earner',
      body: <p>{fmtShare(X.other_earner.value)} of the units have another earner, whose earnings reduce or remove Universal Credit.</p>,
    },
    {
      id: 'p3-who-home',
      title: 'Homeowners',
      body: <p>{fmtShare(X.homeowner.value)} of the units own their home.</p>,
    },
  ];
  return <Scrolly id="p3-who" steps={steps} graphic={TileGraphic} label="Who the displaced workers' benefit units are" />;
}

export function DisplacedUc() {
  const steps = [
    {
      id: 'p3-uc-compare',
      kicker: 'Universal Credit per person',
      title: 'Less than for people already unemployed',
      body: (
        <p>
          In the OBR-sized run, the added Universal Credit per displaced worker, a mean over {ladder('obr').draws} draws, is
          smaller than the Universal Credit received per person already unemployed before the shock.
        </p>
      ),
    },
    {
      id: 'p3-uc-takeup',
      title: 'If every displaced worker’s benefit unit claims',
      body: <p>With every benefit unit with a displaced worker claiming, the added Universal Credit per displaced worker is higher, and still below the amount per person already unemployed.</p>,
    },
  ];
  return <Scrolly id="p3-uc" steps={steps} graphic={UcGraphic} label="Universal Credit per displaced worker and per person already unemployed" />;
}
