// The one name of every choice on the page. Tabs, pickers, control bars,
// tooltips and downloads all read these, so a name cannot drift.

export const PAGE_TITLE = 'The macroeconomic effects of AI on the UK';

// Tabs, in order, and their sub-tabs. `scenario` / `closure`: whether that
// header picker applies ('locked' = shown, fixed, with the reason in view);
// a sub-tab's own setting wins over its tab's. The site had seven tabs until
// November 2026; lib/nav.jsx sends their addresses here.
export const TABS = [
  { id: 'story', label: 'Story', icon: 'compass', scenario: true, closure: true },
  { id: 'explore', label: 'Explore', icon: 'sliders', scenario: true, closure: true,
    subs: [
      { id: 'economy', label: 'Economy', icon: 'factory' },
      { id: 'finances', label: 'Public finances', icon: 'landmark' },
      { id: 'who', label: 'Who gains', icon: 'usersRound', scenario: 'locked' },
      { id: 'all', label: 'All scenarios', icon: 'layoutGrid', scenario: false, closure: false },
      { id: 'households', label: 'Households', icon: 'briefcase', scenario: false, closure: false },
    ] },
  { id: 'method', label: 'Method and sources', short: 'Method', icon: 'book',
    subs: [
      { id: 'how', label: 'OG-UK method', icon: 'sigma' },
      { id: 'households', label: 'Household method', icon: 'briefcase' },
      { id: 'scenarios', label: 'Scenarios', icon: 'target' },
      { id: 'studies', label: 'Evidence', icon: 'library' },
      { id: 'code', label: 'Data and code', icon: 'code' },
    ] },
];
export const tabById = (id) => TABS.find((t) => t.id === id);
// The pickers that apply to a tab and sub-tab.
export const pickersFor = (tabId, subId) => {
  const t = tabById(tabId);
  const s = t?.subs?.find((x) => x.id === subId) ?? t?.subs?.[0];
  return { scenario: s?.scenario ?? t?.scenario ?? false, closure: s?.closure ?? t?.closure ?? false };
};

// Capital closure: who owns the new capital.
export const CLOSURES = [
  { id: 'central', label: 'Central', note: 'Some new capital is foreign-owned (ζK = 0.1)', icon: 'globe' },
  { id: 'closed', label: 'Closed capital', note: 'None is foreign-owned (ζK = 0)', icon: 'lock' },
  { id: 'both', label: 'Both', note: 'Central solid, closed capital dashed', icon: 'layers' },
];
export const closureLabel = (id) => CLOSURES.find((c) => c.id === id)?.label ?? id;

// Fiscal rule, in the paper's terms (sections/incidence.tex: "common fiscal
// rule", "debt-neutral transfers"; appendix: "fixed spending"). The common
// rule is the default of every solve: government consumption and transfers
// follow GDP. Cohorts' "common" cell carries the same solve label as the
// default Results solve, so it is one rule under one name.
export const RULES = [
  { id: 'common', label: 'Common fiscal rule', short: 'Common rule', note: 'Spending follows GDP' },
  { id: 'fixed', label: 'Fixed spending', short: 'Fixed spending', note: 'Spending stays at its OBR-central level' },
  { id: 'dn', label: 'Debt-neutral transfers', short: 'Debt-neutral', note: 'Households bear the fiscal effect' },
];
export const ruleLabel = (id) => RULES.find((r) => r.id === id)?.label ?? id;

// Method page anchors, for every "About this chart" link.
export const METHOD = {
  shock: { id: 'm-shock', label: 'The shock' },
  closures: { id: 'm-closures', label: 'Closures and income measures' },
  rules: { id: 'm-rules', label: 'Fiscal rules and public finances' },
  model: { id: 'm-model', label: 'The model' },
  welfare: { id: 'm-generations', label: 'The model' },
  limits: { id: 'm-limits', label: 'Limitations' },
  history: { id: 'm-history', label: 'Revision history' },
};
