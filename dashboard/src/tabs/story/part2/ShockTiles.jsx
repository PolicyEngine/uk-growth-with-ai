'use client';

import { TileGrid } from '@/components/story/primitives.jsx';

// The shock, illustrated: one tile is one per cent of output. Labour's
// tiles on the left, capital's on the right. Step 1 moves tiles from labour
// to capital (the share shift), step 2 adds tiles (output at given inputs
// rises), split between the two. Sizes are made up and exaggerated so the
// moves are visible: no scenario's numbers are drawn here.

const COLS = 8; // tiles per row in each group
const ROWS = 9;
const GAP = 2; // empty columns between the groups
const LABOUR0 = 65; // illustrative starting split
const MOVED = 5;
const NEW_L = 3;
const NEW_C = 2;
// labour indigo, capital brown (ab.css), as in the output split's Sankey:
// the arm colours (ARM_COLOR) and teal/amber mean other things
export const LABOUR_COLOR = 'var(--c-labour)';
export const CAPITAL_COLOR = 'var(--c-capital)';

// position of the i-th tile of a group, filled from the bottom row up
const at = (group, i) => ({
  x: (group === 'capital' ? COLS + GAP : 0) + (i % COLS),
  y: ROWS - 1 - Math.floor(i / COLS),
});

export function shockTiles(state) {
  const tiles = [];
  const capital0 = 100 - LABOUR0;
  for (let i = 0; i < LABOUR0; i++) {
    const moved = state >= 1 && i >= LABOUR0 - MOVED;
    const k = i - (LABOUR0 - MOVED);
    tiles.push({
      key: `l${i}`,
      ...(moved ? at('capital', capital0 + k) : at('labour', i)),
      color: moved ? CAPITAL_COLOR : LABOUR_COLOR,
      delay: moved ? k * 70 : 0,
    });
  }
  for (let i = 0; i < capital0; i++) tiles.push({ key: `c${i}`, ...at('capital', i), color: CAPITAL_COLOR });
  // new output: in place from the start, coloured in at step 2
  for (let i = 0; i < NEW_L + NEW_C; i++) {
    const labour = i < NEW_L;
    tiles.push({
      key: `n${i}`,
      ...(labour ? at('labour', LABOUR0 - MOVED + i) : at('capital', capital0 + MOVED + (i - NEW_L))),
      color: state >= 2 ? (labour ? LABOUR_COLOR : CAPITAL_COLOR) : 'transparent',
      delay: state >= 2 ? i * 90 : 0,
    });
  }
  return tiles;
}

const LABELS = [
  'Illustrative tile grid: output split into labour income on the left and capital income on the right, labour the larger group.',
  'Illustrative tile grid: a few tiles have moved from the labour group to the capital group.',
  'Illustrative tile grid: after the shift, new tiles are added to both groups, so total output is larger.',
];

export default function ShockTiles({ state }) {
  return (
    <figure className="p2-figure">
      <p className="story-figure-title">Who output is paid to</p>
      <p className="story-figure-unit">One tile is one per cent of output before the shock. Illustrative: sizes are exaggerated.</p>
      <div className="p2-tiles">
        <div className="p2-tile-heads" aria-hidden="true">
          <span style={{ '--sw': LABOUR_COLOR }}>Labour income</span>
          <span style={{ '--sw': CAPITAL_COLOR }}>Capital income</span>
        </div>
        <TileGrid tiles={shockTiles(state)} width={COLS * 2 + GAP} height={ROWS} label={LABELS[state]} />
      </div>
      <figcaption className="story-source">Illustration, not model output.</figcaption>
    </figure>
  );
}
