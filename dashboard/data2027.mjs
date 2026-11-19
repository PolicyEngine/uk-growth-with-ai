// Where the 2027-surprise result file comes from (review round 4, R4-16).
// The partial surprise2027.json is not in the tree, so the public bundle
// never ships unpublished numbers. The file is read only when the flag is
// on (NEXT_PUBLIC_DATA=2027) AND the file exists:
//   UGAI_SURPRISE2027=/path/to/surprise2027.json   (for example the copy in
//     ~/ugai-surprise2027/dashboard/src/data), else
//   src/data/surprise2027.json                     (a local copy; gitignored).
// Otherwise the module `ugai-surprise2027` resolves to a stub whose default
// export is null. vitest.config.mjs and next.config.ts both alias it here.
import { existsSync } from 'node:fs';
import path from 'node:path';

export const SURPRISE2027_STUB = 'src/data/surprise2027.absent.js';
export const SURPRISE2027_LOCAL = 'src/data/surprise2027.json';

// The absolute path of the 2027 file to read, or null (flag off, or no file).
export function surprise2027Source(root, env = process.env) {
  if (String(env.NEXT_PUBLIC_DATA ?? '') !== '2027') return null;
  const p = path.resolve(root, env.UGAI_SURPRISE2027 || SURPRISE2027_LOCAL);
  return existsSync(p) ? p : null;
}
