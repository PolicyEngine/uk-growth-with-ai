'use client';

import MethodTab from '@/tabs/method/MethodTab.jsx';
import StudiesTab from '@/tabs/literature/LiteratureTab.jsx';
import CodeTab from '@/tabs/code/CodeTab.jsx';
import HouseholdsMethod from '@/tabs/households/HouseholdsMethod.jsx';
import { useNav, subOf } from '@/lib/nav.jsx';

// Method and sources: how the results are made and where they sit. OG-UK
// method (with the scenarios), Household method (uk-ai-study), Evidence, and
// Data and code. The Scenarios sub-tab folded into OG-UK method (lib/nav.jsx
// sends its addresses to #m-scenarios).
const PANELS = { how: MethodTab, households: HouseholdsMethod, studies: StudiesTab, code: CodeTab };

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
