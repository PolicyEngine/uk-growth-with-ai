// Series colours for every chart, table swatch and legend on the growth tab.
// All resolve to the --chart-* tokens in globals.css (built on the
// PolicyEngine ramp): No AI grey, Automation only the secondary (gold) accent,
// Automation + productivity the primary teal, US series lighter/muted and dashed.
export const ARM_META = {
  baseline: { label: 'No AI', color: 'var(--chart-uk-baseline)' },
  obr_ramp: { label: 'Automation only', color: 'var(--chart-uk-obr)' },
  anthropic_ramp: { label: 'Automation + productivity', color: 'var(--chart-uk-ai)' },
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
