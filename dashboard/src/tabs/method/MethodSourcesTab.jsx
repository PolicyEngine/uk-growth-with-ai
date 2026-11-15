'use client';

import MethodTab from '@/tabs/method/MethodTab.jsx';
import ScenariosTab from '@/tabs/method/ScenariosTab.jsx';
import StudiesTab from '@/tabs/literature/LiteratureTab.jsx';
import CodeTab from '@/tabs/code/CodeTab.jsx';
import { useNav, subOf } from '@/lib/nav.jsx';

// Method and sources: how the results are made and where they sit. Method,
// Scenarios, Other studies and Code, once four tabs.
const PANELS = { how: MethodTab, scenarios: ScenariosTab, studies: StudiesTab, code: CodeTab };

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
