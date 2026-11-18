'use client';

import ResultsTab from '@/tabs/ai/ResultsTab.jsx';
import WhoGainsTab, { whoAnswer } from '@/tabs/cohorts/CohortsTab.jsx';
import AllScenarios, { AcrossDebt } from '@/tabs/explore/AllScenarios.jsx';
import HouseholdsExplore from '@/tabs/households/HouseholdsExplore.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import AnswerStrip from '@/tabs/explore/AnswerStrip.jsx';
import { sentenceItems } from '@/tabs/explore/direction.jsx';
import RuleBar from '@/tabs/explore/RuleBar.jsx';
import { RulePicker } from '@/tabs/ai/FinancesSection.jsx';
import { useNav, subOf } from '@/lib/nav.jsx';
import { HEADLINE_YEAR } from '@/tabs/ai/surprise.js';
import { economyAnswer, financesAnswer } from '@/tabs/explore/answers.js';

// An answer is a strip of chips, or a sentence when the view is not solved.
const answerOf = (a) => <AnswerStrip a={typeof a === 'string' ? { drivers: sentenceItems(a) } : a} />;
// The model kicker over each question (the scope that was the shell's meta
// line). Economy and Public finances answer for the main arm in the
// headline year, whatever the arm picker says (it drives the matrices), so
// their kicker names both.
const OGUK = 'OG-UK · gaps against the OBR’s central forecast path, not forecasts';
const MAIN = `${OGUK} · automation + productivity, ${HEADLINE_YEAR}`;
const DATE_NOTE = 'Extra AI, beyond the OBR’s central forecast, starts in 2028: an assumed date, not a forecast.';

// Explore: every interactive view. Each sub-tab opens with its question and
// a short answer in items that follows the pickers, then the charts. Economy
// (income and output, then the rest of the economy) and Public finances
// follow the header pickers and the fiscal rule; Economy opens with the
// three arms (the home the story links to) and ends with "Across scenarios"
// (every cell at once, AllScenarios); Public finances opens with debt/GDP by
// arm and ends with debt/GDP in every cell (AcrossDebt). The All scenarios sub-tab is gone
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
        <PageIntro kicker={MAIN} notes={[DATE_NOTE]} question="How do pay, national income and GDP move if, from 2028, AI does more than the OBR expects?" answer={answerOf(economyAnswer(st.s, st.closure, st.rule))}>
          <RuleBar />
        </PageIntro>
        <ResultsTab sub="income" />
        <ResultsTab sub="economy" />
        <AllScenarios />
      </>
    );
  else if (sub === 'finances')
    body = (
      <>
        <PageIntro kicker={MAIN} notes={[DATE_NOTE]} question="What happens to public debt and tax under each fiscal rule?" answer={answerOf(financesAnswer(st.s, st.closure, st.rule))}>
          <RulePicker />
        </PageIntro>
        <ResultsTab sub="finances" />
        <AcrossDebt />
      </>
    );
  else if (sub === 'who')
    body = (
      <>
        <PageIntro kicker={`${OGUK} · UK central only`} notes={[DATE_NOTE]} question="Who gains and who loses, by birth year and lifetime earnings?" answer={answerOf(whoAnswer(st.closure, st.wrule, st.arm))} />
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
