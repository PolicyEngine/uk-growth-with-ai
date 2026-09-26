'use client';

import ScrollyStory from '@/components/ScrollyStory.jsx';
import { STORY_STEPS, STORY_PANELS } from '@/tabs/ai/scenarioStory.jsx';

// Scenario design: how AI enters OG-UK, what each scenario assumes, the
// fiscal convention and the caveats, as a two-pane story.
export default function FutureScenariosTab() {
  return (
    <div className="ai-story">
      <ScrollyStory
        steps={STORY_STEPS}
        panels={STORY_PANELS}
        idPrefix="ai-"
        intro={
          <div className="meth-intro">
            <h2>Scenario design</h2>
            <p className="subtitle">
              How AI enters OG-UK: the two technology changes, the three scenarios, the fiscal convention and the
              caveats.
            </p>
          </div>
        }
      />
    </div>
  );
}
