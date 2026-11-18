// The one switch between the 2028-surprise and 2027-surprise result files.
// Set NEXT_PUBLIC_DATA=2027 at build or test time to read
// surprise2027.json; unset (or 2028) reads surprise2028.json. Any other
// value is a typo and stops the build rather than silently showing 2028.
// activeData.js is the only module that imports a surprise20xx.json.
const raw = process.env.NEXT_PUBLIC_DATA;
const KNOWN = ['2028', '2027'];
const flag = raw == null || raw === '' ? '2028' : String(raw);
if (!KNOWN.includes(flag)) {
  throw new Error(`NEXT_PUBLIC_DATA=${raw}: expected one of ${KNOWN.join(', ')}`);
}
// The data set's name (its shock year), and its file name for the
// download lists and the data ledger.
export const DATA_SET = Number(flag);
export const DATA_FILE = `surprise${flag}.json`;
