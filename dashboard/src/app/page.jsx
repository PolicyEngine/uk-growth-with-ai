"use client";

import { useRef, useState } from "react";
import StoryTab from "@/tabs/story/StoryTab.jsx";
import ExploreTab from "@/tabs/explore/ExploreTab.jsx";
import MethodSourcesTab from "@/tabs/method/MethodSourcesTab.jsx";
import ViewTabs from "@/components/ab/ViewTabs.jsx";
import { NavProvider, useNav, subOf } from "@/lib/nav.jsx";
import {
  BandPill,
  CopyLink,
  SettingsChip,
  useCondensed,
} from "@/components/ui/SettingsBar.jsx";
import { TABS, tabById, pickersFor, PAGE_TITLE } from "@/lib/labels.js";

// The shell. The title band scrolls away on every tab (on the Story it
// holds the OG-UK settings pill: scenario and capital closure). The sticky
// stack (.sticky-stack) is the tab row, and on the two tabs with sub-tabs
// (Explore, Method and sources) the sub-tab header under it: the sub-tabs
// (a secondary level, scrolling sideways with fade edges on a phone), then
// on the right the settings pill (SettingsChip; shown once the page's own
// pill, in the model row after the page title, has gone under the stack:
// data-condensed, set from the page's one scroll loop) and the copy-link
// icon. On the Story the stack is the tab row only, and the story's rail
// sticks under it. The stack's height is --sticky-offset (v2.css), which
// every anchor's scroll-margin reads. Which settings a page reads is set
// per tab and sub-tab (labels.js). All state lives in the address
// (lib/nav.jsx).

// No scope line under the tabs (Vahid, 17 Nov): the Story's "As of" items
// (the latest ONS and OBR releases read, the model commit) are in the
// hero's sources-and-notes (Hero.jsx); on Explore and Method they are in
// each page's sources-and-notes icon (PageIntro.jsx).

const PANELS = {
  story: StoryTab,
  explore: ExploreTab,
  method: MethodSourcesTab,
};

function Shell() {
  const { st, go, swapTab, clearSwap } = useNav();
  const tab = tabById(st.tab);
  const sub = subOf(st);
  const pick = pickersFor(st.tab, sub);
  const [visited, setVisited] = useState({});
  if (!visited[st.tab]) setVisited((v) => ({ ...v, [st.tab]: true }));
  const inRow = Boolean(tab.subs);
  const hasPickers = Boolean(pick.scenario || pick.closure);
  // the header pill: on a tab with sub-tabs, when the page reads a setting
  const settings = inRow && !pick.study && (hasPickers || pick.arm || pick.rule);
  const app = useRef(null);
  // data-stuck (a shadow under the stack once the page has scrolled) and
  // data-condensed (the page pill has gone under the stack): attributes
  // only, written from the page's scroll loop
  useCondensed(app, `${st.tab}|${sub}`);

  return (
    <div
      className={`app${inRow ? " has-subs" : ""}`}
      ref={app}
    >
      <header className={`band${!inRow && hasPickers ? "" : " no-pickers"}`}>
        <h1>{PAGE_TITLE}</h1>
        {!inRow && hasPickers ? (
          <div className="band-pickers">
            <BandPill pick={pick} />
          </div>
        ) : null}
      </header>
      <div className="sticky-stack" data-sticky-bar="" data-hold="chrome">
        <div className="tabs-bar">
          <ViewTabs tabs={TABS} value={st.tab} onChange={(id) => go(id)} />
          {inRow ? null : <CopyLink />}
        </div>
        {inRow ? (
          <div className="subhead">
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
            {settings ? (
              <SettingsChip key={`${st.tab}|${sub}`} pick={pick} sub={sub} />
            ) : null}
            <CopyLink />
          </div>
        ) : null}
      </div>
      <div className="main-content" id="main-content" tabIndex={-1}>
        {TABS.map(({ id }) => {
          const Panel = PANELS[id];
          return visited[id] || id === st.tab ? (
            <section
              key={id}
              id={`tab-${id}`}
              className={`tab-panel tab-${id}${id === swapTab ? " is-swap" : ""}`}
              onAnimationEnd={(e) => e.target === e.currentTarget && clearSwap()}
              role="tabpanel"
              aria-labelledby={`tabbtn-${id}`}
              hidden={id !== st.tab}
              tabIndex={-1}
            >
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
