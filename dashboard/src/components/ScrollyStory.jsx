'use client';

import { useEffect, useState } from 'react';
import StickyPanel from './StickyPanel.jsx';

// Two-pane scrollytelling: narrative steps on the left, a sticky panel on the
// right that follows the step in view. Shared by the Model, Scenario design and
// Model comparison tabs. `idPrefix` keeps the
// element ids of two mounted stories apart; Methodology uses '' so its ids
// (#narrative, #step-N, #sticky-panel) are unchanged.
//
// A step's body is either an HTML string (`body`) or JSX (`content`).
export default function ScrollyStory({ steps, panels, idPrefix = '', diagrams = [], diagramTitles = [], openModal, intro }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    function update() {
      const narrative = document.getElementById(`${idPrefix}narrative`);
      if (!narrative || narrative.offsetHeight === 0) return;
      // Reading line: a third of the way down, capped so a short step
      // parked just under the header still counts as the one being read.
      const offset = Math.min(window.innerHeight * 0.33, 260);
      let active = 0;
      for (let i = 0; i < steps.length; i++) {
        const el = document.getElementById(`${idPrefix}step-${i + 1}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top < offset) active = i;
      }
      // At the foot of the page the last step may not reach the reading
      // line; being scrolled to the bottom always means the last step.
      const doc = document.documentElement;
      if (window.scrollY + window.innerHeight >= doc.scrollHeight - 2) active = steps.length - 1;
      setActiveStep(active);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [idPrefix, steps]);

  return (
    <>
      {intro}
      <div className="scrollytelling-container">
        <div className="scrolly-narrative" id={`${idPrefix}narrative`}>
          {steps.map((step, i) => (
            <div
              key={i}
              className={`narrative-step${i === activeStep ? ' active' : ''}`}
              data-step={i}
              id={`${idPrefix}step-${i + 1}`}
            >
              <div className="step-header">
                <div className="step-number">{i + 1}</div>
                <div className="step-title">{step.title}</div>
              </div>
              {diagrams[i] && (
                <div
                  className="step-diagram"
                  onClick={() => openModal && openModal({ title: diagramTitles[i], svgHtml: diagrams[i] })}
                  dangerouslySetInnerHTML={{ __html: diagrams[i] + '<div class="expand-hint">Click to expand</div>' }}
                />
              )}
              {step.content ? (
                <div className="step-content">{step.content}</div>
              ) : (
                <div className="step-content" dangerouslySetInnerHTML={{ __html: step.body }} />
              )}
            </div>
          ))}
        </div>

        <aside className="scrolly-sticky">
          <StickyPanel stepIndex={activeStep} panels={panels} id={`${idPrefix}sticky-panel`} />
        </aside>
      </div>
    </>
  );
}
