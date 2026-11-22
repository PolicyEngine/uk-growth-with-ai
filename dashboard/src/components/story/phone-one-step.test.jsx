// At 900px and below every multi-card Story block shows one step at a time
// under its pinned figure (Vahid, 22 Nov: #p3-central's two numbered steps
// stacked under a figure drawn once). Source rules: every multi-card Story
// Scrolly is a `scene`; a scene pins up to TALL_CAP of the screen before
// it falls back to the figure once; the steps draw no list numbering.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TALL_CAP } from './Scrolly.jsx';

const root = join(__dirname, '..', '..');
const files = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : /\.jsx$/.test(f) && !/\.test\./.test(f) ? [join(d, f)] : []));

describe('phones: one step at a time', () => {
  it('every Story Scrolly with more than one step is a scene', () => {
    const bad = [];
    for (const f of files(join(root, 'tabs', 'story'))) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/<Scrolly\b([\s\S]*?)\/>/g)) {
        const id = /id="([^"]+)"/.exec(m[1])?.[1];
        // the single-step block (Where a lost pound goes) has nothing to step through
        if (id === 'p3-pound') continue;
        if (!/\bscene\b/.test(m[1])) bad.push(`${f.slice(root.length)} ${id}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('a scene pins up to 70% of the screen before it is drawn once', () => {
    expect(TALL_CAP).toBe(0.7);
  });
  it('the steps draw no list numbering', () => {
    const css = readFileSync(join(root, 'app', 'story.css'), 'utf8');
    expect(css).toMatch(/\.scrolly-steps > \.scrolly-step::marker \{\s*content: none;/);
  });
});
