// Every scenario input and model parameter, with what kind of source it has
// (from the Method claim audit's inputs table, 16 Nov 2026). Values are the
// ones the model used: the scenario pairs come from surprise2028.json.
// kind: published (printed in the source), derived (computed by this study
// from printed figures, by a rule the source does not state), default (OG-UK's
// default parameter, no UK estimate behind it), choice (a modelling choice,
// not from a published source), external (an external source, linked).
import { scenarioById, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, RAMP_WORD, CENTRAL, gap } from '@/tabs/ai/surprise.js';
import { ADOPTION, ADOPTION_YEAR, CALENDAR, OBR_YEAR_ONE, OBR_B4_LEVEL, clockText, pctRange } from '@/lib/obrOverlap.js';
// the overlap's short form (María re-review M5): the assumed clock first
const OVERLAP_SHORT = `${pctRange(CALENDAR)} over ${SURPRISE_YEAR}–${HEADLINE_YEAR} if its adoption curve starts in ${OBR_YEAR_ONE} (${pctRange(ADOPTION)} if it starts with the shock)`;

// a scenario's name and its two inputs, as the table and the macro page's
// Key settings print them
const sc = (id) => scenarioById(id);
export const name = (id) => sc(id).label;
export const pp = (id) => `−${sc(id).labour_share_fall_pp.toFixed(1)}pp`;
export const pc = (id) => `+${sc(id).tfp_gain_pct.toFixed(1)}%`;

// `sym`: the row's parameter symbol (components/ui/MathSym.jsx), printed
// before the label in the table and kept out of the label text (Method
// redesign, 6.1; request 22). The search and the download read its plain
// form.
// `part`: which part of the study uses the input (the table's "Used by"
// column and filter): the macro model (Part 2) or the household study (Part 3).
export const PART_USED = {
  macro: { n: 2, name: 'Macro model' },
  households: { n: 3, name: 'Household study' },
};

export const KIND = {
  published: { label: 'Published', icon: 'source' },
  derived: { label: 'Derived', icon: 'arithmetic' },
  default: { label: 'Macro model default', icon: 'model' },
  choice: { label: 'Modelling choice', icon: 'rule' },
  external: { label: 'External', icon: 'link' },
};

// Korinek et al.'s results beside ours (benchmarks review B2, superseding
// results review F8): only the share fall and the TFP input are taken from
// the source (Table 3, substantial, start of 2030: GDP +8.3%, labour income
// +1.4%, capital +13.8%). Ours, main version with some foreign capital, from
// the data: GDP and capital gaps; labour income is GDP times the share
// ratio, (1 + Y gap)(1 - gamma1)/(1 - gamma0) - 1. null while pending.
const KORINEK_SRC = { Y: 8.3, labourIncome: 1.4, K: 13.8 };
const signedPct = (x) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(1)}%`;
export function korinekBeside() {
  const y = gap('korinek', 'tfp', CENTRAL, 'Y');
  const k = gap('korinek', 'tfp', CENTRAL, 'K');
  const s = sc('korinek');
  if (y == null || k == null || !s) return null;
  const g1 = s.gamma_terminal;
  const g0 = g1 - s.labour_share_fall_pp / 100;
  const li = 100 * ((1 + y / 100) * ((1 - g1) / (1 - g0)) - 1);
  return `Only these two inputs are taken from it. The source has GDP ${signedPct(KORINEK_SRC.Y)} and labour income ${signedPct(KORINEK_SRC.labourIncome)}; here GDP is about ${signedPct(y)} and labour income about ${signedPct(li)}, because capital rises about ${Math.round(k)}% against the source’s ${KORINEK_SRC.K}%.`;
}

// `id`: the row's anchor (#in-…), frozen (Method redesign, M3): each is the
// slug its label had on 22 Nov 2026 under the 2028 set, typed here so a
// reworded label or an added symbol cannot move a link. Two labels carry a
// year or a word from the data; their ids keep the 2028 form in both sets.
export const INPUTS = [
  // the scenario pairs
  { id: 'in-uk-low-output-at-fixed-inputs', group: 'Scenarios', part: 'macro', input: 'UK low: output at fixed inputs', value: pc('uk_low'), kind: 'derived', how: `OBR J-curve, 0.1pp a year by year five, phased in linearly: 0.1 × (1+2+3+4)/5 = 0.2%; Chart B.4 reads ${OBR_B4_LEVEL.J[ADOPTION_YEAR - 1].toFixed(2)}% at year ${ADOPTION_YEAR}.`, src: ['bp9B12', 'frs86'] },
  { id: 'in-uk-low-labour-share-fall', group: 'Scenarios', part: 'macro', input: 'UK low: labour-share fall', value: pp('uk_low'), kind: 'derived', how: `The gain divided by the IMF’s 27% cost saving: 0.2 ÷ 0.27 = 0.74pp. The IMF does not print this rule or figure. This pairing gives about a quarter of a per cent of productivity gain per point of share fall. Pay holds its path only at about 0.95% per point, so in this scenario pay ends below the path by ${HEADLINE_YEAR} because of how the inputs are paired.`, src: ['imfSip44'] },
  { id: 'in-uk-central-output-at-fixed-inputs', group: 'Scenarios', part: 'macro', input: 'UK central: output at fixed inputs', value: `${pc('uk_central')}, model input (rounded)`, kind: 'derived', how: `IMF Table 1 prints years 5 and 10 only; year 4 is read off Figure 9 as about 0.42% (0.41–0.44%). Cross-check: the OBR’s own AI effect adds ${OVERLAP_SHORT} (Briefing paper No.9, Chart B.4), already in the forecast path; this input is not net of it.`, src: ['imfSipT1', 'imfSipFig9', 'bp9B14', 'efoOct127'] },
  { id: 'in-uk-central-labour-share-fall-headline', group: 'Scenarios', part: 'macro', input: 'UK central: labour-share fall (headline)', value: pp('uk_central'), kind: 'derived', how: `Derived, not published by the IMF. Year-4 TFP is read off IMF SIP/2026/072 Figure 9 as about 0.42% (0.41–0.44%; only years 5 and 10 are printed). Divided by the IMF’s 27% cost saving, the 0.41–0.44% reading gives 1.5–1.6pp. The UK central scenario uses 1.6pp. This pairing gives about a quarter of a per cent of productivity gain per point of share fall. Pay holds its path only at about 0.95% per point, so in this scenario pay ends below the path by ${HEADLINE_YEAR} because of how the inputs are paired.`, note: 'The share is derived from the 0.42 reading, but the TFP input is the rounded 0.4, which on its own would give 0.4 ÷ 0.27 = 1.5pp.', src: ['imfSipFig9', 'imfSip44', 'frs87'] },
  { id: 'in-uk-high-output-at-fixed-inputs', group: 'Scenarios', part: 'macro', input: 'UK high: output at fixed inputs', value: pc('uk_high'), kind: 'derived', how: 'The OBR’s high alternative, up to 0.8pp a year (a decade average), phased in linearly to year five: 2 × 0.8 = 1.6%. Ramping to it by year five is a modelling choice.', src: ['frs86', 'bp9B14', 'imfArt4'] },
  { id: 'in-uk-high-labour-share-fall', group: 'Scenarios', part: 'macro', input: 'UK high: labour-share fall', value: pp('uk_high'), kind: 'derived', how: `The OBR’s upper-end path, wages and salaries 40% → 20% of GDP over 45 years: 20/45 × 4 = 1.78pp, rescaled to the macro model’s 65% labour share: × 65/40 = 2.89pp. Rescaling and the ${SURPRISE_YEAR} start are modelling choices.`, src: ['frs87', 'frs88'] },
  { id: 'in-korinek-et-al-substantial-us-labour-shar', group: 'Scenarios', part: 'macro', input: 'Korinek et al., substantial (US): labour share and TFP', value: `${pp('korinek')}; ${pc('korinek')}`, kind: 'published', how: ['The ‘substantial’ scenario of Korinek et al. (2026), a US case used as the upper case, not calibrated to the UK: labour share 60.0 → 56.1; measured TFP +3.1% in 2030.', korinekBeside()].filter(Boolean).join(' '), src: ['korinekT3'] },
  { id: 'in-stress-test-gdp-held-at-the-obr-s-centra', group: 'Scenarios', part: 'macro', input: 'Stress test: GDP held at the OBR’s central forecast path', value: `GDP gap 0 in ${HEADLINE_YEAR}`, kind: 'choice', how: 'After the OBR’s displacement scenario, GDP unchanged. The 0.01pp tolerance is a modelling choice.', src: ['efoMarBox22'] },
  { id: 'in-which-pairs-the-three-arms-the-headline', group: 'Scenarios', part: 'macro', input: 'Which pairs, the three arms, the headline', value: '—', kind: 'choice', how: 'The study’s design.', src: ['calibNote', 'fiscalRules'] },
  // timing
  { id: 'in-the-scenario-s-ai-starts-as-a-surprise-o', group: 'Timing', part: 'macro', input: 'The scenario’s AI starts as a surprise; one starting point', value: `${SURPRISE_YEAR}; ${FIRST_YEAR}`, kind: 'choice', how: `No published source sets ${SURPRISE_YEAR}.`, src: ['surpriseYear'] },
  { id: 'in-linear-four-year-ramp-to-full-weight', group: 'Timing', part: 'macro', input: `Linear ${RAMP_WORD}-year ramp to full weight`, value: `${SURPRISE_YEAR}–${HEADLINE_YEAR}`, kind: 'choice', how: 'No published source; the IMF’s adoption path is convex.', src: ['rampWeights'] },
  { id: 'in-perfect-foresight-after-the-surprise', group: 'Timing', part: 'macro', input: 'Perfect foresight after the surprise', value: '—', kind: 'choice', how: 'OG-Core’s time path iteration.', src: ['fiscalRules'] },
  // the baseline
  { id: 'in-trend-productivity-growth', group: 'Baseline', part: 'macro', input: 'Trend productivity growth', value: '1% a year', kind: 'published', how: `The forecast path uses the March 2026 EFO’s trend. It includes the OBR’s central AI effect, and scenario inputs are not net of it. ${clockText()}`, src: ['efoMarPath', 'bp9B14'] },
  { id: 'in-2030-debt-gdp-target', group: 'Baseline', part: 'macro', input: '2030 debt/GDP target', value: 'OBR March 2026', kind: 'published', how: 'Government consumption is set so 2030 debt/GDP equals the OBR’s forecast; only that point is matched.', src: ['efoMarDebt', 'debtTarget'] },
  { id: 'in-vintage', group: 'Baseline', part: 'macro', input: 'Vintage', value: 'March 2026', kind: 'external', how: 'The forecast path uses the March 2026 EFO; the growth check on Evidence uses October 2026.', src: ['efoMarPath', 'efoOctA1'] },
  { id: 'in-demographics', group: 'Baseline', part: 'macro', input: 'Demographics', value: '—', kind: 'external', how: 'UN World Population Prospects, read by OG-Core through a GitHub mirror; not an OBR or ONS projection.', src: ['unWpp', 'popData'] },
  { id: 'in-tax-functions', group: 'Baseline', part: 'macro', input: 'Tax functions', value: '—', kind: 'external', how: 'Fitted to PolicyEngine UK.', src: ['peUk'] },
  // OG-UK defaults
  { id: 'in-k-share-of-the-extra-capital-firms-want-', group: 'Model parameters', part: 'macro', sym: 'zetaK', input: 'Share of the extra capital firms want that foreigners supply', value: '0.1', kind: 'default', how: 'OG-Core’s US default, chosen by the study as central, which the macro model keeps: its baseline is closest to UK income paid abroad; it misses the current account. It is the share of the extra capital firms want that is met from abroad, so most of the added capital ends up foreign-owned.', src: ['ogukParams', 'ogCoreParams', 'pinkBook', 'closureMemo'] },
  { id: 'in-k-bound-no-foreign-capital', group: 'Model parameters', part: 'macro', sym: 'zetaK', input: 'Bound (no foreign capital)', value: '0', kind: 'choice', how: 'A bound, not an estimate.', src: ['closureMemo'] },
  { id: 'in-d-foreign-share-of-new-government-debt', group: 'Model parameters', part: 'macro', sym: 'zetaD', input: 'Foreign share of new government debt', value: '0.4', kind: 'default', how: 'No UK estimate is used.', src: ['ogukParams'] },
  { id: 'in-world-interest-rate', group: 'Model parameters', part: 'macro', input: 'World interest rate', value: '2%', kind: 'default', how: 'Not calibrated; OG-Core’s own default is 4%.', src: ['ogukParams', 'ogCoreParams'] },
  { id: 'in-capital-share-labour-share-65', group: 'Model parameters', part: 'macro', sym: 'gamma', input: 'Capital share (labour share 65%)', value: '0.35', kind: 'default', how: 'No UK estimate is used.', src: ['ogukParams'] },
  { id: 'in-elasticity-of-substitution', group: 'Model parameters', part: 'macro', sym: 'epsilon', input: 'Elasticity of substitution', value: '1', kind: 'default', how: 'Cobb-Douglas.', src: ['ogukParams'] },
  { id: 'in-depreciation', group: 'Model parameters', part: 'macro', sym: 'delta', input: 'Depreciation', value: '0.065 a year', kind: 'default', how: 'The macro model sets it from ONS capital stocks and fixed capital consumption (2022).', src: ['ogukParams'] },
  { id: 'in-households-80-ages-seven-earnings-groups', group: 'Model parameters', part: 'macro', input: 'Households: 80 ages, seven earnings groups', value: '20–99', kind: 'default', how: 'The macro model’s defaults.', src: ['ogukParams'] },
  { id: 'in-employer-nics-as-a-payroll-tax', group: 'Model parameters', part: 'macro', input: 'Employer NICs as a payroll tax', value: '15%', kind: 'default', how: 'The macro model’s default payroll tax.', src: ['ogukParams'] },
  // fiscal rules and solver
  // tG1 = 10: periods from the 2026 baseline start, so 2036, in both data
  // sets (review round 2, R2-02); never the 2027 run's internal 9
  { id: 'in-common-rule-debt-rule-from-2036', group: 'Fiscal rules and solver', part: 'macro', input: `Common rule; debt rule from ${LATE_YEAR}`, value: 'tG1 = 10', kind: 'choice', how: 'The macro model’s default is 4. Not an OBR rule.', src: ['tg1', 'rerunNote'] },
  { id: 'in-fixed-spending', group: 'Fiscal rules and solver', part: 'macro', input: 'Fixed spending', value: '—', kind: 'choice', how: 'A choice on Explore; no OBR source is cited for it.', src: ['fiscalRules'] },
  { id: 'in-debt-neutral-transfers', group: 'Fiscal rules and solver', part: 'macro', input: 'Debt-neutral transfers', value: `Debt on path ${SURPRISE_YEAR + 1}–${LATE_YEAR}`, kind: 'choice', how: 'Households receive or pay the fiscal effect through transfers.', src: ['fiscalRules'] },
  { id: 'in-debt-repricing-speed-sensitivity', group: 'Fiscal rules and solver', part: 'macro', input: 'Debt repricing speed (sensitivity)', value: '—', kind: 'external', how: 'The OBR’s October 2026 debt interest ready reckoner: 26% in year one, 50% by year six.', src: ['efoOct', 'pr43'] },
  { id: 'in-solver-and-gate-tolerances', group: 'Fiscal rules and solver', part: 'macro', input: 'Solver and gate tolerances', value: '10⁻⁴; 10⁻³', kind: 'choice', how: 'Gate: 10⁻⁴ for GDP, capital and debt/GDP, 10⁻³ for the rest.', src: ['contGate', 'fiscalRules'] },
  // household study
  { id: 'in-employees-displaced-survivors-wage-rise', group: 'Household study', part: 'households', input: 'Employees displaced; survivors’ wage rise', value: 'Study inputs', kind: 'external', how: 'Doorley et al. (2026), who take them from a Goldman Sachs scenario exercise.', src: ['doorley'] },
  { id: 'in-rise-in-the-return-on-capital', group: 'Household study', part: 'households', input: 'Rise in the return on capital', value: '0.4 points', kind: 'external', how: 'On the 1.005% base in Doorley et al. (2026).', src: ['doorley'] },
];

// The table row's short line (at most 12 words) for each input; the full
// derivation above (`how`, `note`) is the row's detail, word for word.
// `scen`: the scenario file's own note for that input (surprise2028.json
// scenarios[].sources), which the detail also prints: its one home since the
// scenario cards stopped repeating it.
const SHORT = {
  'UK low: output at fixed inputs': ['OBR J-curve, phased in linearly: 0.1 × (1+2+3+4)/5 = 0.2%', ['uk_low', 'tfp']],
  'UK low: labour-share fall': ['0.2 ÷ 0.27 = 0.74pp; rule not published by the IMF', ['uk_low', 'labour_share']],
  'UK central: output at fixed inputs': ['IMF Figure 9 reads about 0.42%; the model input is rounded', ['uk_central', 'tfp']],
  'UK central: labour-share fall (headline)': ['0.42 ÷ 0.27 ≈ 1.6pp; derived, not published by the IMF', ['uk_central', 'labour_share']],
  'UK high: output at fixed inputs': ['OBR high alternative, 0.8pp a year, ramped: 2 × 0.8 = 1.6%', ['uk_high', 'tfp']],
  'UK high: labour-share fall': ['OBR upper-end path 1.78pp, rescaled × 65/40 = 2.89pp', ['uk_high', 'labour_share']],
  'Korinek et al., substantial (US): labour share and TFP': ['The ‘substantial’ scenario, a US case for 2030; the upper case', ['korinek', 'both']],
  'Stress test: GDP held at the OBR’s central forecast path': ['Named after the OBR’s displacement scenario, GDP unchanged; it matches the OBR on GDP only', null],
  'Trend productivity growth': [`OBR March 2026 EFO; includes the OBR’s central AI effect, about ${OVERLAP_SHORT}; scenario inputs are not net of it`, null],
  '2030 debt/GDP target': ['Spending set so 2030 debt/GDP matches the OBR’s forecast', null],
  Vintage: ['March 2026 EFO; the growth check uses October 2026', null],
  Demographics: ['UN World Population Prospects, via OG-Core; not OBR or ONS', null],
  'Share of the extra capital firms want that foreigners supply': ['Kept from OG-Core’s default. That it is the central case is the study’s choice', null],
  'World interest rate': ['Not calibrated; OG-Core’s own default is 4%', null],
  Depreciation: ['From ONS capital stocks and fixed capital consumption, 2022', null],
  [`Common rule; debt rule from ${LATE_YEAR}`]: ['The macro model’s default is 4; not an OBR rule', null],
  'Fixed spending': ['A choice on Explore; no OBR source is cited', null],
  'Debt-neutral transfers': ['Households receive or pay the fiscal effect as transfers', null],
  'Debt repricing speed (sensitivity)': ['OBR ready reckoner: 26% in year one, 50% by year six', null],
  'Solver and gate tolerances': ['10⁻⁴ for GDP, capital and debt/GDP; 10⁻³ for the rest', null],
  'Employees displaced; survivors’ wage rise': ['Doorley et al. (2026), from a Goldman Sachs scenario exercise', null],
};

// The rows a closed group still shows (push D, Q9.2c: "the key rows
// show"): the inputs the headline results rest on most directly. Every
// other row is one click away under its group's header.
export const KEY_INPUTS = new Set([
  'UK central: output at fixed inputs',
  'UK central: labour-share fall (headline)',
  'The scenario’s AI starts as a surprise; one starting point',
  'Trend productivity growth',
  '2030 debt/GDP target',
  'Share of the extra capital firms want that foreigners supply',
  'Capital share (labour share 65%)',
  'Employees displaced; survivors’ wage rise',
]);

// Rows as the table renders them: id, short line, detail flag, key flag.
export const ROWS = INPUTS.map((r) => {
  const [short, scen] = SHORT[r.input] ?? [r.how, null];
  return { ...r, short, scen, key: KEY_INPUTS.has(r.input) || r.input.startsWith('Common rule'), value: r.value.replace(/, model input \(rounded\)$/, '') };
});
