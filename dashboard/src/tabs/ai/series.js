// Series colours for every chart, table swatch and legend on the growth tab.
// All resolve to the --chart-* tokens in globals.css (built on the
// PolicyEngine ramp): the OG-UK baseline grey, Automation only the secondary (gold) accent,
// Automation + productivity the primary teal, US series lighter/muted and dashed.
export const ARM_META = {
  // The line is OG-UK's, run on the OBR's central productivity assumption. It
  // is not the OBR's central forecast, which the UK paths chart draws beside it,
  // so the series name says whose line it is; the prose calls it the
  // OBR-central baseline. Kept short so chart end-labels fit at 390px. Must match ARM_TRACE in
  // uk_growth_with_ai/dashboard_data.py (HistoricalPaths joins on the name).
  baseline: { label: 'OG-UK baseline', color: 'var(--chart-uk-baseline)' },
  share_shift_ramp: { label: 'Automation only', color: 'var(--chart-uk-obr)' },
  share_shift_tfp_ramp: { label: 'Automation + productivity', color: 'var(--chart-uk-ai)' },
};

export const US_COLORS = {
  'No AI': 'var(--chart-us-noai)',
  Modest: 'var(--chart-us-modest)',
  Substantial: 'var(--chart-us-substantial)',
  Extreme: 'var(--chart-us-extreme)',
};

// HistoricalPaths: the OBR outturn/forecast line and the two reference marks.
export const HISTORY_COLOR = 'var(--chart-history)';
export const OUTTURN_MARK = 'var(--chart-mark-outturn)';
export const SCENARIO_MARK = 'var(--chart-mark-scenario)';
// The OBR forecast beyond 2026, drawn thin and dotted: context, not a scenario.
export const FORECAST_COLOR = 'var(--chart-forecast)';
