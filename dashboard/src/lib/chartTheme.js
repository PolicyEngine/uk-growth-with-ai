// The one chart theme (after AB2026 utils/chartTheme.js): every chart reads
// its colours, type and strokes from here, and the stylesheet's --c-* and
// --series-* tokens carry the same values for HTML charts. The literals are
// needed in JS so an exported SVG or PNG is self-contained.
export const CHART_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const CHART_COLOURS = {
  grid: '#E5E7EB',
  axis: '#D1D5DB',
  tick: '#6B7280',
  axisTitle: '#4B5563',
  zeroLine: '#374151',
  ink: '#1F2937',
  muted: '#6B7280',
  surface: '#FFFFFF',
  highlightBand: '#EAF5F4',
  gain: '#319795',
  gainText: '#0F766E',
  ours: '#026AA2', // our own figure beside published ones: the main arm's blue
  mark: '#374151', // a neutral mark (coverage matrix)
  loss: '#D97706',
  lossText: '#B45309',
  reference: '#6B7280',
};

// The three arms, as on the page (--series-2, -3, -5): blue (main), light
// blue, slate (the stress test, drawn lighter). Teal is kept for gains.
// Text variants meet 4.5:1 on white.
export const SERIES = {
  tfp: { line: '#026AA2', text: '#026AA2' },
  tz: { line: '#0EA5E9', text: '#0369A1' },
  ss: { line: '#64748B', text: '#475569' },
};

// Earnings groups, bottom to top: a neutral sequential slate-blue ramp, light
// to dark, so order reads without a legend and no group borrows the gain
// (teal) or loss (amber) colour; "All groups" is ink, dashed.
export const GROUP_RAMP = ['#8fa9c4', '#7392b2', '#5a7b9f', '#45668b', '#335476', '#234261', '#16314b'];
export const ALL_GROUPS_COLOUR = '#111827';

export const TICK = { size: 12, fill: CHART_COLOURS.tick };
export const GRID_DASH = '3 4';
export const DASH = { closed: '6 4', reference: '4 3' };
export const STROKE = { line: 2.5, dashed: 2, light: 1.75 };

// U+2212 for every negative number on a chart.
export const minus = (text) => String(text).replace(/^-/, '−');
