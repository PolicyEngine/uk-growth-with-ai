'use client';

import { NavLink } from '@/lib/nav.jsx';
import { AI_STUDY } from '@/tabs/code/ledger.js';
import { REPLICATE as OGUK_REPLICATE } from './sources.js';

// The reverse of "More in Method": under each Method section, the charts and
// Story steps that use it, as small icon link chips. Every target is an id
// that exists on its page (checked by uses.test.js, and by a click-through in
// the builder's Playwright run); links to Explore > All scenarios are left
// out while it folds into Economy.
export const USES = {
  'm-model': [
    { tab: 'explore', sub: 'economy', anchor: 'explore-part-economy', icon: 'gdp', label: 'Economy charts' },
    { tab: 'explore', sub: 'who', anchor: 'welfare-chart', icon: 'generations', label: 'Welfare by birth year' },
  ],
  'm-shock': [
    { tab: 'story', anchor: 'p2-shock-1', icon: 'story', label: 'Story, part 2: the shift' },
    { tab: 'explore', sub: 'economy', anchor: 'explore-part-economy', icon: 'labour', label: 'Labour share chart' },
  ],
  'm-scenarios': [
    { tab: 'story', anchor: 'p2-scen-2', icon: 'story', label: 'Story, part 2: the scenarios' },
    { tab: 'story', anchor: 'p2-arms-0', icon: 'compare', label: 'Story, part 2: the arms' },
  ],
  'm-closures': [
    { tab: 'explore', sub: 'economy', anchor: 'measures', icon: 'gni', label: 'Pay, income and output' },
    { tab: 'explore', sub: 'economy', anchor: 'explore-part-income', icon: 'gdp', label: 'Income and output' },
    { tab: 'story', anchor: 'p2-arms-2', icon: 'story', label: 'Story, part 2: stress test' },
  ],
  'm-rules': [
    { tab: 'explore', sub: 'finances', anchor: 'fiscal-rule', icon: 'rule', label: 'What the fiscal rule changes' },
    { tab: 'explore', sub: 'finances', anchor: 'explore-part-finances', icon: 'finances', label: 'Public finances' },
  ],
  'm-path': [{ tab: 'story', anchor: 'p2-morph-2', icon: 'story', label: 'Story, part 2: growth to a gap' }],
  'm-limits': [
    { tab: 'explore', sub: 'finances', anchor: 'tax-gap', icon: 'tax', label: 'Tax effect card' },
    { tab: 'explore', sub: 'economy', anchor: 'explore-part-economy', icon: 'capital', label: 'Investment chart' },
  ],
  'hm-data': [
    { tab: 'story', anchor: 'story-part-3', icon: 'story', label: 'Story, part 3' },
    { tab: 'explore', sub: 'households', anchor: 'hh-cost', icon: 'cost', label: 'Households: the cost' },
  ],
  'hm-rules': [
    { tab: 'story', anchor: 'p3-rules-step', icon: 'story', label: 'Story, part 3: five rules' },
    { tab: 'explore', sub: 'households', anchor: 'hh-rules', icon: 'draws', label: 'Households: the rules' },
  ],
  'hm-takeup': [{ tab: 'explore', sub: 'households', anchor: 'hh-ladder', icon: 'takeUp', label: 'Households: take-up and JSA' }],
};

// Replication: the code and the result file behind each section. OG-UK's at
// the commit the results were built from; the household study's at the
// study's commit (read from aiStudy2425.json).
const study = AI_STUDY.blob;
export const REPLICATE = {
  ...OGUK_REPLICATE,
  'hm-data': [{ label: 'data.py', url: study('uk_ai_study/data.py') }, { label: 'BUILD_MANIFEST.json', url: study('results/BUILD_MANIFEST.json') }],
  'hm-exposure': [{ label: 'exposure.py', url: study('uk_ai_study/exposure.py') }],
  'hm-shock': [{ label: 'shocks.py', url: study('uk_ai_study/shocks.py') }, { label: 'central.json', url: study('results/central.json') }],
  'hm-rules': [{ label: 'incidence_scenarios.py', url: study('analysis/incidence_scenarios.py') }, { label: 'incidence results', url: study('results/incidence/summary_five.csv') }],
  'hm-takeup': [{ label: 'displaced_takeup_runs.py', url: study('analysis/displaced_takeup_runs.py') }, { label: 'takeup_runs.json', url: study('results/takeup/takeup_runs.json') }],
  'hm-draws': [{ label: 'runner.py', url: study('uk_ai_study/runner.py') }, { label: 'central.json', url: study('results/central.json') }],
};

// One small row of links under each Method section: the charts and Story
// steps that use it, then the code and result file to replicate it. Plain
// text links, no chips or icons.
export default function UsedBy({ id }) {
  const uses = USES[id] ?? [];
  const code = REPLICATE[id] ?? [];
  if (!uses.length && !code.length) return null;
  return (
    <p className="mx-uses" data-replicate={code.length ? id : undefined}>
      {uses.length ? (
        <span aria-label="Used by">
          <span className="mx-uses-label">Used by</span>
          {uses.map((u, i) => (
            <span key={`${u.tab}-${u.anchor}`}>
              {i ? ' · ' : ' '}
              <NavLink tab={u.tab} sub={u.sub} anchor={u.anchor}>
                {u.label}
              </NavLink>
            </span>
          ))}
        </span>
      ) : null}
      {code.length ? (
        <span>
          <span className="mx-uses-label">Replicate</span>
          {code.map((r, i) => (
            <span key={r.url}>
              {i ? ' · ' : ' '}
              <a href={r.url} target="_blank" rel="noreferrer">
                {r.label}
              </a>
            </span>
          ))}
        </span>
      ) : null}
    </p>
  );
}
