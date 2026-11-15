// The official-figure checks (data/ukContextChecks.json), when the file is
// in the build. It is written on another branch; until it is merged this
// returns null and the ledger falls back to ukContext.json's own source
// fields. require.context resolves an absent file to an empty context, so
// the build does not fail without it; under vitest require.context does not
// exist and the catch returns null.
let checks = null;
try {
  const ctx = require.context('../../data', false, /^\.\/ukContextChecks\.json$/);
  const key = ctx.keys()[0];
  if (key) checks = ctx(key);
} catch {
  checks = null;
}
export default checks;
