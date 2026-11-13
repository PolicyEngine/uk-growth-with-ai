'use client';

import { useEffect, useState } from 'react';
import ResultsTab, { SUBS } from '@/tabs/ai/ResultsTab.jsx';
import MethodTab from '@/tabs/method/MethodTab.jsx';
import LiteratureTab from '@/tabs/literature/LiteratureTab.jsx';
import CodeTab from '@/tabs/code/CodeTab.jsx';
import CohortsTab from '@/tabs/cohorts/CohortsTab.jsx';
import ViewTabs from '@/components/ab/ViewTabs.jsx';
import BandPill from '@/components/ab/BandPill.jsx';
import { S, SCENARIOS, scenarioById } from '@/tabs/ai/surprise.js';

// Six flat tabs, no sub-tabs. The open tab is ?tab=, the scenario ?s=.
const TABS = [
  { id: 'results', label: 'Results', icon: 'trend', scenario: true },
  { id: 'cohorts', label: 'Cohorts', icon: 'usersRound', scenario: true },
  { id: 'method', label: 'Scenarios and method', icon: 'book' },
  { id: 'literature', label: 'Literature', icon: 'scale' },
  { id: 'code', label: 'Code', icon: 'code' },
];

// Old #hash links keep working.
const LEGACY = {
  finances: 'results',
  'public-finances': 'results',
  growth: 'results',
  'growth/results': 'results',
  'growth/method': 'method',
  scenarios: 'method',
  methodology: 'method',
  'methodology/how': 'method',
  'methodology/code': 'code',
  'methodology/coverage': 'literature',
  'methodology/obr': 'method',
  coverage: 'literature',
  code: 'code',
};

const SCEN_NOTE = { uk_central: 'Headline', korinek: 'US “substantial” inputs' };
const OPTIONS = SCENARIOS.map((s) => ({
  value: s.id,
  label: s.label,
  short: s.label,
  note: SCEN_NOTE[s.id],
}));

function readUrl() {
  const q = new URLSearchParams(window.location.search);
  const h = window.location.hash.replace(/^#/, '');
  let tab = q.get('tab');
  let sub = q.get('sub');
  // Public finances is now a sub-tab of Results
  if (tab === 'finances' || h === 'finances' || h === 'public-finances') sub = 'finances';
  if (!TABS.some((t) => t.id === tab)) tab = LEGACY[tab] || LEGACY[h] || LEGACY[h.split('/')[0]] || null;
  if (!SUBS.some((x) => x.id === sub)) sub = null;
  if (sub && !tab) tab = 'results';
  const s = q.get('s');
  const c = q.get('closure');
  return { tab, sub, s: s && scenarioById(s) ? s : null, closure: ['central', 'closed', 'both'].includes(c) ? c : null };
}

function writeUrl(tab, s, sub, closure) {
  const u = new URL(window.location.href);
  u.hash = '';
  if (closure && closure !== 'central') u.searchParams.set('closure', closure);
  else if (closure) u.searchParams.delete('closure');
  u.searchParams.set('tab', tab);
  if (tab === 'results' && sub) u.searchParams.set('sub', sub);
  else u.searchParams.delete('sub');
  u.searchParams.set('s', s);
  window.history.replaceState(null, '', u.toString());
}

export default function HomePage() {
  const [tab, setTab] = useState('results');
  const [sid, setSid] = useState(S.default_scenario);
  const [sub, setSub] = useState('overview');
  const [closure, setClosure] = useState('central');
  const [visited, setVisited] = useState({ results: true });

  useEffect(() => {
    const apply = () => {
      const u = readUrl();
      if (u.tab) {
        setTab(u.tab);
        setVisited((v) => ({ ...v, [u.tab]: true }));
      }
      if (u.s) setSid(u.s);
      if (u.closure) setClosure(u.closure);
      if (u.sub) {
        setSub(u.sub);
        // an old #public-finances or ?tab=finances link: rewrite to the new form
        writeUrl(u.tab, u.s || S.default_scenario, u.sub);
      }
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  const chooseTab = (id) => {
    setTab(id);
    setVisited((v) => ({ ...v, [id]: true }));
    writeUrl(id, sid, sub);
    window.scrollTo({ top: 0 });
  };
  const chooseScenario = (s) => {
    setSid(s);
    writeUrl(tab, s, sub);
  };
  const chooseClosure = (c) => {
    setClosure(c);
    writeUrl(tab, sid, sub, c);
  };
  const chooseSub = (id) => {
    setSub(id);
    writeUrl('results', sid, id);
    window.scrollTo({ top: 0 });
  };
  const scenarioApplies = TABS.find((t) => t.id === tab)?.scenario;

  const panels = {
    results: (
      <ResultsTab
        sid={sid}
        sub={sub}
        onSub={chooseSub}
        onTab={chooseTab}
        onScenario={chooseScenario}
        closure={closure}
        onClosure={chooseClosure}
      />
    ),
    cohorts: <CohortsTab sid={sid} />,
    method: <MethodTab onTab={chooseTab} active={tab === 'method'} />,
    literature: <LiteratureTab active={tab === 'literature'} />,
    code: <CodeTab active={tab === 'code'} />,
  };

  return (
    <div className="app">
      <div className="main-content">
        <header className="title-row">
          <h1>AI and the UK economy</h1>
          <div className="band-scenario">
            <BandPill
              icon="sliders"
              label="Scenario"
              value={sid}
              options={OPTIONS}
              onChange={chooseScenario}
              inactive={!scenarioApplies}
              inactiveNote="The scenario applies to Results and Cohorts"
            />
          </div>
        </header>
        <ViewTabs tabs={TABS} value={tab} onChange={chooseTab} />

        {TABS.map(({ id }) =>
          visited[id] ? (
            <section
              key={id}
              id={`tab-${id}`}
              className={`tab-panel tab-${id}`}
              role="tabpanel"
              aria-labelledby={`tabbtn-${id}`}
              hidden={id !== tab}
            >
              {panels[id]}
            </section>
          ) : null,
        )}
      </div>

    </div>
  );
}
