// Where the 2027-surprise result file comes from. Since the swap the full
// file is in the tree (src/data/surprise2027.json) and 2027 is the default
// data set (R4-16 is over). The file is read whenever the 2027 set is active
// (NEXT_PUBLIC_DATA unset or 2027) and it exists:
//   UGAI_SURPRISE2027=/path/to/surprise2027.json   (an override), else
//   src/data/surprise2027.json.
// With NEXT_PUBLIC_DATA=2028 the module `ugai-surprise2027` resolves to a
// stub whose default export is null, so the 2028 bundle never carries it.
// vitest.config.mjs and next.config.ts both alias it here.
import { existsSync } from 'node:fs';
import path from 'node:path';

export const SURPRISE2027_STUB = 'src/data/surprise2027.absent.js';
export const SURPRISE2027_LOCAL = 'src/data/surprise2027.json';

// The absolute path of the 2027 file to read, or null (flag off, or no file).
export function surprise2027Source(root, env = process.env) {
  if (!['', '2027'].includes(String(env.NEXT_PUBLIC_DATA ?? ''))) return null;
  const p = path.resolve(root, env.UGAI_SURPRISE2027 || SURPRISE2027_LOCAL);
  return existsSync(p) ? p : null;
}
