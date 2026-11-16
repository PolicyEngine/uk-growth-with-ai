// Formatters for every figure part 3 prints, so a number check can find
// them in one shape each. Negatives use U+2212 (minus sign), not a hyphen.

export const MINUS = '−';

const sign = (v, s) => (v < 0 ? `${MINUS}${s}` : `+${s}`);
const abs = (v) => Math.abs(v);
// A value that is not a finite number prints nothing, never "NaN": callers
// omit the clause when a formatter returns ''.
export const ok = (v) => typeof v === 'number' && Number.isFinite(v);
const guard = (f) => (v) => (ok(v) ? f(v) : '');

// £bn, one decimal: "£7.4bn", "−£10.4bn".
export const fmtBn = guard((v) => `${v < 0 ? MINUS : ''}£${abs(v).toFixed(1)}bn`);

// Percentage points, two decimals with sign: "+2.34pp", "−0.01pp".
export const fmtPp = guard((v) => sign(v, `${abs(v).toFixed(2)}pp`));

// A spread (a standard deviation) in percentage points, no sign: "0.21pp".
export const fmtPpSpread = guard((v) => `${abs(v).toFixed(2)}pp`);

// Pence, whole: "42p".
export const fmtPence = guard((v) => `${Math.round(v)}p`);

// A share, whole per cent: "48%".
export const fmtShare = guard((v) => `${Math.round(v)}%`);

// £ per person, whole pounds with a thousands comma: "£1,385".
export const fmtGbp = guard((v) => `£${Math.round(v).toLocaleString('en-GB')}`);

// Decile change, per cent with two decimals and sign: "−2.86%".
export const fmtDecilePct = guard((v) => sign(v, `${abs(v).toFixed(2)}%`));

// People, millions with two decimals: "2.04m".
export const fmtMillions = guard((v) => `${v.toFixed(2)}m`);

// An input rate as the study states it: "7%", "1.67%".
export const fmtInputPct = guard((v) => `${Number(v.toFixed(2))}%`);

// £bn, two decimals: "£0.15bn" (a small difference that one decimal would hide).
export const fmtBn2 = guard((v) => `${v < 0 ? MINUS : ''}£${abs(v).toFixed(2)}bn`);

// A rate or share with one decimal: "11.4%".
export const fmtPct1 = guard((v) => `${v.toFixed(1)}%`);

// A signed rate with one decimal: "+3.7%".
export const fmtPctSigned1 = guard((v) => sign(v, `${abs(v).toFixed(1)}%`));

// A Gini coefficient, three decimals: "0.302".
export const fmtGini = guard((v) => v.toFixed(3));

// Months, one decimal: "9.4 months".
export const fmtMonths = guard((v) => `${v.toFixed(1)} months`);

// A pence range across draws: "41p–43p".
export const fmtPenceRange = (lo, hi) => (ok(lo) && ok(hi) ? `${Math.round(lo)}p–${Math.round(hi)}p` : '');

// A signed whole per cent: "+56%".
export const fmtPctSigned0 = guard((v) => sign(v, `${Math.round(abs(v))}%`));
