'use client';

import { useState } from 'react';
import ResultsTab from '@/tabs/ai/ResultsTab.jsx';
import WhoGainsTab from '@/tabs/cohorts/CohortsTab.jsx';
import ScenariosTab from '@/tabs/method/ScenariosTab.jsx';
import MethodTab from '@/tabs/method/MethodTab.jsx';
import StudiesTab from '@/tabs/literature/LiteratureTab.jsx';
import CodeTab from '@/tabs/code/CodeTab.jsx';
import ViewTabs from '@/components/ab/ViewTabs.jsx';
import Picker from '@/components/ui/Picker.jsx';
import { NavProvider, useNav, subOf } from '@/lib/nav.jsx';
import { TABS, tabById, CLOSURES, PAGE_TITLE } from '@/lib/labels.js';
import { SCENARIOS } from '@/tabs/ai/surprise.js';

// The shell: a sticky title band holding the two global pickers (scenario,
// capital closure), a sticky tab row, and a second row on the two tabs that
// have sub-tabs. All state lives in the address (lib/nav.jsx).

const SCEN_NOTE = { uk_low: 'UK range, lower end', uk_central: 'Headline scenario', uk_high: 'UK range, upper end', korinek: 'A US upper case: Korinek et al.’s “substantial” inputs' };
const SCEN_OPTIONS = SCENARIOS.map((s) => ({ value: s.id, label: s.label, note: SCEN_NOTE[s.id] }));
const CLOSURE_OPTIONS = CLOSURES.map((c) => ({ value: c.id, label: c.label, note: c.note, icon: c.icon }));

const PANELS = { results: ResultsTab, who: WhoGainsTab, scenarios: ScenariosTab, method: MethodTab, studies: StudiesTab, code: CodeTab };

function Shell() {
  const { st, set, go } = useNav();
  const tab = tabById(st.tab);
  const sub = subOf(st);
  const [visited, setVisited] = useState({});
  if (!visited[st.tab]) setVisited((v) => ({ ...v, [st.tab]: true }));

  return (
    <div className="app">
      <a className="skip-link" href={`#tab-${st.tab}`}>
        Skip to content
      </a>
      <header className={`band${tab.scenario || tab.closure ? '' : ' no-pickers'}`} data-sticky-bar="">
        <h1>{PAGE_TITLE}</h1>
        <div className="band-pickers">
          {tab.scenario ? (
            <Picker
              icon="sliders"
              label="Scenario"
              value={tab.scenario === 'locked' ? 'uk_central' : st.s}
              options={SCEN_OPTIONS}
              onChange={(s) => set({ s })}
              locked={tab.scenario === 'locked'}
              lockedNote="This tab is solved for UK central only"
            />
          ) : null}
          {tab.closure ? (
            <Picker icon="globe" label="Closure" value={st.closure} options={CLOSURE_OPTIONS} onChange={(closure) => set({ closure })} />
          ) : null}
        </div>
      </header>
      <div className="tabs-bar" data-sticky-bar="">
        <ViewTabs tabs={TABS} value={st.tab} onChange={(id) => go(id)} />
      </div>
      {tab.subs ? (
        <div className="subtabs-bar">
          <ViewTabs
            key={tab.id}
            tabs={tab.subs}
            value={sub}
            onChange={(id) => go(tab.id, { sub: id })}
            idPrefix={`${tab.id}-sub`}
            label={`${tab.label} sections`}
            variant="sub"
          />
        </div>
      ) : null}
      <div className="main-content">
        {TABS.map(({ id }) => {
          const Panel = PANELS[id];
          return visited[id] || id === st.tab ? (
            <section key={id} id={`tab-${id}`} className={`tab-panel tab-${id}`} role="tabpanel" aria-labelledby={`tabbtn-${id}`} hidden={id !== st.tab} tabIndex={-1}>
              <Panel active={id === st.tab} />
            </section>
          ) : null;
        })}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <NavProvider>
      <Shell />
    </NavProvider>
  );
}
