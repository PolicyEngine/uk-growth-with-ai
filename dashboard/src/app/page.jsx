'use client';

import { useEffect, useState } from 'react';
import SurpriseResults from '@/tabs/ai/SurpriseResults.jsx';
import FutureScenariosTab from '@/tabs/FutureScenariosTab.jsx';
import MethodologyTab from '@/tabs/MethodologyTab.jsx';
import CoverageTab from '@/tabs/CoverageTab.jsx';
import CodeTab from '@/tabs/CodeTab.jsx';
import DiagramModal from '@/components/DiagramModal.jsx';
import { URLS } from '@/tabs/ai/links.js';
import { FIRST_YEAR, HEADLINE_YEAR, SURPRISE_YEAR } from '@/tabs/ai/surprise.js';

// Tab ids are the URL hashes; labels can change without breaking links.
const TABS = [
  { id: 'growth', label: 'Economic effects', Component: SurpriseResults },
  { id: 'methodology', label: 'Model', Component: MethodologyTab },
  { id: 'scenarios', label: 'Scenario design', Component: FutureScenariosTab },
  { id: 'coverage', label: 'Model comparison', Component: CoverageTab },
  { id: 'code', label: 'Code', Component: CodeTab },
];


// Links from before the tabs were flattened (#<tab>/<sub-tab>) keep working.
const LEGACY = {
  'growth/results': 'growth',
  'growth/method': 'scenarios',
  'methodology/how': 'methodology',
  'methodology/code': 'code',
  'methodology/coverage': 'coverage',
  'methodology/obr': 'coverage',
};

function parseHash(hash) {
  const h = (hash || '').replace(/^#/, '');
  const id = LEGACY[h] || h.split('/')[0];
  return TABS.find((t) => t.id === id) ? id : null;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [modal, setModal] = useState(null);

  // Deep-linking: #<tab>.
  useEffect(() => {
    function apply() {
      const id = parseHash(window.location.hash);
      if (id) setActiveTab(id);
    }
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  // Deep link written on user action only, so it never races the read above.
  function selectTab(tabId) {
    setActiveTab(tabId);
    window.history.replaceState(null, '', `#${tabId}`);
  }

  // ARIA tab pattern: the arrow keys move between tabs and activate the one
  // they land on, and focus follows, so the roving tabIndex stays correct.
  function onTabKeyDown(e, i) {
    const last = TABS.length - 1;
    let next = null;
    if (e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
    else if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next == null) return;
    e.preventDefault();
    selectTab(TABS[next].id);
    document.getElementById(`tabbtn-${TABS[next].id}`)?.focus();
  }

  return (
    <div className="app-shell">
      <header className="title-row">
        <div className="title-row-inner">
          <h1>The Macroeconomic Effects of AI on the UK</h1>
          <p className="title-row-sub">Vahid Ahmadi · PolicyEngine · Updated November 2026</p>
        </div>
      </header>

      <main className="main-content">
        <p className="intro-text">
          This report estimates the macroeconomic effects of AI-driven automation on the UK using{' '}
          <a href={URLS.ogUk} target="_blank" rel="noreferrer">
            OG-UK
          </a>
          , the UK calibration of the{' '}
          <a href={URLS.ogCore} target="_blank" rel="noreferrer">
            OG-Core
          </a>{' '}
          overlapping-generations model. AI arrives as an unanticipated shock in {SURPRISE_YEAR}: it raises the
          capital share of output, with or without a rise in productivity. Three scenarios (UK low, central and high) are calibrated to IMF and OBR estimates, and a
          fourth carries Korinek et al.&rsquo;s (2026) US &ldquo;substantial&rdquo; inputs as an upper case.
        </p>
        <p className="intro-text">
          Results cover {FIRST_YEAR}&ndash;{HEADLINE_YEAR} against the path without AI. National income (GNI) comes
          first, with GDP beside it and a closed-capital bound under each figure. The technology paths are imposed,
          so the results show the general-equilibrium consequences of given scenarios, not their likelihood.
        </p>

        <nav className="tab-bar" role="tablist" aria-label="Report sections">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              id={`tabbtn-${t.id}`}
              type="button"
              className={`tab-button${t.id === activeTab ? ' active' : ''}`}
              role="tab"
              aria-selected={t.id === activeTab}
              aria-controls={`tab-${t.id}`}
              tabIndex={t.id === activeTab ? 0 : -1}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              onClick={() => selectTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {TABS.map(({ id, Component }) => (
          <section
            key={id}
            id={`tab-${id}`}
            className={`tab-panel${id === activeTab ? ' active' : ''}`}
            role="tabpanel"
            aria-labelledby={`tabbtn-${id}`}
            tabIndex={id === activeTab ? 0 : -1}
            hidden={id !== activeTab}
          >
            {id !== 'growth' ? (
              <p className="stale-notice">
                <b>Earlier design.</b> This tab still describes the earlier runs (AI foreseen from 2026, Korinek
                inputs only, 2026&ndash;2030) and has not yet been updated for the {SURPRISE_YEAR} surprise. Current
                results are in <a href="#growth">Economic effects</a>.
              </p>
            ) : null}
            <Component openModal={setModal} />
          </section>
        ))}

        <footer className="dashboard-footer">
          <p className="footer-versions">
            Code and data:{' '}
            <a href="https://github.com/PolicyEngine/uk-growth-with-ai" target="_blank" rel="noreferrer">
              PolicyEngine/uk-growth-with-ai
            </a>
            . Model versions:{' '}
            <a href="https://github.com/PSLmodels/OG-Core/releases/tag/v0.17.0" target="_blank" rel="noreferrer">
              OG-Core 0.17.0
            </a>{' '}
            with a time-varying &gamma; patch,{' '}
            <a
              href="https://github.com/vahid-ahmadi/OG-UK/commit/d0e6ae535da4ffbface55f0e64fb2074583a46a6"
              target="_blank"
              rel="noreferrer"
            >
              OG-UK 0.3.2 (d0e6ae5)
            </a>
            ,{' '}
            <a href="https://github.com/PolicyEngine/policyengine.py/releases/tag/5.0.4" target="_blank" rel="noreferrer">
              policyengine.py 5.0.4
            </a>{' '}
            and{' '}
            <a href="https://github.com/PolicyEngine/policyengine-uk/tree/2.90.2" target="_blank" rel="noreferrer">
              policyengine-uk 2.90.2
            </a>
            .
          </p>
        </footer>
      </main>

      {modal && (
        <DiagramModal title={modal.title} svgHtml={modal.svgHtml} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
