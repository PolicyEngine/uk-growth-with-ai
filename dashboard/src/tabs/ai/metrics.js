// Shared numbers for every tab. Model numbers are computed here from
// aiScenarios.json; the few published or not-in-JSON figures are constants
// below, each with its source.
import D from '@/data/aiScenarios.json';

export { D };

export const YEARS = D.years;
export const FIRST_YEAR = YEARS[0];
export const LAST = YEARS.length - 1; // index of the last year (2030)
export const LAST_YEAR = YEARS[LAST];
// D.grow[arm][i] is growth into YEARS[i + 1].
export const GROW_LAST = D.grow.baseline.length - 1;

export const signed = (x, dp = 1) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(dp)}`;
export const pct = (x, dp = 1) => `${x.toFixed(dp)}%`;

// % gap of an arm against the no-AI baseline, variable v, year index i.
export const gapAt = (arm, v, i = LAST) => (D.idx[arm][v][i] / D.idx.baseline[v][i] - 1) * 100;
export const growth = (arm, i = GROW_LAST) => D.grow[arm][i];
export const growthIncrement = (arm, i = GROW_LAST) => D.grow[arm][i] - D.grow.baseline[i];
export const labourShare = (arm, i = LAST) => D.sl[arm][i] * 100;
export const meanGrowth = (arm) => D.grow[arm].reduce((a, b) => a + b, 0) / D.grow[arm].length;

// Years (indices) in which an arm is below the baseline for variable v.
export const belowIdx = (arm, v) => YEARS.map((_, i) => i).filter((i) => gapAt(arm, v, i) < 0);

// Automation parameter and the Z solve.
export const G0 = D.assum.gamma_base;
export const G1 = D.assum.gamma_shocked;
export const DG = +(G1 - G0).toFixed(3);
export const LS0 = (1 - G0) * 100;
export const LS1 = (1 - G1) * 100;
export const LS_FALL = LS0 - LS1; // percentage points
export const GAMMA_ONLY_GAIN = D.assum.gamma_only_output_gain * 100;
export const KL0 = Math.exp(Math.log(1 + D.assum.gamma_only_output_gain) / DG);
export const Z_OBR = D.assum.Z_obr;
export const Z_ANTH = D.assum.Z_anthropic;
export const G_Y = D.assum.g_y_annual;
export const PRODUCTIVITY = (Math.exp(G_Y) - 1) * 100;
export const TG1 = D.assum.tG1;

// Anthropic (Korinek et al. 2026) Table 3, US: each scenario's 2030 GDP
// against their own No-AI path. A ratio of their indices, so it does not
// depend on how the index is based.
export const US_NAMES = Object.keys(D.anth);
// Published 'GDP, pct. above the no-AI path' row of Table 3 (Korinek et al.
// 2026, p. 31). The ratio of the JSON's rebased indices reproduces it to
// within rounding (Extreme 32.5 against 32.4), so the published row is used.
const KORINEK_GDP_GAP = { 'No AI': 0, Modest: 1.6, Substantial: 8.3, Extreme: 32.4 };
export const usGap = (name) => KORINEK_GDP_GAP[name] ?? (D.anth[name].idx2030 / D.anth['No AI'].idx2030 - 1) * 100;
export const usGrowthIncrement = (name) => D.anth[name].growth - D.anth['No AI'].growth;

// Optional block: OG-UK's own baseline ratios to GDP, in per cent:
// model_ratios = { year, ratios: { C, I, G, total_tax_revenue, D }, note }.
export const MODEL_RATIOS = D.model_ratios?.ratios ? D.model_ratios : null;
const ratio = (k) => (MODEL_RATIOS && typeof MODEL_RATIOS.ratios[k] === 'number' ? MODEL_RATIOS.ratios[k] : null);

// Tax/GDP in the last year. The arm-vs-baseline change in the ratio comes
// from the index paths; the level is the model baseline's tax/GDP, carried
// from model_ratios (its 2026 value) forward on the baseline's own tax and
// GDP paths. Fallback when model_ratios is absent: 42.01%, the baseline's
// 2030 tax/GDP (referee report C3(b), verified by the coordinator).
const TAX_Y_BASE_LAST_FALLBACK = 42.01;
export const taxGdpBase = () => {
  const r = ratio('total_tax_revenue');
  if (r == null) return TAX_Y_BASE_LAST_FALLBACK;
  const b = D.idx.baseline;
  return (r * (b.total_tax_revenue[LAST] / b.total_tax_revenue[0])) / (b.Y[LAST] / b.Y[0]);
};
export const taxGdpChangePp = (arm, i = LAST) => {
  const a = D.idx[arm];
  const b = D.idx.baseline;
  const rel = a.total_tax_revenue[i] / b.total_tax_revenue[i] / (a.Y[i] / b.Y[i]);
  return (rel - 1) * taxGdpBase();
};

// Optional block: the robustness run with spending held at baseline levels.
// fixed_spending.arms[arm] (spending fixed) and fixed_spending.common_gy[arm]
// (the committed runs), each {Y_gap, C_gap, I_gap, G_gap, tax_gap, D_gap,
// debt_gdp_pp} as lists over D.years.
export const FIXED = D.fixed_spending || null;

// ---- Published figures, not in the JSON ----

// OBR, Economic and fiscal outlook, March 2026.
export const OBR = {
  growth2027to30: 1.6, // real GDP growth, 2027-30 average, EFO para 1.9
  productivity: 1.0, // medium-term productivity growth, para 1.2
  labourSupply2030: 0.5, // labour supply growth by 2030, paras 1.2 and 1.10
  potential2030: 1.5, // potential output growth 2030, para 2.10
  potential2026: 1.2, // potential output growth 2026, para 2.10
  unemployment: 5.5, // Box 2.2 equilibrium unemployment
  // Box 2.2 fiscal effect, para 6.18
  receiptsBn: -6, // receipts, £bn a year
  receiptsPctGdp: -0.2, // approx. % of GDP
  borrowingBn: 9, // borrowing, £bn a year
  debtPctGdp: 1.3, // debt, % of GDP by 2030-31
  // Borrowing path, para 1.3
  borrowing2425: 5.2,
  borrowing2526: 4.3,
  borrowing3031: 1.6,
};

// OG-UK baseline growth components not in aiScenarios.json: they need g_n,
// which the run records but the dashboard file does not carry. From
// `python -m uk_growth_with_ai obr` on the re-run (referee report, C1 table).
export const OGUK_COMPONENTS = {
  population2030: 0.76, // growth of the model population aged 21-100, 2029 -> 2030
  balanced2030: 1.77, // g_y + g_n, 2030
  balanced2026: 1.78, // g_y + g_n, 2026 -> 2027
};

// Anthropic (Korinek et al. 2026), published, not in the JSON: Table 3 and Table 1.
export const KORINEK = {
  tfp: 3.1, // measured TFP, substantial, Table 3
  capital: 13.8, // capital stock, substantial, Table 3
  unempCognitive: 4.5, // Table 3, cognitive workers
  unempAll: 4.6, // Table 3, all workers
};

// Accounting error in 2026: the resource constraint misses by 0.0068 model
// units, about 0.95% of 2026 GDP, in every arm (arm-minus-baseline ~3e-6).
// Referee report M2, verified by the coordinator.
export const RC_ERROR = { units: 0.0068, pctGdp: 0.95 };

// OG-Core CIT rate in OG-UK (referee report C3(b)).
export const CIT_RATE = 27;
