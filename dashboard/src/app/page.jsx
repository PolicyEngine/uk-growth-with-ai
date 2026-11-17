"use client";

import { useRef, useState } from "react";
import StoryTab from "@/tabs/story/StoryTab.jsx";
import ExploreTab from "@/tabs/explore/ExploreTab.jsx";
import MethodSourcesTab from "@/tabs/method/MethodSourcesTab.jsx";
import ViewTabs from "@/components/ab/ViewTabs.jsx";
import Picker from "@/components/ui/Picker.jsx";
import AI_STUDY from "@/data/aiStudy2425.json";
import AsOf from "@/components/story/AsOf.jsx";
import { Hy } from "@/components/story/Hy.jsx";
import { NavProvider, useNav, subOf } from "@/lib/nav.jsx";
import SettingsBar, {
  CopyLink,
  ModelChip,
  SettingsChip,
  SCEN_OPTIONS,
  CLOSURE_OPTIONS,
  useCondensed,
} from "@/components/ui/SettingsBar.jsx";
import { TABS, tabById, pickersFor, PAGE_TITLE } from "@/lib/labels.js";

// The shell. The title band scrolls away on every tab (on the Story it
// holds the two global pickers, scenario and capital closure). The sticky
// stack (.sticky-stack) is the tab row, and on the two tabs with sub-tabs
// (Explore, Method and sources) the sub-tab header under it: the sub-tabs
// (a secondary level, scrolling sideways with fade edges on a phone), then
// on the right the settings chip (SettingsChip: the settings in words; it
// opens every picker the page reads) or, on a uk-ai-study page, the
// "different model" chip, and the copy-link icon. Under the stack, at rest,
// the full settings bar (components/ui/SettingsBar.jsx: scenario, closure,
// arm, fiscal rule; not sticky); the chip shows once that bar has scrolled
// under the stack (data-condensed, set from the page's one scroll loop).
// On the Story the stack is the tab row only, and the story's rail sticks
// under it. The stack's height is --sticky-offset (v2.css), which every
// anchor's scroll-margin reads. Which pickers show is set per tab and
// sub-tab (labels.js). All state lives in the address (lib/nav.jsx).

// What each page's results can and cannot say, and the "As of" stamp: one
// meta line under the tabs (round 1: the scope lines and "As of" were three
// lines with an icon each; now one line, no icon, middle dots between).
const SCOPE = {
  oguk: {
    text: "OG-UK: gaps against the OBR-central path, not forecasts; no unemployment",
  },
  study: {
    text: `uk-ai-study: households in ${AI_STUDY.model_year_label} if some employees lose their jobs`,
  },
};
const scopeFor = (tab, sub) => {
  if (tab === "explore")
    return sub === "households" ? [SCOPE.study] : [SCOPE.oguk];
  if (tab === "method")
    return sub === "households"
      ? [SCOPE.study]
      : sub === "how"
        ? [SCOPE.oguk]
        : [SCOPE.oguk, SCOPE.study];
  // the Story: one plain line for both models (review T8)
  return [
    {
      text: `Two models. OG-UK: the whole economy. uk-ai-study: households in ${AI_STUDY.model_year_label}`,
    },
  ];
};

const PANELS = {
  story: StoryTab,
  explore: ExploreTab,
  method: MethodSourcesTab,
};

function Shell() {
  const { st, set, go } = useNav();
  const tab = tabById(st.tab);
  const sub = subOf(st);
  const pick = pickersFor(st.tab, sub);
  const [visited, setVisited] = useState({});
  if (!visited[st.tab]) setVisited((v) => ({ ...v, [st.tab]: true }));
  const inRow = Boolean(tab.subs);
  const hasPickers = Boolean(pick.scenario || pick.closure);
  // the settings bar: on a tab with sub-tabs, when the page has a choice to
  // make or is a uk-ai-study page
  const settings = inRow && (hasPickers || pick.arm || pick.rule || pick.study);
  const app = useRef(null);
  // data-stuck (a shadow under the stack once the page has scrolled) and
  // data-condensed (the settings bar has gone under the stack): attributes
  // only, written from the page's scroll loop
  useCondensed(app, `${st.tab}|${sub}`);

  return (
    <div
      className={`app${inRow ? " has-subs" : ""}${settings ? " has-settings" : ""}`}
      ref={app}
    >
      <header className={`band${!inRow && hasPickers ? "" : " no-pickers"}`}>
        <h1>{PAGE_TITLE}</h1>
        {!inRow && hasPickers ? (
          <div className="band-pickers">
            {pick.scenario ? (
              <Picker
                icon="sliders"
                label="Scenario"
                value={pick.scenario === "locked" ? "uk_central" : st.s}
                options={SCEN_OPTIONS}
                onChange={(s) => set({ s })}
                locked={pick.scenario === "locked"}
                lockedNote="Who gains shows UK central only"
              />
            ) : null}
            {pick.closure ? (
              <Picker
                icon="globe"
                label="Closure"
                value={st.closure}
                options={CLOSURE_OPTIONS}
                onChange={(closure) => set({ closure })}
              />
            ) : null}
          </div>
        ) : null}
      </header>
      <div className="sticky-stack" data-sticky-bar="">
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
            {settings && pick.study ? <ModelChip /> : null}
            {settings && !pick.study ? (
              <SettingsChip key={`${st.tab}|${sub}`} pick={pick} />
            ) : null}
            <CopyLink />
          </div>
        ) : null}
      </div>
      {settings ? <SettingsBar pick={pick} /> : null}
      <div className="main-content" id="main-content" tabIndex={-1}>
        <p className="scope-line" data-cite="">
          {pick.study && settings
            ? null
            : scopeFor(st.tab, sub).map((t) => (
                <span key={t.text} className="scope-item">
                  <Hy>{t.text}</Hy>
                  <span className="scope-sep" aria-hidden="true">
                    {" · "}
                  </span>
                </span>
              ))}
          <AsOf inline />
        </p>
        {TABS.map(({ id }) => {
          const Panel = PANELS[id];
          return visited[id] || id === st.tab ? (
            <section
              key={id}
              id={`tab-${id}`}
              className={`tab-panel tab-${id}`}
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
