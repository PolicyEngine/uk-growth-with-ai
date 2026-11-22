'use client';

import ResultsTab from '@/tabs/ai/ResultsTab.jsx';
import WhoGainsTab, { WhoFinding } from '@/tabs/cohorts/CohortsTab.jsx';
import AllScenarios, { AcrossDebt } from '@/tabs/explore/AllScenarios.jsx';
import HouseholdsExplore from '@/tabs/households/HouseholdsExplore.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import AnswerStrip from '@/tabs/explore/AnswerStrip.jsx';
import { sentenceItems } from '@/tabs/explore/direction.jsx';
import { PagePill } from '@/components/ui/SettingsBar.jsx';
import { useState } from 'react';
import { useNav, subOf } from '@/lib/nav.jsx';
import { pickersFor } from '@/lib/labels.js';
import { ModelTip } from '@/tabs/story/PartHead.jsx';
import { HEADLINE_YEAR, SURPRISE_YEAR } from '@/tabs/ai/surprise.js';
import { cohortNotice } from '@/lib/dataKeys.js';
import { economyAnswer } from '@/tabs/explore/answers.js';
import SummaryBox, { SummaryLink, SummaryRow } from '@/components/ui/SummaryBox.jsx';
import { financesFinding } from '@/tabs/ai/financesInfo.js';
import { taxTitleFor } from '@/tabs/ai/FinancesSection.jsx';
import { ruleSolved } from '@/tabs/ai/surprise.js';
import { ruleGapText } from '@/tabs/ai/lines.js';

// An answer is a strip of chips, or a sentence when the view is not solved.
// `label` leads the strip where it does not follow the Version picker.
// The box opens with the scope line (push D, Q6a): the model's name, whose
// tip says what it is, and what the figures are.
const answerOf = (a, label) => <AnswerStrip a={typeof a === 'string' ? { drivers: sentenceItems(a) } : a} label={label} scope={<Scope />} />;
// The model row's scope note, after the pill (item-22-fable.md): what the
// page's numbers are. It opens with the model's name, whose tip says in
// plain words what the macro model is (push D, Q1: the tab's first mention;
// the same tip as the Story's part opener). Economy and Public finances answer for the main arm
// in the headline year, whatever the version picked (it drives the
// matrices), so their strip is led by that.
const SCOPE = ' · gaps against the OBR’s central forecast path';
const MAIN = `Automation + productivity, ${HEADLINE_YEAR}`;
const DATE_NOTE = `The scenario’s AI starts in ${SURPRISE_YEAR}: an assumed date, not a forecast.`;
// Public finances' answer (item 38; push D, Q6e): the same summary box as
// Economy's: the scope line, the finding (the result first, sign-aware,
// financesInfo.js), the note on what the productivity gain decides, then
// the tax-gap card's link as a link row. Not solved: the reason, in the
// box.
function FinancesAnswer({ st }) {
  const f = ruleSolved(st.rule, st.s) ? financesFinding(st.s, st.closure, st.rule) : null;
  return (
    <SummaryBox id="fin-finding" scope={<Scope />}>
      {!ruleSolved(st.rule, st.s) ? (
        <SummaryRow icon="provisional">{ruleGapText(st.rule, st.s)}</SummaryRow>
      ) : !f ? (
        <SummaryRow icon="provisional">This combination is not yet solved.</SummaryRow>
      ) : (
        <>
          <SummaryRow icon="debt" strong data-claim="fin-lead">
            {f.lead}
          </SummaryRow>
          {f.note ? (
            <SummaryRow icon="productivity" className="fin-note">
              {f.note}
            </SummaryRow>
          ) : null}
          <SummaryLink tab="explore" sub="finances" anchor="tax-gap">
            {taxTitleFor(st.s, st.rule)}
          </SummaryLink>
        </>
      )}
    </SummaryBox>
  );
}

function Scope() {
  return (
    <>
      <ModelTip model="oguk" />
      {SCOPE}
    </>
  );
}
// The model row: the settings pill, then the scope note where the page has
// no summary box to carry it (Who gains).
function Row({ sub, scope = false }) {
  return (
    <>
      <PagePill pick={pickersFor('explore', sub)} sub={sub} />
      {scope ? (
        <span className="model-scope">
          <Scope />
        </span>
      ) : null}
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
  const { st, swapTab } = useNav();
  const sub = subOf(st, 'explore');
  // A sub-tab change fades the new page in once (is-swap); never on first
  // show, and not when the tab itself is fading in or is hidden (one fade
  // at a time: subOf flips to the first sub-tab while the tab is hidden).
  const [seen, setSeen] = useState(sub);
  const [swap, setSwap] = useState(false);
  if (sub !== seen) {
    setSeen(sub);
    setSwap(st.tab === 'explore' && swapTab !== 'explore');
  }
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
        <PageIntro row={<Row sub="who" scope />} notes={[cohortNotice() ?? DATE_NOTE]} question="Who gains and who loses, by birth year and lifetime earnings?" answer={<WhoFinding closure={st.closure} rule={st.wrule} arm={st.arm} />} />
        <div id="explore-sub-who-inner">
          <WhoGainsTab />
        </div>
      </>
    );
  else body = <HouseholdsExplore />;
  return (
    <div id={`explore-sub-${sub}`} role="tabpanel" aria-labelledby={`explore-subbtn-${sub}`} className={`sub-panel${swap ? ' is-swap' : ''}`} onAnimationEnd={(e) => e.target === e.currentTarget && setSwap(false)} key={sub}>
      {body}
    </div>
  );
}
