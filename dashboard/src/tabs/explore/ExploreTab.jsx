'use client';

import ResultsTab from '@/tabs/ai/ResultsTab.jsx';
import WhoGainsTab from '@/tabs/cohorts/CohortsTab.jsx';
import AllScenarios from '@/tabs/explore/AllScenarios.jsx';
import HouseholdsExplore from '@/tabs/households/HouseholdsExplore.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import RuleBar from '@/tabs/explore/RuleBar.jsx';
import { useNav, subOf } from '@/lib/nav.jsx';
import { economyAnswer, financesAnswer, allAnswer } from '@/tabs/explore/answers.js';

// Explore: every interactive view. Each sub-tab opens with its question and
// a one-sentence answer that follows the pickers, then the charts. Economy
// (income and output, then the rest of the economy) and Public finances
// follow the header pickers and the fiscal rule; Who gains is UK central
// only; All scenarios shows every cell at once; Households is the
// uk-ai-study detail (its own page). Each sub-tab's sections keep their ids,
// which links and scripts/dumptabs.mjs use.
export default function ExploreTab() {
  const { st } = useNav();
  const sub = subOf(st, 'explore');
  let body;
  if (sub === 'economy')
    body = (
      <>
        <PageIntro icon="factory" question="How do pay, national income and GDP move when AI arrives in 2028?" answer={economyAnswer(st.s, st.closure, st.rule)}>
          <RuleBar />
        </PageIntro>
        <ResultsTab sub="income" />
        <ResultsTab sub="economy" />
      </>
    );
  else if (sub === 'finances')
    body = (
      <>
        <PageIntro icon="landmark" question="What happens to public debt and tax under each fiscal rule?" answer={financesAnswer(st.s, st.closure, st.rule)}>
          <RuleBar />
        </PageIntro>
        <ResultsTab sub="finances" />
      </>
    );
  else if (sub === 'who')
    body = (
      <>
        <PageIntro
          icon="usersRound"
          question="Who gains and who loses, by birth year and lifetime earnings?"
          answer="In UK central, adults around retirement age, who hold more wealth, gain most from the higher return on capital; the youngest adults gain least or lose. How many adults lose depends on how bequests and the later fiscal cost are counted."
        />
        <div id="explore-sub-who-inner">
          <WhoGainsTab />
        </div>
      </>
    );
  else if (sub === 'all')
    body = (
      <>
        <PageIntro icon="layoutGrid" question="How much do the results depend on the scenario, the closure and the fiscal rule?" answer={allAnswer()} />
        <AllScenarios />
      </>
    );
  else body = <HouseholdsExplore />;
  return (
    <div id={`explore-sub-${sub}`} role="tabpanel" aria-labelledby={`explore-subbtn-${sub}`} className="sub-panel" key={sub}>
      {body}
    </div>
  );
}
