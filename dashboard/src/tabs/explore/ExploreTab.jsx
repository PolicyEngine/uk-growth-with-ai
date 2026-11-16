'use client';

import ResultsTab from '@/tabs/ai/ResultsTab.jsx';
import WhoGainsTab, { whoAnswer } from '@/tabs/cohorts/CohortsTab.jsx';
import AllScenarios, { AcrossDebt } from '@/tabs/explore/AllScenarios.jsx';
import HouseholdsExplore from '@/tabs/households/HouseholdsExplore.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import AnswerStrip from '@/tabs/explore/AnswerStrip.jsx';
import { sentenceItems } from '@/tabs/explore/direction.jsx';
import { iconFor } from '@/lib/concepts.js';
import RuleBar from '@/tabs/explore/RuleBar.jsx';
import { RulePicker } from '@/tabs/ai/FinancesSection.jsx';
import { useNav, subOf } from '@/lib/nav.jsx';
import { economyAnswer, financesAnswer } from '@/tabs/explore/answers.js';

// An answer is a strip of chips, or a sentence when the view is not solved.
const answerOf = (a) => <AnswerStrip a={typeof a === 'string' ? { drivers: sentenceItems(a) } : a} />;

// Explore: every interactive view. Each sub-tab opens with its question and
// a short answer in items that follows the pickers, then the charts. Economy
// (income and output, then the rest of the economy) and Public finances
// follow the header pickers and the fiscal rule; Economy opens with "Across
// scenarios" (every cell at once, AllScenarios) and Public finances ends with
// debt/GDP in every cell (AcrossDebt). The All scenarios sub-tab is gone
// (lib/nav.jsx sends ?sub=all to #ex-across). Who gains is UK central
// only; Households is the
// uk-ai-study detail (its own page). Each sub-tab's sections keep their ids,
// which links and scripts/dumptabs.mjs use.
export default function ExploreTab() {
  const { st } = useNav();
  const sub = subOf(st, 'explore');
  let body;
  if (sub === 'economy')
    body = (
      <>
        <PageIntro icon={iconFor('gdp')} question="How do pay, national income and GDP move if AI arrives in 2028 (an assumed date)?" answer={answerOf(economyAnswer(st.s, st.closure, st.rule))}>
          <RuleBar />
        </PageIntro>
        <AllScenarios />
        <ResultsTab sub="income" />
        <ResultsTab sub="economy" />
      </>
    );
  else if (sub === 'finances')
    body = (
      <>
        <PageIntro icon={iconFor('finances')} question="What happens to public debt and tax under each fiscal rule?" answer={answerOf(financesAnswer(st.s, st.closure, st.rule))}>
          <RulePicker />
        </PageIntro>
        <ResultsTab sub="finances" />
        <AcrossDebt />
      </>
    );
  else if (sub === 'who')
    body = (
      <>
        <PageIntro icon={iconFor('welfare')} question="Who gains and who loses, by birth year and lifetime earnings?" answer={answerOf(whoAnswer(st.closure, st.wrule, st.arm))} />
        <div id="explore-sub-who-inner">
          <WhoGainsTab />
        </div>
      </>
    );
  else body = <HouseholdsExplore />;
  return (
    <div id={`explore-sub-${sub}`} role="tabpanel" aria-labelledby={`explore-subbtn-${sub}`} className="sub-panel" key={sub}>
      {body}
    </div>
  );
}
