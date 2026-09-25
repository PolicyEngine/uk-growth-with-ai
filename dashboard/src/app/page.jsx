'use client';

import { useEffect, useState } from 'react';
import AiGrowthTab, { SUBTABS as GROWTH_SUBTABS } from '@/tabs/AiGrowthTab.jsx';
import MethodologyShell, { SUBTABS as METHOD_SUBTABS } from '@/tabs/MethodologyShell.jsx';
import DiagramModal from '@/components/DiagramModal.jsx';

const TABS = [
  { id: 'growth', label: 'UK growth with AI', Component: AiGrowthTab, subs: GROWTH_SUBTABS },
  { id: 'methodology', label: 'Methodology', Component: MethodologyShell, subs: METHOD_SUBTABS },
];

const DEFAULTS = Object.fromEntries(TABS.map((t) => [t.id, t.subs.length ? t.subs[0].id : null]));

function parseHash(hash) {
  const [tab, sub] = (hash || '').replace(/^#/, '').split('/');
  const t = TABS.find((x) => x.id === tab);
  if (!t) return null;
  const s = t.subs.find((x) => x.id === sub);
  return { tab: t.id, sub: s ? s.id : DEFAULTS[t.id] };
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [subs, setSubs] = useState(DEFAULTS);
  const [modal, setModal] = useState(null);

  // Deep-linking: #<tab>/<sub-tab>.
  useEffect(() => {
    function apply() {
      const p = parseHash(window.location.hash);
      if (!p) return;
      setActiveTab(p.tab);
      setSubs((s) => ({ ...s, [p.tab]: p.sub }));
    }
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  // Deep link written on user action only, so it never races the read above.
  function syncHash(tabId, subId) {
    window.history.replaceState(null, '', subId ? `#${tabId}/${subId}` : `#${tabId}`);
  }

  function selectTab(tabId) {
    setActiveTab(tabId);
    syncHash(tabId, subs[tabId]);
  }

  function selectSub(tabId, subId) {
    setSubs((s) => ({ ...s, [tabId]: subId }));
    syncHash(tabId, subId);
  }

  return (
    <div className="app-shell">
      <header className="title-row">
        <div className="title-row-inner">
          <h1>What might AI do to the UK economy?</h1>
        </div>
      </header>

      <main className="main-content">
        <p className="intro-text">
          Two AI scenarios run through <strong>OG-UK</strong>, the UK calibration of the open-source{' '}
          <a href="https://github.com/PSLmodels/OG-Core" target="_blank" rel="noreferrer">OG-Core</a>{' '}
          overlapping-generations model, over <strong>2026&ndash;2030</strong>: Anthropic&rsquo;s{' '}
          <strong>substantial</strong> scenario (Korinek et al. 2026, Table 3) and the OBR&rsquo;s{' '}
          <strong>technological-displacement</strong> scenario (March 2026 EFO, Box 2.2), each against a
          no-AI baseline and against Anthropic&rsquo;s four published US paths.
        </p>
        <p className="intro-text">
          <strong>Every result here is 1-sector</strong> (<code>multi_sector=False</code>), so the
          demand-composition channel is absent, and neither scenario can speak to displacement — the
          model has no unemployment, no search frictions and no occupational split. The two tabs:{' '}
          <strong>UK growth with AI</strong> for what each model can represent and what the runs produce,
          and <strong>Methodology</strong> for how OG-UK works against the OBR&rsquo;s own UK OLG model
          (Working Paper No.&nbsp;22) and whether its baseline stands up.
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
            <Component sub={subs[id]} onSubChange={(s) => selectSub(id, s)} openModal={setModal} />
          </section>
        ))}

        <footer className="dashboard-footer">
          <a href="https://policyengine.org" target="_blank" rel="noreferrer">PolicyEngine</a> Macro ·
          built on <strong>OG-UK</strong>, the UK calibration of{' '}
          <a href="https://github.com/PSLmodels/OG-Core" target="_blank" rel="noreferrer">OG-Core</a>,
          maintained by the{' '}
          <a href="https://pslmodels.org" target="_blank" rel="noreferrer">Policy Simulation Library</a>
        </footer>
      </main>

      {modal && (
        <DiagramModal title={modal.title} svgHtml={modal.svgHtml} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
