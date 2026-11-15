'use client';

import ResultsTab from '@/tabs/ai/ResultsTab.jsx';
import WhoGainsTab from '@/tabs/cohorts/CohortsTab.jsx';
import { useNav, subOf } from '@/lib/nav.jsx';

// Explore: every view the header pickers change. Income and output,
// Economy and Public finances (once the Results tab) and Who gains.
export default function ExploreTab() {
  const { st } = useNav();
  const sub = subOf(st, 'explore');
  return sub === 'who' ? (
    <div id="explore-sub-who" role="tabpanel" aria-labelledby="explore-subbtn-who" className="sub-panel">
      <WhoGainsTab />
    </div>
  ) : (
    <ResultsTab sub={sub} />
  );
}
