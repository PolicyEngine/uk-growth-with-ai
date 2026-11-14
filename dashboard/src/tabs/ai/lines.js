// The lines a results chart draws for the reader's choices: the arms in
// view (control bar) at the closure(s) chosen in the header.
import {
  YEARS, CENTRAL, BOUND, ARMS, ARM_COLOR, ARM_TEXT_COLOR, ARM_LIGHT, result, signed,
} from '@/tabs/ai/surprise.js';
import { closureLabel } from '@/lib/labels.js';
import { SCEN_NAME } from '@/tabs/ai/surprise.js';

export const closuresFor = (closure) => (closure === 'closed' ? [BOUND] : closure === 'both' ? [CENTRAL, BOUND] : [CENTRAL]);
// The closure a single-valued element (a sentence, a tile) reads
export const primaryClosure = (closure) => (closure === 'closed' ? BOUND : CENTRAL);
export const closureWords = (closure) => (closure === 'closed' ? 'closed capital' : closure === 'both' ? 'both closures' : 'central closure');
const CL_NAME = { [CENTRAL]: 'central closure', [BOUND]: 'closed capital' };

export function seriesFor(sid, v, years, arms, closure, scale = 1) {
  return ARMS.filter((a) => arms.includes(a.id)).flatMap((a) =>
    closuresFor(closure).flatMap((cl) => {
      const r = result(sid, a.id, cl);
      if (r.status !== 'done') return [];
      const bound = cl === BOUND;
      const both = closure === 'both';
      return [{
        key: `${a.id}-${bound ? 'b' : 'c'}`,
        arm: a.id,
        label: a.short || a.label,
        closure: CL_NAME[cl],
        color: ARM_COLOR[a.id],
        textColor: ARM_TEXT_COLOR[a.id],
        light: ARM_LIGHT[a.id],
        dashed: bound && both,
        noEndLabel: bound && both,
        values: years.map((y) => r.gaps[v][YEARS.indexOf(y)] * scale),
      }];
    }),
  );
}

// Arms in view whose closed-capital solve is pending
export function boundPending(sid, arms, closure) {
  if (closure === 'central') return [];
  return ARMS.filter((a) => arms.includes(a.id) && result(sid, a.id, BOUND).status !== 'done').map((a) => a.short || a.label);
}

export function emptyText(arms, closure) {
  if (!arms.length) return 'Every arm is hidden. Choose one under Arms above.';
  if (closure === 'closed') return 'The closed-capital results for this scenario are not solved yet. Choose Central under Closure at the top of the page.';
  return 'This scenario is not solved yet.';
}

// What a download says was selected
export const contextLine = (sid, closure, extra) =>
  [SCEN_NAME[sid], closureLabel(closure) + (closure === 'both' ? ' closures' : closure === 'central' ? ' closure' : ''), extra].filter(Boolean).join(' · ');

// A chart's lines as a CSV table: one row per year, one column per line
export function seriesTable(years, series, unit) {
  return {
    columns: ['Year', ...series.map((s) => `${s.label}, ${s.closure} (${unit})`)],
    rows: years.map((y, i) => [y, ...series.map((s) => s.values[i])]),
  };
}

export const legendOf = (series) => series.map((s) => ({ label: `${s.label}${s.dashed ? ', closed capital' : ''}`, color: `var(--x)`.length ? cssColor(s.color) : s.color, dashed: s.dashed }));
function cssColor(c) {
  const m = /^var\((--[\w-]+)\)$/.exec(c);
  if (!m || typeof document === 'undefined') return c;
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || c;
}

// "above", "below" or "on" the path, for a finding sentence without figures
export const side = (x) => (Math.abs(x) < 0.005 ? 'on' : x > 0 ? 'above' : 'below');
export { signed };
