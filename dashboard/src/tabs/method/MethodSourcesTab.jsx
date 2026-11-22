'use client';

import MethodOverview from '@/tabs/method/MethodOverview.jsx';
import MethodTab from '@/tabs/method/MethodTab.jsx';
import StudiesTab from '@/tabs/literature/LiteratureTab.jsx';
import CodeTab from '@/tabs/code/CodeTab.jsx';
import HouseholdsMethod from '@/tabs/households/HouseholdsMethod.jsx';
import HouseholdsDetail from '@/tabs/households/HouseholdsDetail.jsx';
import { useNav, subOf } from '@/lib/nav.jsx';

// Method and sources: how the results are made and where they sit. The
// landing (Overview, "How the study works"), the macro model's method (with the scenarios), Household method (uk-ai-study), Evidence, and
// Data and code, and Detail and sources (the household study's result
// files and commit, moved from Explore > Households). The Scenarios sub-tab folded into OG-UK method (lib/nav.jsx
// sends its addresses to #m-scenarios).
const PANELS = { overview: MethodOverview, how: MethodTab, households: HouseholdsMethod, studies: StudiesTab, code: CodeTab, detail: HouseholdsDetail };

export default function MethodSourcesTab() {
  const { st } = useNav();
  const sub = subOf(st, 'method');
  const Panel = PANELS[sub];
  return (
    <div key={sub} id={`method-sub-${sub}`} role="tabpanel" aria-labelledby={`method-subbtn-${sub}`} className="sub-panel">
      <Panel />
    </div>
  );
}
