"use client";

import { useEffect, useRef, useState } from "react";
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
  SCEN_OPTIONS,
  CLOSURE_OPTIONS,
} from "@/components/ui/SettingsBar.jsx";
import { TABS, tabById, pickersFor, PAGE_TITLE } from "@/lib/labels.js";

// The shell. On the Story: a sticky title band holding the two global
// pickers (scenario, capital closure), then the sticky tab row and the
// story's rail. On the two tabs with sub-tabs (Explore, Method and sources)
// the title band scrolls away (the header condenses) and the sticky stack
// is the tab row, with the sub-tabs beside the tabs (their own scrolling row
// at 900px and below) and a copy-link control, then on Explore the settings
// bar (components/ui/SettingsBar.jsx: scenario, closure, arm, fiscal rule;
// on a uk-ai-study page the "different model" chip). The stack's height is
// --sticky-offset (v2.css), which every anchor's scroll-margin reads. Which
// pickers show is set per tab and sub-tab (labels.js). All state lives in
// the address (lib/nav.jsx).

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
      text: `Two models. OG-UK: the whole economy. uk-ai-study: households in ${AI_STUDY.model_year_label}.`,
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
  // a shadow under the sticky stack once the page has scrolled (paint only:
  // an attribute, no re-render and no layout change)
  useEffect(() => {
    const el = app.current;
    if (!el) return undefined;
    let on = null;
    const check = () => {
      const now = window.scrollY > 4;
      if (now !== on) {
        on = now;
        el.toggleAttribute("data-stuck", now);
      }
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  return (
    <div
      className={`app${inRow ? " has-subs" : ""}${settings ? " has-settings" : ""}`}
      ref={app}
    >
      <header
        className={`band${!inRow && hasPickers ? "" : " no-pickers"}`}
        data-sticky-bar=""
      >
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
      <div className="tabs-bar" data-sticky-bar="">
        <ViewTabs tabs={TABS} value={st.tab} onChange={(id) => go(id)} />
        {inRow ? (
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
        <CopyLink />
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
