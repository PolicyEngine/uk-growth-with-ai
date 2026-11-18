import { EXPOSURE_GROUPS, FACTS, OBR, SERIES } from './data.js';

// Part 1's figure titles as findings (story-finding-titles-fable.md): each
// a sentence of at most ten words with no result figure, true of the data
// it is drawn from (four of Fable's titles ran to 11 words and lost one),
// with a fallback (marked `fallback`, check_text's
// data-title-fallback) when its condition fails. { title, fallback }.
const find = (ok, title, fallback) => (ok ? { title, fallback: false } : { title: fallback, fallback: true });

const g = SERIES.gdp_growth;
// the ten years 2010-19
const tens = g.x.map((x, i) => [x, g.y[i]]).filter(([x]) => x >= 2010 && x <= 2019).map(([, y]) => y);
// below at least 6 of the ten 2010s years
const belowMost = (v) => tens.length === 10 && tens.filter((t) => v < t).length >= 6;

// p1-output, state 0: every year from 2023 below most 2010s rates
export const SINCE_YEAR = 2023;
export function outputTitle() {
  const recent = g.x.map((x, i) => [x, g.y[i]]).filter(([x]) => x >= SINCE_YEAR);
  return find(recent.length > 0 && recent.every(([, y]) => belowMost(y)), `Annual growth since ${SINCE_YEAR} has been below most 2010s rates`, 'Real GDP growth, year by year');
}
// p1-output, state 1: every forecast year below most 2010s rates
export function forecastTitle() {
  const x1 = OBR.x[OBR.x.length - 1];
  return find(OBR.y.length > 0 && OBR.y.every(belowMost), `The OBR forecasts growth below most 2010s rates to ${x1}`, 'Real GDP growth, year by year');
}

// p1-work: one title per panel
const yearOf = (x) => Number(String(x).slice(0, 4));
export function employmentTitle() {
  const e = SERIES.employment_rate;
  const max = Math.max(...e.y);
  const at = e.x[e.y.indexOf(max)];
  const early2020 = /^2020 (JAN|FEB|MAR)/.test(at);
  return find(e.y[e.y.length - 1] < max && early2020, 'The employment rate is below its early 2020 peak', 'The employment rate, month by month');
}
export function payTitle() {
  const p = SERIES.pay_growth;
  const tenMax = Math.max(...p.y.filter((_, i) => yearOf(p.x[i]) >= 2010 && yearOf(p.x[i]) <= 2019));
  const peak = Math.max(...p.y);
  const peakYear = yearOf(p.x[p.y.indexOf(peak)]);
  return find(p.y[p.y.length - 1] <= tenMax && peak > tenMax, 'Regular pay growth is back inside its 2010s range', `Regular pay growth has slowed since its ${peakYear} peak`);
}
export function productivityTitle() {
  const o = SERIES.productivity_oph;
  const before = o.y.filter((_, i) => yearOf(o.x[i]) < 2020);
  return find(before.length > 0 && o.y[o.y.length - 1] > Math.max(...before), 'Output per hour is higher than any quarter before 2020', 'Output per hour, quarter by quarter');
}

// p1-work step sentences: each claim from the series, so a new release
// cannot leave one false. Employment against the same three months a year
// earlier, "close" within 0.5 percentage points (the threshold
// part1.test.jsx has always held it to); pay growth against its peak;
// output per hour against its 2023 average, "back at" within 0.5 index
// points.
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
export const NEAR_PP = 0.5;
export function employmentSay() {
  const e = SERIES.employment_rate;
  const last = e.x[e.x.length - 1];
  const i = e.x.indexOf(`${yearOf(last) - 1} ${String(last).slice(5)}`);
  if (i < 0) return 'is shown month by month';
  const d = e.y[e.y.length - 1] - e.y[i];
  return Math.abs(d) <= NEAR_PP ? 'is close to its level a year ago' : d > 0 ? 'is higher than a year ago' : 'is lower than a year ago';
}
export function paySay() {
  const p = SERIES.pay_growth;
  const peak = Math.max(...p.y);
  const year = yearOf(p.x[p.y.indexOf(peak)]);
  return p.y[p.y.length - 1] < peak ? `has slowed since its ${year} peak` : `is at its highest since ${yearOf(p.x[0])}`;
}
export const OPH_SINCE = 2023;
export function productivitySay() {
  const o = SERIES.productivity_oph;
  const base = o.y.filter((_, i) => yearOf(o.x[i]) === OPH_SINCE);
  if (!base.length) return null;
  const d = o.y[o.y.length - 1] - mean(base);
  return Math.abs(d) < NEAR_PP ? `is back at its ${OPH_SINCE} level` : d > 0 ? `is higher than in ${OPH_SINCE}` : `is lower than in ${OPH_SINCE}`;
}

// p1-ai, state 0: how many times business use has grown since the first wave
const MONTHS = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', June: 'June', Jun: 'June', July: 'July', Jul: 'July', Aug: 'August', Sept: 'September', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };
// '24 Sept 2023' -> 'September 2023'
export const monthLong = (d) => d.replace(/^\d+ /, '').replace(/^(\w+)/, (m) => MONTHS[m] ?? m);
export function aiTitle() {
  const a = SERIES.business_ai_use;
  const b = SERIES.business_ai_use_10plus;
  const r = Math.min(a.y[a.y.length - 1] / a.y[0], b.y[b.y.length - 1] / b.y[0]);
  const since = monthLong(a.x[0]);
  if (r > 3) return find(true, `Business AI use has more than tripled since ${since}`);
  if (r > 2) return find(true, `Business AI use has more than doubled since ${since}`);
  return find(false, null, `Business AI use has risen since ${since}`);
}
// p1-ai, state 1 (both tile states): three groups within 5 points
export function workersTitle() {
  const v = EXPOSURE_GROUPS.map((x) => x.value);
  return find(Math.max(...v) - Math.min(...v) <= 5, 'UK workers split into three near-equal groups by AI exposure', 'UK workers by exposure to AI');
}
// 'IMF estimate, July 2024' -> 'July 2024'
export const WORKERS_PERIOD = String(FACTS.workers_low_exposure.period ?? '').replace(/^IMF estimates?,\s*/, '');
