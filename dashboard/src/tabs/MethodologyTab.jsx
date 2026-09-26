'use client';

import { STEPS } from '../data/methodologyContent.js';
import { DIAGRAMS, DIAGRAM_TITLES } from '../data/methodologyDiagrams.js';
import ScrollyStory from '../components/ScrollyStory.jsx';

export default function MethodologyTab({ openModal }) {
  return (
    <ScrollyStory
      steps={STEPS}
      diagrams={DIAGRAMS}
      diagramTitles={DIAGRAM_TITLES}
      openModal={openModal}
      intro={
        <div className="meth-intro">
          <h2>Core elements of OG-UK</h2>
          <p className="subtitle">
            The eight building blocks of the model, from overlapping cohorts to UK calibration, then the
            baseline checked against the OBR. The panel on the right shows the formal structure for each
            section as you scroll.
          </p>
        </div>
      }
    />
  );
}
