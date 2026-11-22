'use client';

import MethodOverview from '@/tabs/method/MethodOverview.jsx';
import MethodTab from '@/tabs/method/MethodTab.jsx';
import InputsPage from '@/tabs/method/InputsPage.jsx';
import StudiesTab from '@/tabs/literature/LiteratureTab.jsx';
import CodeTab from '@/tabs/code/CodeTab.jsx';
import HouseholdsMethod from '@/tabs/households/HouseholdsMethod.jsx';
import { useState } from 'react';
import { useNav, subOf } from '@/lib/nav.jsx';

// Method and sources: how the results are made and where they sit. The
// landing (Overview, "How the study works"), the macro model's method
// (with the scenarios), Household method (uk-ai-study), Inputs, Evidence,
// and Data and code, which holds the household study's result files and
// commit (Detail and sources, a sub-tab until the Method redesign;
// lib/nav.jsx sends its addresses to #detail-sources). The Scenarios
// sub-tab folded into the macro model's method (lib/nav.jsx sends its
// addresses to #m-scenarios).
const PANELS = { overview: MethodOverview, how: MethodTab, households: HouseholdsMethod, inputs: InputsPage, studies: StudiesTab, code: CodeTab };

export default function MethodSourcesTab() {
  const { st, swapTab } = useNav();
  const sub = subOf(st, 'method');
  // A sub-tab change fades the new page in once (is-swap); never on first
  // show, and not when the tab itself is fading in or is hidden (one fade
  // at a time: subOf flips to the first sub-tab while the tab is hidden).
  const [seen, setSeen] = useState(sub);
  const [swap, setSwap] = useState(false);
  if (sub !== seen) {
    setSeen(sub);
    setSwap(st.tab === 'method' && swapTab !== 'method');
  }
  const Panel = PANELS[sub];
  return (
    <div key={sub} id={`method-sub-${sub}`} role="tabpanel" aria-labelledby={`method-subbtn-${sub}`} className={`sub-panel${swap ? ' is-swap' : ''}`} onAnimationEnd={(e) => e.target === e.currentTarget && setSwap(false)}>
      <Panel />
    </div>
  );
}
