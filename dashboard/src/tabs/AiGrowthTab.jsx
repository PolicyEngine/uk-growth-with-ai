'use client';

import SubTabs from '@/components/SubTabs.jsx';
import ScrollyStory from '@/components/ScrollyStory.jsx';
import ResultsPanel from '@/tabs/ai/ResultsPanel.jsx';
import { STORY_STEPS, STORY_PANELS } from '@/tabs/ai/scenarioStory.jsx';

export const SUBTABS = [
  { id: 'results', label: 'Results' },
  { id: 'method', label: 'How the scenarios are built' },
];

export default function AiGrowthTab({ sub, onSubChange }) {
  const active = sub || 'results';
  return (
    <>
      <SubTabs tabs={SUBTABS} active={active} onChange={onSubChange} />
      {active === 'results' && <ResultsPanel />}
      {active === 'method' && (
        <div className="ai-story">
          <ScrollyStory
            steps={STORY_STEPS}
            panels={STORY_PANELS}
            idPrefix="ai-"
            intro={
              <div className="meth-intro">
                <h2>How the scenarios are built</h2>
                <p className="subtitle">
                  How AI enters OG-UK, what each scenario assumes, and the caveats that go with every
                  result. Both UK scenarios impose the same automation path; they differ only in what
                  productivity is solved against. The panel on the right shows the formal target for each
                  step as you scroll.
                </p>
              </div>
            }
          />
        </div>
      )}
    </>
  );
}
