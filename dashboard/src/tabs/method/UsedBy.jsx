'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';

// The reverse of "More in Method": under each Method section, the charts and
// Story steps that use it, as small icon link chips. Every target is an id
// that exists on its page (checked by uses.test.js and by a click-through in
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
  'hm-takeup': [{ tab: 'story', anchor: 'p3-takeup-step', icon: 'story', label: 'Story, part 3: take-up' }],
};

export default function UsedBy({ id }) {
  const list = USES[id];
  if (!list?.length) return null;
  return (
    <div className="mx-uses" aria-label="Used by">
      <span className="mx-uses-label">
        <Icon name={iconFor('link')} size={14} />
        Used by
      </span>
      <ul className="mx-uses-list">
        {list.map((u) => (
          <li key={`${u.tab}-${u.anchor}`}>
            <NavLink tab={u.tab} sub={u.sub} anchor={u.anchor} className="mx-use-chip">
              <Icon name={iconFor(u.icon)} size={14} />
              <span>{u.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
