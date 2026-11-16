// The one name of every choice on the page. Tabs, pickers, control bars,
// tooltips and downloads all read these, so a name cannot drift.

export const PAGE_TITLE = 'The macroeconomic effects of AI on the UK';

// Tabs, in order, and their sub-tabs. `scenario` / `closure`: whether that
// header picker applies ('locked' = shown, fixed, with the reason in view);
// a sub-tab's own setting wins over its tab's. `arm` / `rule`: the page
// pickers in the settings bar (`rule` may list the rules that page has
// solves for; the others show disabled). `study`: a uk-ai-study page, which
// shows the "different model" chip in place of the OG-UK settings. The site
// had seven tabs until November 2026, and eleven views until the All
// scenarios and Scenarios sub-tabs folded into Economy ("Across scenarios")
// and OG-UK method; lib/nav.jsx sends their addresses here. On Economy and
// Public finances the arm picker drives the across-scenarios matrices (the
// line charts draw every arm, &arms=).
export const TABS = [
  { id: 'story', label: 'Story', icon: 'compass', scenario: true, closure: true },
  { id: 'explore', label: 'Explore', icon: 'sliders', scenario: true, closure: true, rule: true, arm: true,
    subs: [
      { id: 'economy', label: 'Economy', icon: 'factory' },
      { id: 'finances', label: 'Public finances', icon: 'landmark' },
      { id: 'who', label: 'Who gains and who loses', short: 'Who gains', icon: 'usersRound', scenario: 'locked', arm: true, rule: ['common', 'dn'] },
      { id: 'households', label: 'Households', icon: 'briefcase', scenario: false, closure: false, rule: false, study: true },
    ] },
  { id: 'method', label: 'Method and sources', short: 'Method', icon: 'book',
    subs: [
      { id: 'how', label: 'OG-UK method', icon: 'sigma' },
      { id: 'households', label: 'Household method', icon: 'briefcase', study: true },
      { id: 'studies', label: 'Evidence', icon: 'library' },
      { id: 'code', label: 'Data and code', icon: 'code' },
    ] },
];
export const tabById = (id) => TABS.find((t) => t.id === id);
// The pickers that apply to a tab and sub-tab.
export const pickersFor = (tabId, subId) => {
  const t = tabById(tabId);
  const s = t?.subs?.find((x) => x.id === subId) ?? t?.subs?.[0];
  const pick = (k) => s?.[k] ?? t?.[k] ?? false;
  return { scenario: pick('scenario'), closure: pick('closure'), arm: pick('arm'), rule: pick('rule'), study: pick('study') };
};

// The arms, as the settings bar's picker names them: an icon and a sub-label
// of six words or fewer each (lib/nav.jsx stores the id in &arm=).
export const ARM_PICK = [
  { id: 'tfp', label: 'Automation + productivity', short: 'Automation + productivity', note: 'Share shift + higher output', icon: 'sparkles' },
  { id: 'tz', label: 'Technology unchanged', short: 'Technology unchanged', note: 'Share shift only', icon: 'equal' },
  { id: 'ss', label: 'Stress test', short: 'Stress test', note: 'No output gain: a bound', icon: 'gauge' },
];
// Who gains names its arms differently (tabs/cohorts): the same three.
export const WG_ARM = { tfp: 'tfp', tz: 'zfixed', ss: 'stress' };
export const ARM_OF_WG = { tfp: 'tfp', zfixed: 'tz', stress: 'ss' };
// The fiscal rules in the settings bar: icon and sub-label
export const RULE_PICK = {
  common: { icon: 'scale', sub: 'Spending follows GDP' },
  fixed: { icon: 'lock', sub: 'Spending held at OBR level' },
  dn: { icon: 'landmark', sub: 'Transfers keep debt on path' },
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
  { id: 'dn', label: 'Debt-neutral transfers', short: 'Debt-neutral', note: 'Households pay the fiscal effect' },
];
export const ruleLabel = (id) => RULES.find((r) => r.id === id)?.label ?? id;

// Method page anchors, for every "About this chart" link.
export const METHOD = {
  shock: { id: 'm-shock', label: 'The shock' },
  closures: { id: 'm-closures', label: 'Closures and income measures' },
  rules: { id: 'm-rules', label: 'Fiscal rules and public finances' },
  model: { id: 'm-model', label: 'The model' },
  welfare: { id: 'm-generations', label: 'Many generations at once' },
  limits: { id: 'm-limits', label: 'Limitations' },
  history: { id: 'm-history', label: 'Revision history' },
};
