'use client';

import { useEffect, useState } from 'react';
import { STEPS } from '../data/methodologyContent.js';
import { DIAGRAMS, DIAGRAM_TITLES } from '../data/methodologyDiagrams.js';
import StickyPanel from '../components/StickyPanel.jsx';

export default function MethodologyTab({ openModal }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    function update() {
      // The tab panel is display:none until the Methodology tab is selected; every
      // rect is then 0 and the loop below would latch onto the last step.
      const narrative = document.getElementById('narrative');
      if (!narrative || narrative.offsetHeight === 0) return;
      const offset = window.innerHeight * 0.33;
      let active = 0;
      for (let i = 0; i < STEPS.length; i++) {
        const el = document.getElementById(`step-${i + 1}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top < offset) active = i;
      }
      setActiveStep(active);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <>
      <div className="meth-intro">
        <h2>Core elements of OG-UK</h2>
        <p className="subtitle">
          The eight building blocks of the model, from overlapping cohorts to UK calibration, then the
          baseline checked against the OBR. The panel on the right shows the formal structure for each
          section as you scroll.
        </p>
      </div>

      <div className="scrollytelling-container">
        <div className="scrolly-narrative" id="narrative">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`narrative-step${i === activeStep ? ' active' : ''}`}
              data-step={i}
              id={`step-${i + 1}`}
            >
              <div className="step-header">
                <div className="step-number">{i + 1}</div>
                <div className="step-title">{step.title}</div>
              </div>
              {DIAGRAMS[i] && (
                <div
                  className="step-diagram"
                  onClick={() => openModal({ title: DIAGRAM_TITLES[i], svgHtml: DIAGRAMS[i] })}
                  dangerouslySetInnerHTML={{
                    __html: DIAGRAMS[i] + '<div class="expand-hint">Click to expand</div>',
                  }}
                />
              )}
              <div
                className="step-content"
                dangerouslySetInnerHTML={{ __html: step.body }}
              />
            </div>
          ))}
        </div>

        <aside className="scrolly-sticky">
          <StickyPanel stepIndex={activeStep} />
        </aside>
      </div>
    </>
  );
}
