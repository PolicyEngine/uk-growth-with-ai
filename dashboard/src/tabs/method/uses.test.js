// Every "Used by" chip on Method points at an id that some page still
// renders: the id string appears in a source file outside this folder (the
// Explore, Story and Households pages that the chips link to). A page
// rebuilt without the id fails here, before a reader finds a dead link.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { USES } from './UsedBy.jsx';

const SRC = join(__dirname, '..', '..');
const files = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.jsx?$/.test(f) && !/\.test\./.test(f) && !p.includes(join('tabs', 'method')) ? [p] : [];
  });
const TEXT = files(SRC).map((f) => readFileSync(f, 'utf8')).join('\n');

describe('Used by chips', () => {
  it('each target id is rendered by some page outside Method', () => {
    for (const list of Object.values(USES))
      for (const u of list) {
        // ids are written literally ("hh-rules", 'p2-shock-1') or built from a
        // prefix (`explore-part-${sub}`, `story-part-3` from part ids)
        const literal = TEXT.includes(`"${u.anchor}"`) || TEXT.includes(`'${u.anchor}'`);
        const prefix = u.anchor.replace(/[^-]+$/, '');
        const built = !literal && TEXT.includes(`\`${prefix}\${`);
        expect(literal || built, `${u.tab} #${u.anchor}`).toBe(true);
      }
  });
  it('never links to Explore > All scenarios, which folds into Economy', () => {
    for (const list of Object.values(USES)) for (const u of list) expect(u.sub).not.toBe('all');
  });
});
