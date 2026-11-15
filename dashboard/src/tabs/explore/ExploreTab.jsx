'use client';

import ResultsTab from '@/tabs/ai/ResultsTab.jsx';
import WhoGainsTab from '@/tabs/cohorts/CohortsTab.jsx';
import AllScenarios from '@/tabs/explore/AllScenarios.jsx';
import HouseholdsExplore from '@/tabs/households/HouseholdsExplore.jsx';
import { useNav, subOf } from '@/lib/nav.jsx';

// Explore: every interactive view. Economy (income and output, then the
// rest of the economy), Public finances and Who gains follow the header
// pickers; All scenarios shows every cell at once; Households is the
// uk-ai-study detail. Each sub-tab's own sections keep their ids, which
// links and scripts/dumptabs.mjs use.
export default function ExploreTab() {
  const { st } = useNav();
  const sub = subOf(st, 'explore');
  let body;
  if (sub === 'economy')
    body = (
      <>
        <ResultsTab sub="income" />
        <ResultsTab sub="economy" />
      </>
    );
  else if (sub === 'finances') body = <ResultsTab sub="finances" />;
  else if (sub === 'who')
    body = (
      <div id="explore-sub-who-inner">
        <WhoGainsTab />
      </div>
    );
  else if (sub === 'all') body = <AllScenarios />;
  else body = <HouseholdsExplore />;
  return (
    <div id={`explore-sub-${sub}`} role="tabpanel" aria-labelledby={`explore-subbtn-${sub}`} className="sub-panel">
      {body}
    </div>
  );
}
