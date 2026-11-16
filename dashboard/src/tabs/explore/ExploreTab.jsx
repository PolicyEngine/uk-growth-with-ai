'use client';

import ResultsTab from '@/tabs/ai/ResultsTab.jsx';
import WhoGainsTab from '@/tabs/cohorts/CohortsTab.jsx';
import AllScenarios from '@/tabs/explore/AllScenarios.jsx';
import HouseholdsExplore from '@/tabs/households/HouseholdsExplore.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import AnswerStrip from '@/tabs/explore/AnswerStrip.jsx';
import { sentenceItems } from '@/tabs/explore/direction.jsx';
import { iconFor } from '@/lib/concepts.js';
import RuleBar from '@/tabs/explore/RuleBar.jsx';
import { useNav, subOf } from '@/lib/nav.jsx';
import { economyAnswer, financesAnswer, allAnswer } from '@/tabs/explore/answers.js';

// An answer is a strip of chips, or a sentence when the view is not solved.
const answerOf = (a) => <AnswerStrip a={typeof a === 'string' ? { drivers: sentenceItems(a) } : a} />;
// Who gains is UK central only, so its answer does not move with the pickers.
const WHO_ANSWER = {
  context: 'UK central only · lifetime welfare by birth year and earnings group',
  drivers: [
    { key: 'old', icon: 'age', text: 'Adults around retirement age gain most' },
    { key: 'why', icon: 'capital', text: 'They hold more wealth and collect the higher return' },
    { key: 'young', icon: 'young', text: 'The youngest adults gain least or lose' },
    { key: 'how', icon: 'range', text: 'How many lose depends on how bequests and later fiscal cost count' },
  ],
};

// Explore: every interactive view. Each sub-tab opens with its question and
// a short answer in items that follows the pickers, then the charts. Economy
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
        <PageIntro icon={iconFor('gdp')} question="How do pay, national income and GDP move when AI arrives in 2028?" answer={answerOf(economyAnswer(st.s, st.closure, st.rule))}>
          <RuleBar />
        </PageIntro>
        <ResultsTab sub="income" />
        <ResultsTab sub="economy" />
      </>
    );
  else if (sub === 'finances')
    body = (
      <>
        <PageIntro icon={iconFor('finances')} question="What happens to public debt and tax under each fiscal rule?" answer={answerOf(financesAnswer(st.s, st.closure, st.rule))}>
          <RuleBar />
        </PageIntro>
        <ResultsTab sub="finances" />
      </>
    );
  else if (sub === 'who')
    body = (
      <>
        <PageIntro icon={iconFor('welfare')} question="Who gains and who loses, by birth year and lifetime earnings?" answer={answerOf(WHO_ANSWER)} />
        <div id="explore-sub-who-inner">
          <WhoGainsTab />
        </div>
      </>
    );
  else if (sub === 'all')
    body = (
      <>
        <PageIntro icon={iconFor('cells')} question="How much do the results depend on the scenario, the closure and the fiscal rule?" answer={answerOf(allAnswer())} />
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
