'use client';

import ResultsTab from '@/tabs/ai/ResultsTab.jsx';
import WhoGainsTab, { WhoFinding } from '@/tabs/cohorts/CohortsTab.jsx';
import AllScenarios, { AcrossDebt } from '@/tabs/explore/AllScenarios.jsx';
import HouseholdsExplore from '@/tabs/households/HouseholdsExplore.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import AnswerStrip from '@/tabs/explore/AnswerStrip.jsx';
import { sentenceItems } from '@/tabs/explore/direction.jsx';
import { PagePill } from '@/components/ui/SettingsBar.jsx';
import { useNav, subOf, NavLink } from '@/lib/nav.jsx';
import { pickersFor } from '@/lib/labels.js';
import { HEADLINE_YEAR, SURPRISE_YEAR } from '@/tabs/ai/surprise.js';
import { cohortNotice } from '@/lib/dataKeys.js';
import { economyAnswer } from '@/tabs/explore/answers.js';
import Finding from '@/components/ui/Finding.jsx';
import { financesFinding } from '@/tabs/ai/financesInfo.js';
import { TAX_TITLE } from '@/tabs/ai/FinancesSection.jsx';
import { ruleSolved } from '@/tabs/ai/surprise.js';
import { ruleGapText } from '@/tabs/ai/lines.js';

// An answer is a strip of chips, or a sentence when the view is not solved.
// `label` leads the strip where it does not follow the Version picker.
const answerOf = (a, label) => <AnswerStrip a={typeof a === 'string' ? { drivers: sentenceItems(a) } : a} label={label} />;
// The model row's scope note, after the pill (item-22-fable.md): what the
// page's numbers are. Economy and Public finances answer for the main arm
// in the headline year, whatever the version picked (it drives the
// matrices), so their strip is led by that.
const SCOPE = 'OG-UK · gaps against the OBR’s central forecast path';
const MAIN = `Automation + productivity, ${HEADLINE_YEAR}`;
const DATE_NOTE = `Extra AI, beyond the OBR’s central forecast, starts in ${SURPRISE_YEAR}: an assumed date, not a forecast.`;
// Public finances' answer (item 38): one Finding box, sign-aware
// (financesInfo.js), then the tax-gap card's link as one plain line. Not
// solved: the reason, as a sentence.
function FinancesAnswer({ st }) {
  if (!ruleSolved(st.rule, st.s)) return <p className="page-a-text">{ruleGapText(st.rule, st.s)}</p>;
  const f = financesFinding(st.s, st.closure, st.rule);
  if (!f) return <p className="page-a-text">This combination is not yet solved.</p>;
  return (
    <>
      <Finding id="fin-finding" icon="finances" lead={f.lead} lines={f.lines} />
      <p className="fin-link-line">
        <NavLink tab="explore" sub="finances" anchor="tax-gap">
          {TAX_TITLE}
        </NavLink>
      </p>
    </>
  );
}

function Row({ sub }) {
  return (
    <>
      <PagePill pick={pickersFor('explore', sub)} sub={sub} />
      <span className="model-scope">{SCOPE}</span>
    </>
  );
}

// Explore: every interactive view. Each sub-tab opens with its question,
// the model row (the settings pill, item 22) and a short answer, then the
// charts. Economy (income and output, then the rest of the economy) and
// Public finances follow the pill (scenario, foreign capital, version,
// budget assumption); Economy opens with the three arms (the home the
// story links to) and ends with "Across scenarios" (every cell at once,
// AllScenarios); Public finances opens with debt/GDP by arm and ends with
// debt/GDP in every cell (AcrossDebt). The All scenarios sub-tab is gone
// (lib/nav.jsx sends ?sub=all to #ex-across). Who gains is UK central
// only; Households is the uk-ai-study detail (its own page). Each sub-tab's
// sections keep their ids, which links and scripts/dumptabs.mjs use.
export default function ExploreTab() {
  const { st } = useNav();
  const sub = subOf(st, 'explore');
  let body;
  if (sub === 'economy')
    body = (
      <>
        <PageIntro row={<Row sub="economy" />} notes={[DATE_NOTE]} question={`How do pay, national income and GDP move if, from ${SURPRISE_YEAR}, AI does more than the OBR expects?`} answer={answerOf(economyAnswer(st.s, st.closure, st.rule), MAIN)} />
        <ResultsTab sub="income" />
        <ResultsTab sub="economy" />
        <AllScenarios />
      </>
    );
  else if (sub === 'finances')
    body = (
      <>
        <PageIntro row={<Row sub="finances" />} notes={[DATE_NOTE]} question="What happens to public debt and tax under each fiscal rule?" answer={<FinancesAnswer st={st} />} />
        <ResultsTab sub="finances" />
        <AcrossDebt />
      </>
    );
  else if (sub === 'who')
    body = (
      <>
        <PageIntro row={<Row sub="who" />} notes={[cohortNotice() ?? DATE_NOTE]} question="Who gains and who loses, by birth year and lifetime earnings?" answer={<WhoFinding closure={st.closure} rule={st.wrule} arm={st.arm} />} />
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
