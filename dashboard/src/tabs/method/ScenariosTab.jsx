'use client';

import OnThisPage from '@/components/ui/OnThisPage.jsx';
import ScenariosSection, { SCENARIO_SECTIONS } from './ScenariosSection.jsx';

export { REF_SID, stressMove, tzGdpMove, stressItems, tzGdpItems } from './ScenariosSection.jsx';

// The Scenarios sub-tab, kept only until the nav sends ?sub=scenarios to
// OG-UK method (#m-scenarios). It wraps the one Scenarios section, the same
// component OG-UK method renders, so nothing is written twice. Delete this
// file and its PANELS entry once the nav no longer lists the sub-tab.
export default function ScenariosTab() {
  return (
    <div className="page-with-contents mx-tab mx-method">
      <OnThisPage tab="method" sub="scenarios" sections={SCENARIO_SECTIONS} label="Scenarios contents" />
      <div className="page-body">
        <ScenariosSection />
      </div>
    </div>
  );
}
