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
          <h2>Model</h2>
          <p className="subtitle">
            How OG-UK, the UK calibration of the OG-Core overlapping-generations model, represents households,
            firms and government.
          </p>
        </div>
      }
    />
  );
}
