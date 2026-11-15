'use client';

import MethodTab from '@/tabs/method/MethodTab.jsx';
import ScenariosTab from '@/tabs/method/ScenariosTab.jsx';
import StudiesTab from '@/tabs/literature/LiteratureTab.jsx';
import CodeTab from '@/tabs/code/CodeTab.jsx';
import HouseholdsMethod from '@/tabs/households/HouseholdsMethod.jsx';
import { useNav, subOf } from '@/lib/nav.jsx';

// Method and sources: how the results are made and where they sit. OG-UK
// method, Household method (uk-ai-study), Scenarios, Evidence, and Data and code.
const PANELS = { how: MethodTab, households: HouseholdsMethod, scenarios: ScenariosTab, studies: StudiesTab, code: CodeTab };

export default function MethodSourcesTab() {
  const { st } = useNav();
  const sub = subOf(st, 'method');
  const Panel = PANELS[sub];
  return (
    <div id={`method-sub-${sub}`} role="tabpanel" aria-labelledby={`method-subbtn-${sub}`} className="sub-panel">
      <Panel />
    </div>
  );
}
