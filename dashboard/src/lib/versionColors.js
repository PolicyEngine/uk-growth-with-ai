// One colour per version (arm), the same on every chart and control: the
// four-panel slope chart, the eight-panel economy wall, the arms chips and
// every other chart that reads ARM_COLOR (tabs/ai/surprise.js re-exports
// these). Colours come from the dashboard chart palette (ab.css --series-*;
// teal --series-1 is the gain colour, so no version uses it): dark blue for
// the main version, sky blue for technology unchanged, slate for the stress
// test (a bound, drawn lighter). Names are never typed here: they come from
// the data's arms list (short name, else label), as on the Explore controls.
//
//   VERSION_COLOR       line / swatch colour, as a CSS var (HTML and inline SVG)
//   VERSION_TEXT_COLOR  text colour that meets 4.5:1 on white
//   VERSION_HEX         the same line colours as literals (exported SVG/PNG)
//   VERSION_TEXT_HEX    the text colours as literals
//   VERSION_LIGHT       versions drawn lighter (a bound, not a forecast)
//   VERSION_MAIN        the emphasised (selected) version
//   versionName(arm)    the display name of an arm object from the data

export const VERSION_COLOR = { tfp: 'var(--series-2)', tz: 'var(--series-3)', ss: 'var(--series-5)' };
export const VERSION_TEXT_COLOR = { tfp: 'var(--series-2)', tz: 'var(--series-3-text)', ss: 'var(--series-5-text)' };
export const VERSION_HEX = { tfp: '#026AA2', tz: '#0EA5E9', ss: '#64748B' };
export const VERSION_TEXT_HEX = { tfp: '#026AA2', tz: '#0369A1', ss: '#475569' };
export const VERSION_LIGHT = { ss: true };
export const VERSION_MAIN = 'tfp';
export const versionName = (arm) => arm?.short || arm?.label || '';
