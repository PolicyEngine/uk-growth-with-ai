// Every scenario input and model parameter, with what kind of source it has
// (from the Method claim audit's inputs table, 16 Nov 2026). Values are the
// ones the model used: the scenario pairs come from surprise2028.json.
// kind: published (printed in the source), derived (computed by this study
// from printed figures, by a rule the source does not state), default (OG-UK's
// default parameter, no UK estimate behind it), choice (a modelling choice,
// not from a published source), external (an external source, linked).
import { scenarioById, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, RAMP_WORD } from '@/tabs/ai/surprise.js';
import { SET } from '@/lib/dataKeys.js';

const sc = (id) => scenarioById(id);
const pp = (id) => `−${sc(id).labour_share_fall_pp.toFixed(1)}pp`;
const pc = (id) => `+${sc(id).tfp_gain_pct.toFixed(1)}%`;

export const KIND = {
  published: { label: 'Published', icon: 'source' },
  derived: { label: 'Derived', icon: 'arithmetic' },
  default: { label: 'OG-UK default', icon: 'model' },
  choice: { label: 'Modelling choice', icon: 'rule' },
  external: { label: 'External', icon: 'link' },
};

export const INPUTS = [
  // the scenario pairs
  { group: 'Scenarios', input: 'UK low: output at fixed inputs', value: pc('uk_low'), kind: 'derived', how: 'OBR J-curve, 0.1pp a year by year five, phased in linearly: 0.1 × (1+2+3+4)/5 = 0.2%. The OBR figure is labour-productivity growth.', src: ['bp9B12', 'frs86'] },
  { group: 'Scenarios', input: 'UK low: labour-share fall', value: pp('uk_low'), kind: 'derived', how: 'The gain divided by the IMF’s 27% cost saving: 0.2 ÷ 0.27 = 0.74pp. The IMF does not print this rule or figure.', src: ['imfSip44'] },
  { group: 'Scenarios', input: 'UK central: output at fixed inputs', value: `${pc('uk_central')}, model input (rounded; OBR ramp gives 0.40%)`, kind: 'derived', how: 'IMF Table 1 prints years 5 and 10 only; year 4 is read off Figure 9 as about 0.42% (0.41–0.44%). Cross-check: the OBR’s central 0.2pp a year, phased in linearly, gives 0.40%.', src: ['imfSipT1', 'imfSipFig9', 'bp9B14', 'efoOct127'] },
  { group: 'Scenarios', input: 'UK central: labour-share fall (headline)', value: pp('uk_central'), kind: 'derived', how: 'Derived, not published by the IMF. Year-4 TFP is read off IMF SIP/2026/072 Figure 9 as about 0.42% (0.41–0.44%; only years 5 and 10 are printed). Divided by the IMF’s 27% cost saving, the 0.41–0.44% reading gives 1.5–1.6pp. The UK central scenario uses 1.6pp.', note: 'The share is derived from the 0.42 reading, but the TFP input is the rounded 0.4, which on its own would give 0.4 ÷ 0.27 = 1.5pp. The OBR cross-check (1.78pp) sits above 1.6, so 1.6 is not biased high.', src: ['imfSipFig9', 'imfSip44', 'frs87'] },
  { group: 'Scenarios', input: 'UK high: output at fixed inputs', value: pc('uk_high'), kind: 'derived', how: 'The OBR’s high alternative, up to 0.8pp a year (a decade average), phased in linearly to year five: 2 × 0.8 = 1.6%. Ramping to it by year five is a modelling choice.', src: ['frs86', 'bp9B14', 'imfArt4'] },
  { group: 'Scenarios', input: 'UK high: labour-share fall', value: pp('uk_high'), kind: 'derived', how: 'The OBR’s upper-end path, wages and salaries 40% → 20% of GDP over 45 years: 20/45 × 4 = 1.78pp, rescaled to OG-UK’s 65% labour share: × 65/40 = 2.89pp. Rescaling and the 2028 start are modelling choices.', src: ['frs87', 'frs88'] },
  { group: 'Scenarios', input: 'Korinek et al., substantial (US): labour share and TFP', value: `${pp('korinek')}; ${pc('korinek')}`, kind: 'published', how: 'The ‘substantial’ scenario of Korinek et al. (2026), a US case used as the upper case, not calibrated to the UK: labour share 60.0 → 56.1; measured TFP +3.1% in 2030.', src: ['korinekT3'] },
  { group: 'Scenarios', input: 'Stress test: GDP held at the OBR’s central forecast path', value: `GDP gap 0 in ${HEADLINE_YEAR}`, kind: 'choice', how: 'After the OBR’s displacement scenario, GDP unchanged. The 0.01pp tolerance is a modelling choice.', src: ['efoMarBox22'] },
  { group: 'Scenarios', input: 'Which pairs, the three arms, the headline', value: '—', kind: 'choice', how: 'The study’s design.', src: ['calibNote', 'fiscalRules'] },
  // timing
  { group: 'Timing', input: 'Extra AI starts as a surprise; one starting point', value: `${SURPRISE_YEAR}; ${FIRST_YEAR}`, kind: 'choice', how: `No published source sets ${SURPRISE_YEAR}.`, src: ['surpriseYear'] },
  { group: 'Timing', input: `Linear ${RAMP_WORD}-year ramp to full weight`, value: `${SURPRISE_YEAR}–${HEADLINE_YEAR}`, kind: 'choice', how: 'No published source; the IMF’s adoption path is convex.', src: ['rampWeights'] },
  { group: 'Timing', input: 'Perfect foresight after the surprise', value: '—', kind: 'choice', how: 'OG-Core’s time path iteration.', src: ['fiscalRules'] },
  // the baseline
  { group: 'Baseline', input: 'Trend productivity growth', value: '1% a year', kind: 'published', how: 'The forecast path uses the March 2026 EFO’s trend. It includes the OBR’s central AI effect.', src: ['efoMarPath', 'bp9B14'] },
  { group: 'Baseline', input: '2030 debt/GDP target', value: 'OBR March 2026', kind: 'published', how: 'Government consumption is set so 2030 debt/GDP equals the OBR’s forecast; only that point is matched.', src: ['efoMarDebt', 'debtTarget'] },
  { group: 'Baseline', input: 'Vintage', value: 'March 2026', kind: 'external', how: 'The forecast path uses the March 2026 EFO; the growth check on Evidence uses October 2026.', src: ['efoMarPath', 'efoOctA1'] },
  { group: 'Baseline', input: 'Demographics', value: '—', kind: 'external', how: 'UN World Population Prospects, read by OG-Core through a GitHub mirror; not an OBR or ONS projection.', src: ['unWpp', 'popData'] },
  { group: 'Baseline', input: 'Tax functions', value: '—', kind: 'external', how: 'Fitted to PolicyEngine UK.', src: ['peUk'] },
  // OG-UK defaults
  { group: 'Model parameters', input: 'ζK: share of excess capital demand foreigners supply', value: '0.1', kind: 'default', how: 'OG-Core’s US default, chosen by the study as central, which OG-UK keeps: its baseline is closest to UK income paid abroad; it misses the current account. It is the share of excess capital demand met from abroad, so most of the added capital ends up foreign-owned.', src: ['ogukParams', 'ogCoreParams', 'pinkBook', 'closureMemo'] },
  { group: 'Model parameters', input: 'ζK bound (no foreign capital)', value: '0', kind: 'choice', how: 'A bound, not an estimate.', src: ['closureMemo'] },
  { group: 'Model parameters', input: 'ζD: foreign share of new government debt', value: '0.4', kind: 'default', how: 'No UK estimate is used.', src: ['ogukParams'] },
  { group: 'Model parameters', input: 'World interest rate', value: '2%', kind: 'default', how: 'Not calibrated; OG-Core’s own default is 4%.', src: ['ogukParams', 'ogCoreParams'] },
  { group: 'Model parameters', input: 'Capital share γ (labour share 65%)', value: '0.35', kind: 'default', how: 'No UK estimate is used.', src: ['ogukParams'] },
  { group: 'Model parameters', input: 'Elasticity of substitution ε', value: '1', kind: 'default', how: 'Cobb-Douglas.', src: ['ogukParams'] },
  { group: 'Model parameters', input: 'Depreciation δ', value: '0.065 a year', kind: 'default', how: 'OG-UK sets it from ONS capital stocks and fixed capital consumption (2022).', src: ['ogukParams'] },
  { group: 'Model parameters', input: 'Households: 80 ages, seven earnings groups', value: '20–99', kind: 'default', how: 'OG-UK’s defaults.', src: ['ogukParams'] },
  { group: 'Model parameters', input: 'Employer NICs as a payroll tax', value: '15%', kind: 'default', how: 'OG-UK’s default payroll tax.', src: ['ogukParams'] },
  // fiscal rules and solver
  { group: 'Fiscal rules and solver', input: `Common rule; debt rule from ${LATE_YEAR}`, value: `tG1 = ${SET.tg1}`, kind: 'choice', how: 'OG-UK’s default is 4. Not an OBR rule.', src: ['tg1', 'rerunNote'] },
  { group: 'Fiscal rules and solver', input: 'Fixed spending', value: '—', kind: 'choice', how: 'A choice on Explore; no OBR source is cited for it.', src: ['fiscalRules'] },
  { group: 'Fiscal rules and solver', input: 'Debt-neutral transfers', value: `Debt on path ${SURPRISE_YEAR + 1}–${LATE_YEAR}`, kind: 'choice', how: 'Households receive or pay the fiscal effect through transfers.', src: ['fiscalRules'] },
  { group: 'Fiscal rules and solver', input: 'Debt repricing speed (sensitivity)', value: '—', kind: 'external', how: 'The OBR’s October 2026 debt interest ready reckoner: 26% in year one, 50% by year six.', src: ['efoOct', 'pr43'] },
  { group: 'Fiscal rules and solver', input: 'Solver and gate tolerances', value: '10⁻⁴; 10⁻³', kind: 'choice', how: 'Gate: 10⁻⁴ for GDP, capital and debt/GDP, 10⁻³ for the rest.', src: ['contGate', 'fiscalRules'] },
  // household study
  { group: 'Household study', input: 'Employees displaced; survivors’ wage rise', value: 'Study inputs', kind: 'external', how: 'Doorley et al. (2026), who take them from a Goldman Sachs scenario exercise.', src: ['doorley'] },
  { group: 'Household study', input: 'Rise in the return on capital', value: '0.4 points', kind: 'external', how: 'On the 1.005% base in Doorley et al. (2026).', src: ['doorley'] },
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
  'Trend productivity growth': ['OBR March 2026 EFO; includes the OBR’s central AI effect', null],
  '2030 debt/GDP target': ['Spending set so 2030 debt/GDP matches the OBR’s forecast', null],
  Vintage: ['March 2026 EFO; the growth check uses October 2026', null],
  Demographics: ['UN World Population Prospects, via OG-Core; not OBR or ONS', null],
  'ζK: share of excess capital demand foreigners supply': ['Kept from OG-Core’s default. That it is the central case is the study’s choice', null],
  'World interest rate': ['Not calibrated; OG-Core’s own default is 4%', null],
  'Depreciation δ': ['From ONS capital stocks and fixed capital consumption, 2022', null],
  [`Common rule; debt rule from ${LATE_YEAR}`]: ['OG-UK’s default is 4; not an OBR rule', null],
  'Fixed spending': ['A choice on Explore; no OBR source is cited', null],
  'Debt-neutral transfers': ['Households receive or pay the fiscal effect as transfers', null],
  'Debt repricing speed (sensitivity)': ['OBR ready reckoner: 26% in year one, 50% by year six', null],
  'Solver and gate tolerances': ['10⁻⁴ for GDP, capital and debt/GDP; 10⁻³ for the rest', null],
  'Employees displaced; survivors’ wage rise': ['Doorley et al. (2026), from a Goldman Sachs scenario exercise', null],
};

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

// Rows as the table renders them: id, short line, detail flag.
export const ROWS = INPUTS.map((r) => {
  const [short, scen] = SHORT[r.input] ?? [r.how, null];
  return { ...r, id: `in-${slug(r.input)}`, short, scen, value: r.value.replace(/, model input \(rounded; OBR ramp gives 0\.40%\)$/, '') };
});
