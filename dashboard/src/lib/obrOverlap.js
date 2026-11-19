// How much of each scenario's productivity input the OBR's forecast path
// already has (issue #27, Maria's point 1; obr-overlap-fable.md, "keep and
// disclose"). Every figure the site prints about the overlap comes from
// here: the OBR's own curves (one cited source reading), the data's years
// and each scenario's input. Nothing is typed into a sentence.
//
// The source reading: OBR Briefing paper No.9, Chart B.4 (p.51), the level
// effect of AI on productivity, %, by OBR forecast year, read off the
// chart's vector data (both panels agree and sum to 2.28% at year 10,
// matching para B.9). The OBR publishes no central path between its J and S
// curves (para B.14: "somewhere between"), so the overlap is a range. It is
// an external reading, fixed like any citation, and does not move with a
// data swap; the clocks below do.
import { S, SCENARIOS, SURPRISE_YEAR, HEADLINE_YEAR, RAMP_STEPS, gap } from '@/tabs/ai/surprise.js';

export const OBR_B4_LEVEL = {
  J: [0.03, 0.06, 0.11, 0.19, 0.3, 0.47],
  S: [0.03, 0.08, 0.17, 0.33, 0.57, 0.88],
};
// The calendar year of the OBR's year 1 (BP9 starts its curves in the
// first forecast year): a property of the source, not of the runs.
export const OBR_YEAR_ONE = 2026;

const level = (curve, n) => (n <= 0 ? 0 : OBR_B4_LEVEL[curve][n - 1] ?? null);
const range = (f) => {
  const a = f('J');
  const b = f('S');
  return a == null || b == null ? null : { lo: Math.min(a, b), hi: Math.max(a, b) };
};

// Adoption clock: the scenario's year n of adoption against the OBR's year
// n. The headline year is year RAMP_STEPS of the shock in both data sets.
export const ADOPTION = range((c) => level(c, RAMP_STEPS));
// Calendar clock: what the OBR curves add over the shock's own calendar
// years (SURPRISE_YEAR to HEADLINE_YEAR), OBR year 1 being OBR_YEAR_ONE.
const obrYear = (y) => y - OBR_YEAR_ONE + 1;
export const CALENDAR = range((c) => {
  const end = level(c, obrYear(HEADLINE_YEAR));
  const start = level(c, obrYear(SURPRISE_YEAR) - 1);
  return end == null || start == null ? null : end - start;
});
// The adoption-clock year as a word ("year 4").
export const ADOPTION_YEAR = RAMP_STEPS;

// "0.19–0.33%": a range in per cent, two decimals, en dash.
export const pctRange = (r, dp = 2) => (r ? `${r.lo.toFixed(dp)}–${r.hi.toFixed(dp)}%` : null);

// Each scenario's productivity input, %, from the data's scenario list.
export const tfpInput = (sid) => {
  const x = S.scenarios.find((s) => s.id === sid)?.tfp_gain_pct;
  return typeof x === 'number' ? x : null;
};
// The labour-share input, pp (a fall, positive in the data).
export const shareInput = (sid) => {
  const x = S.scenarios.find((s) => s.id === sid)?.labour_share_fall_pp;
  return typeof x === 'number' ? x : null;
};

// The share of a scenario's productivity input the OBR path already has,
// on a clock: { lo, hi } as fractions, capped at 1 (the path can hold as
// much or more than the input). null when the input is missing.
export function overlapShare(sid, clock = ADOPTION) {
  const t = tfpInput(sid);
  if (!clock || !(t > 0)) return null;
  return { lo: Math.min(1, clock.lo / t), hi: Math.min(1, clock.hi / t) };
}
// The share as words: "all of it" when even the low end holds at least
// nine-tenths of the input; else "48–83%" (whole per cent, the high end
// capped at 100%).
export function overlapShareWords(sid, clock = ADOPTION) {
  const r = overlapShare(sid, clock);
  if (!r) return null;
  if (r.lo >= 0.9) return 'all or nearly all';
  return `${Math.round(r.lo * 100)}–${Math.round(r.hi * 100)}%`;
}
// Every scenario's share, in display order: [{ sid, name, words }].
export const overlapShares = (clock = ADOPTION) =>
  SCENARIOS.map((s) => ({ sid: s.id, name: s.label, words: overlapShareWords(s.id, clock) })).filter((x) => x.words);

// The sign caveat on a direction (obr-overlap-fable.md, "Direction
// chips"): does the sign of a main-version gap survive netting the OBR's
// own productivity effect? The model is close to linear in the
// productivity input, so the netted gap is the main version's less the
// slope (main less technology unchanged, per 1% of input) times the amount
// netted. The amount is the most the OBR path can hold on either clock,
// and never more than the input itself: min(input, the calendar clock's
// high end). For UK central and UK low that is the whole input, so the
// netted gap is "technology unchanged" exactly. true when the netted gap
// is on the other side of the path, or on it; false when the side holds;
// null when a solve is pending.
const EPS = 0.005;
const sideOf = (x) => (Math.abs(x) < EPS ? 0 : Math.sign(x));
export function nettedGap(sid, cl, v, year = HEADLINE_YEAR, rule = 'common') {
  const t = tfpInput(sid);
  const x = gap(sid, 'tfp', cl, v, year, rule);
  const z = gap(sid, 'tz', cl, v, year, rule);
  if (x == null || z == null || !(t > 0) || !CALENDAR) return null;
  const n = Math.min(t, CALENDAR.hi);
  return x - ((x - z) / t) * n;
}
export function signMayFlip(sid, cl, v, year = HEADLINE_YEAR, rule = 'common') {
  const x = gap(sid, 'tfp', cl, v, year, rule);
  const y = nettedGap(sid, cl, v, year, rule);
  if (x == null || y == null) return null;
  const a = sideOf(x);
  return a !== 0 && sideOf(y) !== a;
}
// The caveat's words, beside a direction that may not survive netting.
export const SIGN_CAVEAT = 'depends on the productivity gain; see “technology unchanged”';
// The amount of productivity input, %, whose netting takes a main-version
// gap to zero (linear, as above): x × input / (x − technology unchanged).
// null when pending or when netting moves the gap away from zero.
export function breakEven(sid, cl, v, year = HEADLINE_YEAR, rule = 'common') {
  const t = tfpInput(sid);
  const x = gap(sid, 'tfp', cl, v, year, rule);
  const z = gap(sid, 'tz', cl, v, year, rule);
  if (x == null || z == null || !(t > 0) || x === z) return null;
  const n = (x * t) / (x - z);
  return n > 0 ? n : null;
}
