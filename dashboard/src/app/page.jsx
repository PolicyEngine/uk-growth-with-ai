'use client';

import { useEffect, useState } from 'react';
import ResultsPanel from '@/tabs/ai/ResultsPanel.jsx';
import FutureScenariosTab from '@/tabs/FutureScenariosTab.jsx';
import MethodologyTab from '@/tabs/MethodologyTab.jsx';
import CoverageTab from '@/tabs/CoverageTab.jsx';
import CodeTab from '@/tabs/CodeTab.jsx';
import DiagramModal from '@/components/DiagramModal.jsx';
import { D, gapAt, FIRST_YEAR, LAST_YEAR, LS_FALL, OBR, KORINEK } from '@/tabs/ai/metrics.js';
import { URLS, efo, EFO_PAGE } from '@/tabs/ai/links.js';

// Tab ids are the URL hashes; labels can change without breaking links.
const TABS = [
  { id: 'growth', label: 'Economic effects', Component: ResultsPanel },
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

  return (
    <div className="app-shell">
      <header className="title-row">
        <div className="title-row-inner">
          <h1>The Macroeconomic Effects of AI on the UK</h1>
          <p className="title-row-sub">Vahid Ahmadi · PolicyEngine · September 2026</p>
        </div>
      </header>

      <main className="main-content">
        <p className="intro-text">
          This report estimates the macroeconomic effects of AI-driven automation on the UK over {FIRST_YEAR}&ndash;
          {LAST_YEAR} using{' '}
          <a href={URLS.ogUk} target="_blank" rel="noreferrer">
            OG-UK
          </a>
          , the UK calibration of the{' '}
          <a href={URLS.ogCore} target="_blank" rel="noreferrer">
            OG-Core
          </a>{' '}
          overlapping-generations model. Existing projections differ widely.{' '}
          <a href={URLS.korinekT3} target="_blank" rel="noreferrer">
            Korinek et al. (2026)
          </a>{' '}
          find US growth of {D.anth.Substantial.growth.toFixed(1)}% a year by 2030 in their &ldquo;substantial&rdquo;
          scenario, while{' '}
          <a href={URLS.mollImas} target="_blank" rel="noreferrer">
            Moll and Imas (2026)
          </a>{' '}
          argue that diffusion lags, physical and relational work, and shifts in spending make double-digit growth
          unlikely within 10&ndash;15 years. The OBR&rsquo;s March 2026{' '}
          <a href={efo(EFO_PAGE.p1_9)} target="_blank" rel="noreferrer">
            <i>Economic and fiscal outlook</i>
          </a>{' '}
          projects GDP growth of {OBR.growth2027to30.toFixed(1)}% a year over 2027&ndash;30 and, in{' '}
          <a href={efo(EFO_PAGE.box22)} target="_blank" rel="noreferrer">
            Box 2.2
          </a>
          , sets out a displacement scenario with a lower labour share, {OBR.unemployment}% unemployment and
          unchanged GDP.
        </p>
        <p className="intro-text">
          We model AI as a gradual rise in the capital share of output over {FIRST_YEAR}&ndash;{LAST_YEAR}, lowering
          the labour share by {LS_FALL.toFixed(1)} percentage points, with or without a {KORINEK.tfp}% rise in total
          factor productivity. Relative to the no-AI baseline, GDP is {gapAt('anthropic_ramp', 'Y').toFixed(1)}%
          higher in {LAST_YEAR} with productivity gains and {gapAt('obr_ramp', 'Y').toFixed(1)}% higher with
          automation alone, driven by investment rather than consumption. The technology paths are imposed, so the
          results show the general-equilibrium consequences of given scenarios, not their likelihood.
        </p>

        <nav className="tab-bar" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab-button${t.id === activeTab ? ' active' : ''}`}
              role="tab"
              aria-selected={t.id === activeTab}
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
            hidden={id !== activeTab}
          >
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
