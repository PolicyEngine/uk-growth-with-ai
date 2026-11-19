// The lines a results chart draws for the reader's choices: the arms in
// view (control bar) at the closure(s) chosen in the header.
import {
  YEARS, CENTRAL, BOUND, ARMS, ARM_COLOR, ARM_TEXT_COLOR, ARM_LIGHT, resultAt, ruleSolved, solvedUnder, signed,
} from '@/tabs/ai/surprise.js';
import { closureLabel, ruleLabel } from '@/lib/labels.js';
import { SCEN_NAME } from '@/tabs/ai/surprise.js';

export const closuresFor = (closure) => (closure === 'closed' ? [BOUND] : closure === 'both' ? [CENTRAL, BOUND] : [CENTRAL]);
// The closure a single-valued element (a sentence, a tile) reads
export const primaryClosure = (closure) => (closure === 'closed' ? BOUND : CENTRAL);
export const closureWords = (closure) => (closure === 'closed' ? 'no foreign capital' : closure === 'both' ? 'both foreign-capital cases' : 'some foreign capital');
const CL_NAME = { [CENTRAL]: 'some foreign capital', [BOUND]: 'no foreign capital' };

export function seriesFor(sid, v, years, arms, closure, scale = 1, rule = 'common') {
  return ARMS.filter((a) => arms.includes(a.id)).flatMap((a) =>
    closuresFor(closure).flatMap((cl) => {
      const r = resultAt(sid, a.id, cl, rule);
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

// Arms in view whose no-foreign-capital solve is pending
export function boundPending(sid, arms, closure, rule = 'common') {
  if (closure === 'central' || !ruleSolved(rule, sid)) return [];
  return ARMS.filter((a) => arms.includes(a.id) && resultAt(sid, a.id, BOUND, rule).status !== 'done').map((a) => a.short || a.label);
}

// Why a scenario has no lines under a fiscal rule, naming what is solved.
export function ruleGapText(rule, sid) {
  if (ruleSolved(rule, sid)) return null;
  const names = solvedUnder(rule).map((s) => s.label);
  // the partial 2027 export: a rule planned but with no scenario solved yet
  if (!names.length) return `${ruleLabel(rule)} is not yet solved for any scenario. Choose the common fiscal rule.`;
  return `${ruleLabel(rule)} is solved for ${names.join(' and ')} only. Choose ${names.join(' or ')} under Scenario, or the common fiscal rule.`;
}

export function emptyText(arms, closure, rule = 'common', sid = null) {
  if (!arms.length) return 'Every version is hidden. Choose one under Versions above.';
  if (sid && !ruleSolved(rule, sid)) return ruleGapText(rule, sid);
  if (closure === 'closed') return 'The no-foreign-capital results for this scenario are not solved yet. Choose Some under Foreign capital at the top of the page.';
  return 'This scenario is not solved yet.';
}

// What a download says was selected
export const contextLine = (sid, closure, extra, rule = 'common') =>
  [SCEN_NAME[sid], closureLabel(closure) + (closure === 'both' ? ' foreign-capital cases' : ''), ruleLabel(rule), extra].filter(Boolean).join(' · ');

// A chart's lines as a CSV table: one row per year, one column per line
export function seriesTable(years, series, unit) {
  return {
    columns: ['Year', ...series.map((s) => `${s.label}, ${s.closure} (${unit})`)],
    rows: years.map((y, i) => [y, ...series.map((s) => s.values[i])]),
  };
}

export const legendOf = (series) => series.map((s) => ({ label: `${s.label}${s.dashed ? ', no foreign capital' : ''}`, color: `var(--x)`.length ? cssColor(s.color) : s.color, dashed: s.dashed }));
function cssColor(c) {
  const m = /^var\((--[\w-]+)\)$/.exec(c);
  if (!m || typeof document === 'undefined') return c;
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || c;
}

// "above", "below" or "on" the path, for a finding sentence without figures
export const side = (x) => (Math.abs(x) < 0.005 ? 'on' : x > 0 ? 'above' : 'below');
export { signed };
