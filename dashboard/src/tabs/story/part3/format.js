// Formatters for every figure part 3 prints, so a number check can find
// them in one shape each. Negatives use U+2212 (minus sign), not a hyphen.

export const MINUS = '−';

const sign = (v, s) => (v < 0 ? `${MINUS}${s}` : `+${s}`);
const abs = (v) => Math.abs(v);

// £bn, one decimal: "£7.4bn", "−£10.4bn".
export const fmtBn = (v) => `${v < 0 ? MINUS : ''}£${abs(v).toFixed(1)}bn`;

// Percentage points, two decimals with sign: "+2.34pp", "−0.01pp".
export const fmtPp = (v) => sign(v, `${abs(v).toFixed(2)}pp`);

// A spread (a standard deviation) in percentage points, no sign: "0.21pp".
export const fmtPpSpread = (v) => `${abs(v).toFixed(2)}pp`;

// Pence, whole: "42p".
export const fmtPence = (v) => `${Math.round(v)}p`;

// A share, whole per cent: "48%".
export const fmtShare = (v) => `${Math.round(v)}%`;

// £ per person, whole pounds with a thousands comma: "£1,385".
export const fmtGbp = (v) => `£${Math.round(v).toLocaleString('en-GB')}`;

// Decile change, per cent with two decimals and sign: "−2.86%".
export const fmtDecilePct = (v) => sign(v, `${abs(v).toFixed(2)}%`);

// People, millions with two decimals: "2.04m".
export const fmtMillions = (v) => `${v.toFixed(2)}m`;

// An input rate as the study states it: "7%", "1.67%".
export const fmtInputPct = (v) => `${Number(v.toFixed(2))}%`;
