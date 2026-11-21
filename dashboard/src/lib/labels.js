import { HEADLINE_YEAR, LATE_YEAR, SURPRISE_YEAR, ZETA, CENTRAL, S, foreignShareOf, result } from '@/tabs/ai/surprise.js';
import { fracWord } from '@/tabs/story/part2/caveats.js';

// The one name of every choice on the page. Tabs, pickers, control bars,
// tooltips and downloads all read these, so a name cannot drift.

// The series name (Vahid, 18 Nov): the page <title>, the header and the
// hero's quiet line above the question.
export const PAGE_TITLE = 'AI and the UK economy: Beyond the forecast';

// The macro model's one name and its plain-words account (push D, Q1;
// Vahid: not "OG-UK"). Readers meet "the macro model" (MACRO), or "the
// overlapping-generations model" where the generational point matters;
// the package name stays only on links to its code. MACRO_ABOUT is said
// once on each tab, at its first mention; it claims only what Method's
// own account does (the four blocks: households by age, firms, a
// government and the rest of the world; Many generations at once: work,
// save, retire).
export const MACRO = 'the macro model';
export const MACRO_CAP = 'The macro model';
export const MACRO_ABOUT = 'an overlapping-generations model of the UK economy, which follows households of each age as they work, save and retire, alongside firms, the government and the rest of the world';
export const MACRO_ABOUT_CAP = MACRO_ABOUT[0].toUpperCase() + MACRO_ABOUT.slice(1);

// Tabs, in order, and their sub-tabs. `scenario` / `closure` / `arm` /
// `rule`: whether that section is in the page's settings pill ('locked' =
// shown, fixed, with the reason in the panel); a sub-tab's own setting wins
// over its tab's (`rule` may list the rules that page has solves for; the
// others show disabled). `study`: a uk-ai-study page, which shows the
// household study's model line in place of the OG-UK settings. The site
// had seven tabs until November 2026, and eleven views until the All
// scenarios and Scenarios sub-tabs folded into Economy ("Across scenarios")
// and OG-UK method; lib/nav.jsx sends their addresses here. On Economy and
// Public finances the Version section drives the across-scenarios matrices
// (the line charts draw every arm, &arms=).
export const TABS = [
  { id: 'story', label: 'Story', icon: 'compass', scenario: true, closure: true },
  { id: 'explore', label: 'Explore', icon: 'sliders', scenario: true, closure: true, rule: true, arm: true,
    subs: [
      { id: 'economy', label: 'Economy', icon: 'factory' },
      { id: 'finances', label: 'Public finances', short: 'Finances', icon: 'landmark' },
      { id: 'who', label: 'Who gains and who loses', short: 'Who gains', icon: 'usersRound', scenario: 'locked', arm: true, rule: ['common', 'dn'] },
      { id: 'households', label: 'Households', icon: 'briefcase', scenario: false, closure: false, rule: false, study: true },
    ] },
  { id: 'method', label: 'Method and sources', short: 'Method', icon: 'book',
    subs: [
      { id: 'how', label: 'Macro model method', short: 'Macro model', icon: 'sigma' },
      { id: 'households', label: 'Household method', short: 'Households', icon: 'briefcase', study: true },
      { id: 'studies', label: 'Evidence', icon: 'library' },
      { id: 'code', label: 'Data and code', short: 'Code', icon: 'code' },
      { id: 'detail', label: 'Detail and sources', short: 'Detail', icon: 'fileText', study: true },
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

// The arms (versions), as the pill names them: each option's one line
// (item-11-pill-fable.md section 5; lib/nav.jsx stores the id in &arm=).
export const ARM_PICK = [
  { id: 'tfp', label: 'Automation + productivity', short: 'Automation + productivity', note: 'The capital share rises, and output at fixed inputs rises by the scenario’s gain', icon: 'sparkles' },
  { id: 'tz', label: 'Technology unchanged', short: 'Technology unchanged', note: 'The same rise in the capital share, with no productivity gain', icon: 'equal' },
  { id: 'ss', label: 'Stress test', short: 'Stress test', note: `${HEADLINE_YEAR} GDP held at the OBR’s central forecast path, by design`, icon: 'gauge' },
];
// Who gains names its arms differently (tabs/cohorts): the same three.
export const WG_ARM = { tfp: 'tfp', tz: 'zfixed', ss: 'stress' };
export const ARM_OF_WG = { tfp: 'tfp', zfixed: 'tz', stress: 'ss' };
// The one name of each headline measure (review round 1, R1-14; Maria's
// point 2): every surface (Story tiles, the hero, Explore's chips, wall,
// dumbbells, slope panels, ζK grid and Across scenarios, Method) reads its
// name here. `name`: the plain name, in titles and tiles; `short`: where
// space is tight (end labels, chips); `abbr`: the national-accounts code,
// shown once in brackets beside the plain name; `title`: name and code
// together; `def`: the one-sentence definition (tips, Method). National
// income leads as NNI, the income UK residents keep after the wear and
// tear on capital (depreciation); GNI is the same income before
// depreciation, shown beside it. Neither is always the larger gap: with no
// foreign capital NNI's gap can exceed GNI's (UK high, Korinek), so no
// wording here says which is smaller.
export const MEASURE = {
  Y: {
    name: 'GDP',
    short: 'GDP',
    abbr: 'GDP',
    title: 'GDP (total output)',
    def: 'Gross domestic product: everything produced in the UK, including by foreign-owned capital.',
  },
  NNI: {
    name: 'National income',
    short: 'National income',
    abbr: 'NNI',
    title: 'National income (NNI)',
    def: 'Net national income (NNI): the income UK residents keep after the wear and tear on capital (depreciation). GDP less net income paid abroad, less depreciation.',
  },
  GNI: {
    name: 'National income before depreciation',
    short: 'Before depreciation',
    abbr: 'GNI',
    title: 'National income before depreciation (GNI)',
    def: 'Gross national income (GNI): national income before the wear and tear on capital is taken off. GDP less net income paid abroad to owners of UK capital and holders of UK government debt.',
  },
  w: {
    name: 'Pay rate',
    short: 'Pay rate',
    abbr: 'pay rate',
    title: 'Pay rate (pay per unit of labour)',
    def: 'Pay per unit of labour, adjusted for skill. It is not average earnings, which also move with hours and the mix of jobs.',
  },
};
export const measureName = (v) => MEASURE[v]?.name ?? v;

// The share of the added capital that ends up foreign-owned with some
// foreign capital, in words (foreign_share_dK_<headline year> through
// lib/dataKeys.js, UK central's main version: the default scenario); null
// when that solve is pending.
const fsWord = () => {
  const x = foreignShareOf(result(S.default_scenario ?? 'uk_central', 'tfp', CENTRAL));
  return x == null ? null : fracWord(x / 100);
};
// ζK as a share of the extra capital firms want (Maria's point on 10%
// against 77%; the 16db56b ruling keeps "excess capital demand" for
// Method's glossed definition only; R4-03): ζK is not the foreign-owned
// share of the added capital.
const zkPct = Math.round((ZETA[CENTRAL] ?? 0) * 100);
const zkNote = () => {
  const w = fsWord();
  return `Foreign investors supply ${zkPct}% of the extra capital firms want, not of added capital${w ? `; ${w} of the added capital ends up foreign-owned` : ''}`;
};

// Capital closure: who owns the new capital.
export const CLOSURES = [
  // the pill's lines; ζK's home is Method (m-closures)
  { id: 'central', label: 'Some foreign capital', note: zkNote(), icon: 'globe' },
  { id: 'closed', label: 'No foreign capital', note: 'No foreign-owned private capital', icon: 'lock' },
  { id: 'both', label: 'Both', note: 'Both cases together: some solid, none dashed', icon: 'layers' },
];
export const closureLabel = (id) => CLOSURES.find((c) => c.id === id)?.label ?? id;

// Fiscal rule, in the paper's terms (sections/incidence.tex: "common fiscal
// rule", "debt-neutral transfers"; appendix: "fixed spending"). The common
// rule is the default of every solve: government consumption and transfers
// follow GDP. Cohorts' "common" cell carries the same solve label as the
// default Results solve, so it is one rule under one name.
// `note`: the option's one line (item-15-fable.md C), with no final full
// stop (the tooltip adds a prefix, Method a stop). The debt rule's first
// year is the model's tG1 (2036, a fixed calendar year: scenarios.py
// TG1 = 10 from 2026, kept by the 2028 runs' shift), read from the data as
// LATE_YEAR; the rule moves government consumption towards OG-UK's
// long-run debt ratio (debt_ratio_ss), under every rule.
export const RULES = [
  { id: 'common', label: 'Common fiscal rule', short: 'Common rule', note: `Spending follows GDP until ${LATE_YEAR}. From ${LATE_YEAR} a debt rule adjusts spending to steer debt/GDP towards the model’s long-run ratio`, plain: 'spending follows GDP' },
  { id: 'fixed', label: 'Fixed spending', short: 'Fixed spending', note: `Spending stays at its baseline level, whatever GDP does. From ${LATE_YEAR} the same debt rule applies`, plain: 'spending held fixed' },
  { id: 'dn', label: 'Debt-neutral transfers', short: 'Debt-neutral', note: `Transfers adjust from ${SURPRISE_YEAR} to ${LATE_YEAR - 1} so debt/GDP is on the forecast path from ${SURPRISE_YEAR + 1} to ${LATE_YEAR}; from ${LATE_YEAR} the debt rule sets spending`, plain: 'debt held steady by transfers to households' },
];
export const ruleLabel = (id) => RULES.find((r) => r.id === id)?.label ?? id;
// The budget assumption in plain words, for figure subtitles.
export const rulePlain = (id) => RULES.find((r) => r.id === id)?.plain ?? ruleLabel(id).toLowerCase();

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
