'use client';

import { useEffect, useState } from 'react';
import { TileGrid } from '@/components/story/primitives.jsx';
import { useInView } from '@/components/story/motion.js';
import { Tx } from './frame.jsx';

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
const DROP = 1.6; // tiles a new tile falls
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
  // new output: drops in at step 2 from a little above its place (unseen
  // before then: no fill)
  for (let i = 0; i < NEW_L + NEW_C; i++) {
    const labour = i < NEW_L;
    const p = labour ? at('labour', LABOUR0 - MOVED + i) : at('capital', capital0 + MOVED + (i - NEW_L));
    tiles.push({
      key: `n${i}`,
      x: p.x,
      y: state >= 2 ? p.y : p.y - DROP,
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

// The first card opens on the split before the shock (state 0) and moves
// the tiles once the figure has been in view for `hold` ms, so the move is
// seen on arrival without a step of its own. Reduced motion: state 1 at
// once. (Scene-local until the shared useEnterState lands.)
function useOpening(state, reduce, hold = 450) {
  const [ref, seen] = useInView({ rootMargin: '0px 0px -30% 0px' });
  const [go, setGo] = useState(false);
  useEffect(() => {
    if (!seen || go) return undefined;
    const t = setTimeout(() => setGo(true), hold);
    return () => clearTimeout(t);
  }, [seen, go, hold]);
  return [ref, state === 1 && !go && !reduce ? 0 : state];
}

export default function ShockTiles({ state, reduce = false }) {
  const [ref, s] = useOpening(state, reduce);
  return (
    <figure ref={ref} className="p2-figure p2-shock-fig" data-state={s}>
      <p className="story-figure-title">
        <Tx icon="gdp">Who output is paid to</Tx>
      </p>
      <p className="story-figure-unit">
        <Tx icon="measure" size={12}>
          One tile is one per cent of output before the shock. Illustrative: sizes are exaggerated.
        </Tx>
      </p>
      <div className="p2-tiles">
        <div className="p2-tile-heads" aria-hidden="true">
          <span style={{ '--sw': LABOUR_COLOR }}>Labour income</span>
          <span style={{ '--sw': CAPITAL_COLOR }}>Capital income</span>
        </div>
        <TileGrid tiles={shockTiles(s)} width={COLS * 2 + GAP} height={ROWS} label={LABELS[s]} />
      </div>
      <figcaption className="story-source">
        <Tx icon="caveat" size={12}>
          Illustration, not model output.
        </Tx>
      </figcaption>
    </figure>
  );
}
