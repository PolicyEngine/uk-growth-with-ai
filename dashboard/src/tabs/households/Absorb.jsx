'use client';

import { fmtBn } from '@/tabs/story/part3/format.js';
import { D } from '@/tabs/story/part3/shared.jsx';
import { CENTRAL_RATE } from '@/tabs/story/part3/Central.jsx';

// Where a lost pound goes (moved from story part 3 in round 2: a different,
// smaller run). The study's "Household absorption of job loss by baseline
// decile" (results.tex): the OBR-sized run, job loss alone, from
// results/next_runs/obr_household_deciles.csv. Each income decile's earnings
// lost flow to four destinations. The card that drew it is gone (it was not
// rendered anywhere, item-20-fable.md); its graph and constants feed story
// part 3's Pound and the tests.

const S = D.sankey;
// Order: each small node sits between two tall ones, so labels never
// collide. Labels are short (the shared Sankey keeps about 112px for the last
// column's labels on phones); the value is the `sub`.
export const DESTS = [
  { id: 'disposable', key: 'disposable_bn', label: 'Disposable income', color: 'var(--c-loss)' },
  { id: 'benefits', key: 'benefits_bn', label: 'More benefits', color: 'var(--rank-2)' },
  { id: 'tax', key: 'tax_ni_bn', label: 'Less tax and NI', color: 'var(--rank-1)' },
  { id: 'other', key: 'other_bn', label: 'Other items', color: 'var(--pe-gray-400)' },
];
// Decile 1 carries the ranking caveat: its node and ribbons stay grey.
export const CAVEAT_GREY = 'var(--pe-gray-300)';

// The graph: income decile -> destination, £bn a year.
export function absorbGraph() {
  const nodes = [
    ...S.deciles.map((_, i) => ({ id: `d${i + 1}`, label: String(i + 1), color: i === 0 ? CAVEAT_GREY : 'var(--pe-gray-700)' })),
    ...DESTS.map((d) => ({ id: d.id, label: d.label, sub: fmtBn(S.total[d.key]), color: d.color })),
  ];
  const links = [];
  S.deciles.forEach((f, i) => {
    for (const d of DESTS) links.push({ source: `d${i + 1}`, target: d.id, value: f[d.key], color: i === 0 ? CAVEAT_GREY : d.color });
  });
  return { nodes, links };
}

// Statements about this run, from the data: whether it is smaller than the
// main case and whether disposable income takes most of the loss.
export const SMALLER = CENTRAL_RATE != null && S.displacement_rate_pct < CENTRAL_RATE;
export const MOST = S.total.disposable_bn > S.total.earnings_lost_bn / 2;

export const POUR_ORDER = DESTS.map((d) => d.id);
