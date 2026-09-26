'use client';

import ScrollyStory from '@/components/ScrollyStory.jsx';
import { COVERAGE_STEPS, COVERAGE_PANELS } from '@/tabs/coverageStory.jsx';

// Model comparison: what each source can represent, then OG-UK's no-AI
// baseline against the OBR, as a two-pane story.
export default function CoverageTab() {
  return (
    <div className="ai-story">
      <ScrollyStory
        steps={COVERAGE_STEPS}
        panels={COVERAGE_PANELS}
        idPrefix="cov-"
        intro={
          <div className="meth-intro">
            <h2>Model comparison</h2>
            <p className="subtitle">
              What OG-UK, Korinek et al. (2026), Moll and Imas (2026) and the OBR can each represent, and
              OG-UK&rsquo;s baseline against the OBR forecast.
            </p>
          </div>
        }
      />
    </div>
  );
}
