// Part 2's caveats (economics review, round 1), in words read from the data
// files for the scenario and closure in view. Each fact they qualify has its
// home elsewhere (Explore, Method, Who gains), so they print no figure:
// shares become "about half", counts "one in six", and each line links the
// figure's home. Every function returns null when a solve is pending or the
// caveat does not hold for the cell in view.
import S from '@/data/surprise2028.json';
import C from '@/data/cohorts2028.json';
import { YEARS, HEADLINE_YEAR, LATE_YEAR, CENTRAL, BOUND, gap, result } from '@/tabs/ai/surprise.js';
import { EPS2 } from './dir.js';

const H = YEARS.indexOf(HEADLINE_YEAR);

// A ratio as words, or null outside the range a phrase fits.
// The nearest of five fractions: "about" within 0.03 of it, otherwise
// "over" or "under" it; null below a fifth or above 0.85.
const FRACS = [
  [1 / 4, 'a quarter'],
  [1 / 3, 'a third'],
  [1 / 2, 'half'],
  [2 / 3, 'two-thirds'],
  [3 / 4, 'three-quarters'],
];
export function fracWord(r) {
  if (!Number.isFinite(r) || r < 0.2 || r > 0.85) return null;
  const [f, w] = FRACS.reduce((a, b) => (Math.abs(b[0] - r) < Math.abs(a[0] - r) ? b : a));
  return `${Math.abs(r - f) < 0.03 ? 'about' : r < f ? 'under' : 'over'} ${w}`;
}

// A share of people (per cent) as "one in six", "more than two in five".
export function peopleWord(pct) {
  if (!Number.isFinite(pct) || pct <= 0) return null;
  if (pct >= 50) return 'more than half';
  if (pct >= 40) return 'more than two in five';
  if (pct >= 33) return 'about one in three';
  return `about one in ${Math.round(100 / pct)}`;
}

// Headline figures: how much of the main arm's GDP gain the technology-
// unchanged arm (the share shift alone, capital drawn in) gives, and net
// national income against GDP. Each null when it does not fit.
export function headlineShares(sid, cl) {
  const y = gap(sid, 'tfp', cl, 'Y');
  const tz = gap(sid, 'tz', cl, 'Y');
  const nni = gap(sid, 'tfp', cl, 'NNI');
  if (y == null || y <= EPS2) return { capital: null, nni: null };
  return {
    capital: tz != null && tz > 0 ? fracWord(tz / y) : null,
    nni: nni != null && nni > 0 ? fracWord(nni / y) : null,
  };
}

// The pay tile: the wage gap's sign at closed capital, the central closure
// and the half-foreign sensitivity (zk0.5). 'flips' when the signs differ.
export function paySigns(sid) {
  const sens = S.sensitivity?.['zk0.5']?.results?.[sid]?.tfp;
  const ws = [gap(sid, 'tfp', BOUND, 'w'), gap(sid, 'tfp', CENTRAL, 'w'), sens?.status === 'done' ? sens.gaps.w[H] : null].filter((x) => x != null);
  if (ws.length < 2) return null;
  const signs = new Set(ws.map((w) => (Math.abs(w) < EPS2 ? 0 : Math.sign(w))));
  return signs.size > 1 ? 'flips' : null;
}

// The stress test: output at fixed inputs ends below the technology-
// unchanged arm's (a productivity loss built in to hold GDP on the path).
export function stressBelow(sid, cl) {
  const ss = result(sid, 'ss', cl);
  const tz = result(sid, 'tz', cl);
  if (ss.status !== 'done' || tz.status !== 'done') return false;
  return ss.Z_terminal < tz.Z_terminal;
}

// Public debt: what another fiscal setting does to the main arm's late-year
// gap. Fixed spending (solved for some scenarios) when it ends on the other
// side of the path, else OBR-style repricing when the rise is smaller.
export function debtRuleWord(sid, cl) {
  const main = gap(sid, 'tfp', cl, 'debt_gdp_pp', LATE_YEAR);
  if (main == null) return null;
  const side = (x) => (Math.abs(x) < EPS2 ? 0 : Math.sign(x));
  const f = S.rules?.fixed_spending?.results?.[sid]?.tfp?.[cl];
  const fixed = f?.status === 'done' ? f.gaps.debt_gdp_pp[YEARS.indexOf(LATE_YEAR)] : null;
  if (fixed != null && side(fixed) !== side(main)) return { kind: 'fixed', dir: fixed < 0 ? 'below' : fixed > 0 ? 'above' : 'on' };
  const rep = result(sid, 'tfp', cl).debt_gdp_pp_obr_repricing_late;
  if (Number.isFinite(rep) && main > EPS2 && rep < main) return { kind: 'repricing', dir: rep < 0 ? 'below' : 'smaller' };
  return null;
}

// Who gains (UK central, central closure, debt-neutral transfers): what the
// adults' average is made of, and who loses when transfers bear the cost
// after the solved years (cohorts2028.json dnfull, solved to the horizon).
export function welfareWords() {
  const c = C.closures?.[CENTRAL]?.rules?.dn?.tfp;
  if (!c?.parts_alive || !(c.alive_avg > 0)) return null;
  const p = c.parts_alive;
  const bequests = fracWord(p.bequests / c.alive_avg);
  const r = p.consumption / c.alive_avg;
  const consumption = r > 0 && r < 0.1 ? 'under a tenth' : fracWord(r);
  const full = C.dnfull?.ready && C.dnfull.closure === CENTRAL ? C.dnfull : null;
  const hold = full?.by_fill?.hold;
  const ages = hold?.by_age ? Object.keys(hold.by_age).map(Number).sort((a, b) => a - b) : [];
  const young = ages.length && Object.values(full.by_fill).every((f) => f.by_age?.[ages[0]]?.[0] < 0) ? ages[0] : null;
  const lose = full ? Math.min(...full.range.joint_losing_pct) : null;
  const loseNb = full ? Math.min(...full.range.no_bequest_losing_pct) : null;
  return { bequests, consumption, young, lose: peopleWord(lose), loseNb: peopleWord(loseNb) };
}
