// One colour per version (arm), the same on every chart and control: the
// four-panel slope chart, the eight-panel economy wall, the version legend
// and every other chart that reads ARM_COLOR (tabs/ai/surprise.js
// re-exports these). Three clearly different hues from the dashboard
// palette (Vahid: the two blues and the grey were hard to tell apart): dark
// blue for the main version (--version-tfp), gold for technology unchanged
// (--version-tz), indigo for the stress test (--version-ss). The tokens are
// in app/v2.css; versionColors.test.js holds them equal to the literals
// here. Teal stays the gain colour.
// Every line colour is at least 3:1 on white and every text colour at least
// 4.5:1; each pair stays apart under simulated deuteranopia and protanopia
// (CIELAB delta >= 38; checks-panels.md). The gold is NOT apart from the
// loss amber (--c-loss) for a deuteranope or a protanope (delta about 5
// and 2; versionColors.test.js, checks-c0.md): no chart may tell a
// technology-unchanged line from a loss mark by colour alone.
// Where they share a card, a name or a signed number carries the meaning
// (pushB-signoff ruling 8); dash and marker shape are taken by the closures. No version
// is drawn lighter now: a lighter indigo moves toward the blue for a
// deuteranope.
// Names are never typed here: they come from the data's arms list (short
// name, else label), as on the Explore controls.
//
//   VERSION_COLOR       line / swatch colour (HTML and inline SVG)
//   VERSION_TOKEN       the same as CSS custom properties (--version-*)
//   VERSION_TEXT_COLOR  text colour, 4.5:1 or more on white
//   VERSION_HEX         the line colours as literals (exported SVG/PNG)
//   VERSION_TEXT_HEX    the text colours as literals
//   VERSION_LIGHT       versions drawn lighter (none)
//   VERSION_MAIN        the emphasised (selected) version
//   versionName(arm)    the display name of an arm object from the data

export const VERSION_HEX = { tfp: '#026AA2', tz: '#B8860B', ss: '#4338CA' };
export const VERSION_TEXT_HEX = { tfp: '#026AA2', tz: '#8A6508', ss: '#4338CA' };
export const VERSION_COLOR = VERSION_HEX;
export const VERSION_TOKEN = { tfp: 'var(--version-tfp)', tz: 'var(--version-tz)', ss: 'var(--version-ss)' };
export const VERSION_TEXT_COLOR = VERSION_TEXT_HEX;
export const VERSION_LIGHT = {};
export const VERSION_MAIN = 'tfp';
export const versionName = (arm) => arm?.short || arm?.label || '';
