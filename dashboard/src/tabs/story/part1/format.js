// Formatters for every figure part 1 prints. Values are shown as the
// publisher gives them: rates and shares to one decimal place with a %
// sign, the productivity index to one decimal place, the tile grid's shares
// as whole numbers. Negatives take the U+2212 minus sign.

const MINUS = '−';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const signed = (v, dp) => {
  const t = Math.abs(v).toFixed(dp);
  return v < 0 && Number(t) !== 0 ? `${MINUS}${t}` : t;
};

// 75.3 -> "75.3%"; -10 -> "−10.0%"
export const pct1 = (v) => `${signed(v, 1)}%`;

// 100.1 -> "100.1"
export const idx1 = (v) => signed(v, 1);

// 35 -> "35%"
export const share0 = (v) => `${signed(Math.round(v), 0)}%`;

// Axis tick text (whole numbers or one decimal), U+2212 for negatives.
export const tick = (v) => signed(v, Number.isInteger(Math.round(v * 10) / 10) ? 0 : 1);

// "2026-11-12" -> "12 November 2026"
export function dateLong(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// "2026-10-28" -> "October 2026"
export function monthYear(iso) {
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
