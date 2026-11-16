'use client';

import { useState } from 'react';
import StoryTab from '@/tabs/story/StoryTab.jsx';
import ExploreTab from '@/tabs/explore/ExploreTab.jsx';
import MethodSourcesTab from '@/tabs/method/MethodSourcesTab.jsx';
import ViewTabs from '@/components/ab/ViewTabs.jsx';
import Icon from '@/components/ab/Icon.jsx';
import Picker from '@/components/ui/Picker.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavProvider, useNav, subOf } from '@/lib/nav.jsx';
import { TABS, tabById, pickersFor, CLOSURES, PAGE_TITLE } from '@/lib/labels.js';
import { SCENARIOS } from '@/tabs/ai/surprise.js';

// The shell: a sticky title band holding the two global pickers (scenario,
// capital closure), a sticky tab row, and a second row on the two tabs that
// have sub-tabs. Which pickers show is set per tab and sub-tab (labels.js). All state lives in the address (lib/nav.jsx).

const SCEN_NOTE = { uk_low: 'UK range, lower end', uk_central: 'Headline scenario', uk_high: 'UK range, upper end', korinek: 'A US upper case: Korinek et al.’s “substantial” inputs' };
const SCEN_OPTIONS = SCENARIOS.map((s) => ({ value: s.id, label: s.label, note: SCEN_NOTE[s.id] }));
const CLOSURE_OPTIONS = CLOSURES.map((c) => ({ value: c.id, label: c.label, note: c.note, icon: c.icon }));

// What each page's results can and cannot say: one short icon item per
// model, in one line under the tabs.
const SCOPE = {
  oguk: { icon: 'model', text: 'OG-UK, the whole economy: gaps against the OBR-central path, not forecasts; no unemployment' },
  study: { icon: 'provisional', text: 'uk-ai-study: households in FY 2026–27 if some employees lose their jobs; provisional' },
};
const scopeFor = (tab, sub) => {
  if (tab === 'explore') return sub === 'households' ? [SCOPE.study] : [SCOPE.oguk];
  if (tab === 'method') return sub === 'households' ? [SCOPE.study] : sub === 'how' || sub === 'scenarios' ? [SCOPE.oguk] : [SCOPE.oguk, SCOPE.study];
  return [SCOPE.oguk, SCOPE.study];
};

const PANELS = { story: StoryTab, explore: ExploreTab, method: MethodSourcesTab };

function Shell() {
  const { st, set, go } = useNav();
  const tab = tabById(st.tab);
  const sub = subOf(st);
  const pick = pickersFor(st.tab, sub);
  const [visited, setVisited] = useState({});
  if (!visited[st.tab]) setVisited((v) => ({ ...v, [st.tab]: true }));

  return (
    <div className="app">
      <header className={`band${pick.scenario || pick.closure ? '' : ' no-pickers'}`} data-sticky-bar="">
        <h1>{PAGE_TITLE}</h1>
        <div className="band-pickers">
          {pick.scenario ? (
            <Picker
              icon="sliders"
              label="Scenario"
              value={pick.scenario === 'locked' ? 'uk_central' : st.s}
              options={SCEN_OPTIONS}
              onChange={(s) => set({ s })}
              locked={pick.scenario === 'locked'}
              lockedNote="Who gains shows UK central only"
            />
          ) : null}
          {pick.closure ? (
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
      <div className="main-content" id="main-content" tabIndex={-1}>
        <ul className="scope-strip scope-items" aria-label="What these results are">
          {scopeFor(st.tab, sub).map((t) => (
            <li key={t.text} className="scope-item">
              <Icon name={iconFor(t.icon)} size={14} /> {t.text}
            </li>
          ))}
        </ul>
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
