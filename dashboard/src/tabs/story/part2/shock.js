// The shock scene's numbers (#p2-shock, ShockTiles.jsx): pure functions of
// the data file, tested in part2.test.jsx.
//
// The overview: one tile is 1 of every 100 of GDP on the OBR's central
// forecast path, labour's tiles left, capital's right; it never changes.
// The strip below magnifies the outlined tiles: one small tile is 0.1.
// Two moves happen in the strip, in turn (the model builds both up
// together from the surprise year to the split year):
//   1  the share shift, a scenario input: M = input x 10 small tiles cross
//      from labour to capital, at the path's GDP;
//   2  the added output, an OG-UK result: N = GDP change x 10 new small
//      tiles, NL to labour at the labour share after the shift, NK to
//      capital.
// change in labour income = (s1 - s0) Y0 + s1 dY, which the counts follow
// to within a small tile (rounding).
import { S, SCENARIOS, YEARS } from '@/tabs/ai/surprise.js';
import { SPLIT_YEAR, splitFor } from './split.js';

// The small-tile counts, from the baseline split, the change (null while
// pending) and the share-shift input (pp).
export function shockCounts(base, ch, inputPp) {
  const M = Math.round(inputPp * 10);
  let N = null;
  let NL = null;
  let NK = null;
  if (ch) {
    const s1 = (base.labour + ch.labour) / (100 + ch.gdp);
    N = Math.max(0, Math.round(ch.gdp * 10));
    NL = Math.min(N, Math.max(0, Math.round(s1 * ch.gdp * 10)));
    NK = N - NL;
  }
  const L0 = Math.round(base.labour);
  // labour tiles magnified, and rows of the strip
  const RL = Math.max(1, Math.ceil(M / 10));
  const R = Math.max(3, RL, Math.ceil((10 + M + (NK ?? 0)) / 10), Math.ceil((RL * 10 - M + (NL ?? 0)) / 10));
  return { M, N, NL, NK, L0, RL, R };
}

// { cl, base, ch, M, N, NL, NK, L0, RL, R, inputPp, moreCapital } for the
// header's scenario and closure ("both" draws some foreign capital). With
// the baseline pending, base is null and so are the counts.
export function shockFor(sid, closure) {
  const { cl, base, ch } = splitFor(sid, closure);
  const inputPp = SCENARIOS.find((s) => s.id === sid)?.labour_share_fall_pp ?? 0;
  const r = S.results?.[sid]?.tfp?.[cl];
  const i = YEARS.indexOf(SPLIT_YEAR);
  const k = r?.status === 'done' ? r.gaps?.K?.[i] : null;
  const moreCapital = k == null ? null : k > 0;
  if (!base) return { cl, base: null, ch, inputPp, moreCapital, M: Math.round(inputPp * 10), N: null, NL: null, NK: null, L0: null, RL: null, R: null };
  return { cl, base, ch, inputPp, moreCapital, ...shockCounts(base, ch, inputPp) };
}

// Geometry: the overview's groups of 8 columns with 2 between, 9 rows; the
// strip's windows of 10 columns with 2 between.
export const COLS = 8;
export const ROWS = 9;
export const GAP = 2;
export const WIN = 10;
export const LABOUR_COLOR = 'var(--c-labour)';
export const CAPITAL_COLOR = 'var(--c-capital)';
// the lead before a forward move (the card's sentence first), and the drop
export const LEAD = 450;
export const DROP = 700;
const TRAVEL = 750;

const at = (group, i) => ({ x: (group === 'capital' ? COLS + GAP : 0) + (i % COLS), y: ROWS - 1 - Math.floor(i / COLS) });

// The overview: L0 labour tiles, 100 - L0 capital tiles, the tiles the strip
// magnifies outlined (labour's last RL, capital's last). Static.
export function overviewTiles(shock) {
  const { L0, RL } = shock;
  const tiles = [];
  for (let i = 0; i < L0; i++) tiles.push({ key: `l${i}`, ...at('labour', i), color: LABOUR_COLOR, group: 'labour', delay: 0, mark: i >= L0 - RL });
  for (let i = 0; i < 100 - L0; i++) tiles.push({ key: `c${i}`, ...at('capital', i), color: CAPITAL_COLOR, group: 'capital', delay: 0, mark: i === 100 - L0 - 1 });
  return tiles;
}

// Per-tile delay steps (ms): movers at most 90 apart over 650, new tiles at
// most 170 apart over 800.
const moveStep = (M) => (M > 1 ? Math.min(90, 650 / (M - 1)) : 0);
const dropStep = (N) => (N > 1 ? Math.min(170, 800 / (N - 1)) : 0);

// The strip at a state (0 before, 1 after the shift, 2 with the added
// output). `lead`: 450 when the state moved forward by scrolling, else 0;
// `enter`: new tiles drop in (class is-new), only on a forward move.
export function shockTiles(state, shock, { lead = 0, enter = false } = {}) {
  const { M, NL, NK, RL, R } = shock;
  const nL = RL * WIN;
  const pos = (side, slot) => ({ x: (side === 'capital' ? WIN + GAP : 0) + (slot % WIN), y: R - 1 - Math.floor(slot / WIN) });
  const tiles = [];
  const ms = moveStep(M);
  for (let i = 0; i < nL; i++) {
    const k = i - (nL - M);
    const moved = state >= 1 && k >= 0;
    tiles.push({
      key: `zl${i}`,
      ...(moved ? pos('capital', WIN + k) : pos('labour', i)),
      color: moved ? CAPITAL_COLOR : LABOUR_COLOR,
      group: moved ? 'moved' : 'labour',
      delay: k >= 0 ? Math.round(lead + k * ms) : 0,
    });
  }
  for (let i = 0; i < WIN; i++) tiles.push({ key: `zc${i}`, ...pos('capital', i), color: CAPITAL_COLOR, group: 'capital', delay: 0 });
  if (state >= 2 && NL != null) {
    const N = NL + NK;
    const ds = dropStep(N);
    for (let j = 0; j < N; j++) {
      const labour = j < NL;
      tiles.push({
        key: `zn${j}`,
        ...(labour ? pos('labour', nL - M + j) : pos('capital', WIN + M + (j - NL))),
        color: labour ? LABOUR_COLOR : CAPITAL_COLOR,
        group: 'new',
        delay: Math.round(lead + j * ds),
        className: enter ? 'is-new' : undefined,
      });
    }
  }
  return tiles;
}

// When the move into `state` has landed (ms after the state change), for
// the caption's delay: the last tile's delay plus its travel or drop.
export function settleMs(state, shock, lead) {
  if (state === 1) return lead + Math.round(Math.max(0, shock.M - 1) * moveStep(shock.M)) + TRAVEL;
  if (state === 2 && shock.N) return lead + Math.round((shock.N - 1) * dropStep(shock.N)) + DROP;
  return lead;
}
