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
  loss: '#D97706',
  lossText: '#B45309',
  reference: '#6B7280',
};

// The three arms: teal (main), blue, slate (the stress test, drawn lighter).
// Text variants meet 4.5:1 on white.
export const SERIES = {
  tfp: { line: '#319795', text: '#0F766E' },
  tz: { line: '#026AA2', text: '#026AA2' },
  ss: { line: '#64748B', text: '#475569' },
};

// Earnings groups, bottom to top: the AB income ramp (amber to teal through
// grey), so order reads without a legend; "All groups" is ink, dashed.
export const GROUP_RAMP = ['#8A3A0C', '#B8641C', '#C2792E', '#6B7280', '#3E958D', '#2A8C84', '#0F5F59'];
export const ALL_GROUPS_COLOUR = '#111827';

export const TICK = { size: 12, fill: CHART_COLOURS.tick };
export const GRID_DASH = '3 4';
export const DASH = { closed: '6 4', reference: '4 3' };
export const STROKE = { line: 2.5, dashed: 2, light: 1.75 };

// U+2212 for every negative number on a chart.
export const minus = (text) => String(text).replace(/^-/, '−');
