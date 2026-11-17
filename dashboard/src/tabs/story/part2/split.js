// Where output goes in the headline year: the data behind part 2's Sankey
// (the OBR-central path's GDP split four ways) and waterfall (the change in
// each part). Built by analysis/surprise/build_dashboard_data.py
// (`output_split`) from the solve series: labour income w L; net capital
// income kept in the UK NNI - w L; payments to foreign owners of UK capital
// and gilts Y - GNI; depreciation GNI - NNI. Main arm, common fiscal rule.
// These shares and changes are printed here and nowhere else.
import { S, CENTRAL, BOUND, signed } from '@/tabs/ai/surprise.js';

export const SPLIT = S.output_split;
export const SPLIT_YEAR = SPLIT.year;

// One label per part: `long` for the waterfall and sentences, `short` for
// the Sankey's node labels (narrow on phones).
export const PART_TEXT = {
  labour: { long: 'Labour income', short: 'Labour income' },
  domestic: { long: 'Net capital income kept in the UK', short: 'Kept in the UK' },
  foreign: { long: 'Net income paid abroad', short: 'Net paid abroad' },
  depreciation: { long: 'Depreciation', short: 'Depreciation' },
};
// The waterfall's "of which" rows (the Sankey's note defines "paid abroad").
const OF_WHICH = { domestic: 'kept in the UK', foreign: 'net paid abroad', depreciation: 'depreciation' };
// Who receives output: labour indigo, capital a brown family (ab.css
// tokens, also the shock tiles'); teal and amber mean gain and loss (the
// waterfall's bars), and the arm colours mean arms. The light fills
// (abroad, depreciation) are labelled in --c-capital, and depreciation's
// node carries a 1px --c-capital stroke.
export const PART_COLOR = {
  gdp: 'var(--pe-gray-800)',
  labour: 'var(--c-labour)',
  capital: 'var(--c-capital)',
  domestic: 'var(--c-capital)',
  foreign: 'var(--c-capital-abroad)',
  depreciation: 'var(--c-capital-dep)',
};
const LABEL_COLOR = { foreign: 'var(--c-capital)', depreciation: 'var(--c-capital)' };
const NODE_STROKE = { depreciation: 'var(--c-capital)' };
// The waterfall: bars by sign, the GDP total in ink.
export const barColor = (id, value) => (id === 'gdp' ? 'var(--pe-gray-800)' : value < 0 ? 'var(--c-loss)' : 'var(--c-gain)');
export const CAPITAL_PARTS = ['domestic', 'foreign', 'depreciation'];

// Shares print with one decimal, unsigned; changes with two, signed (U+2212).
export const share = (x) => x.toFixed(1);
export const change = (x) => signed(x, 2);

// The closure the split is drawn at for the header's closure: closed capital
// for "closed", otherwise the central closure ("both" says so).
export const splitClosure = (closure) => (closure === 'closed' ? BOUND : CENTRAL);

// { cl, base, ch } for a scenario and header closure; base or ch is null
// when that closure or solve is pending.
export function splitFor(sid, closure) {
  const cl = splitClosure(closure);
  const base = SPLIT.baseline?.[cl] ?? null;
  const c = SPLIT.change?.[sid]?.[cl];
  return { cl, base, ch: c?.status === 'done' ? c : null };
}

// The Sankey of the OBR-central path: GDP to labour income and to gross
// capital income, which splits three ways. Values are shares of GDP.
// `bare` leaves the end nodes unlabelled (phones, where a key below the
// chart carries their labels and shares instead).
export function sankeyGraph(base, short = false, bare = false) {
  const t = (k) => (bare ? '' : short ? PART_TEXT[k].short : PART_TEXT[k].long);
  const sub = (x) => (bare ? undefined : share(x));
  const gross = CAPITAL_PARTS.reduce((s, k) => s + base[k], 0);
  const gdp = base.labour + gross;
  return {
    nodes: [
      // `inner`: the same value, drawn inside the node when it is tall enough
      // (Sankey `inside`); then `sub` is not drawn, so each value prints once
      { id: 'gdp', label: 'GDP', sub: gdp.toFixed(0), inner: gdp.toFixed(0), color: PART_COLOR.gdp },
      { id: 'labour', label: t('labour'), sub: sub(base.labour), inner: sub(base.labour), color: PART_COLOR.labour },
      { id: 'capital', label: 'Gross capital income', sub: share(gross), inner: share(gross), color: PART_COLOR.capital },
      ...CAPITAL_PARTS.map((k) => ({ id: k, label: t(k), sub: sub(base[k]), inner: sub(base[k]), color: PART_COLOR[k], labelColor: LABEL_COLOR[k], stroke: NODE_STROKE[k], inline: true })),
    ],
    // each ribbon in its target's colour
    links: [
      { source: 'gdp', target: 'labour', value: base.labour, color: PART_COLOR.labour },
      { source: 'gdp', target: 'capital', value: gross, color: PART_COLOR.capital },
      ...CAPITAL_PARTS.map((k) => ({ source: 'capital', target: k, value: base[k], color: PART_COLOR[k] })),
    ],
  };
}

// The waterfall's rows: labour income from zero, then gross capital income
// and its three parts stacked on from there, then GDP from zero. Each row
// is [from, to] in % of the path's GDP.
export function waterfallRows(ch) {
  const rows = [{ id: 'labour', label: PART_TEXT.labour.long, from: 0, to: ch.labour, value: ch.labour }];
  rows.push({ id: 'capital', label: 'Gross capital income', from: ch.labour, to: ch.labour + ch.gross_capital, value: ch.gross_capital, outline: true });
  let at = ch.labour;
  for (const k of CAPITAL_PARTS) {
    rows.push({ id: k, label: OF_WHICH[k], from: at, to: at + ch[k], value: ch[k], sub: true });
    at += ch[k];
  }
  rows.push({ id: 'gdp', label: 'GDP', from: 0, to: ch.gdp, value: ch.gdp });
  return rows;
}
