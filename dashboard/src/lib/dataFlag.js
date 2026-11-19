// The one switch between the 2027-surprise and 2028-surprise result files.
// The swap made 2027 the default: unset (or 2027) reads surprise2027.json;
// NEXT_PUBLIC_DATA=2028 reads surprise2028.json, the earlier timing kept for
// comparison. Any other value is a typo and stops the build.
// activeData.js is the only module that imports a surprise20xx.json.
const raw = process.env.NEXT_PUBLIC_DATA;
const KNOWN = ['2028', '2027'];
const flag = raw == null || raw === '' ? '2027' : String(raw);
if (!KNOWN.includes(flag)) {
  throw new Error(`NEXT_PUBLIC_DATA=${raw}: expected one of ${KNOWN.join(', ')}`);
}
// The data set's name (its shock year), and its file name for the
// download lists and the data ledger.
export const DATA_SET = Number(flag);
export const DATA_FILE = `surprise${flag}.json`;
