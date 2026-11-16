import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONCEPT_ICON } from './concepts.js';

const ICON_SRC = readFileSync(join(__dirname, '../components/ab/Icon.jsx'), 'utf8');
const ICON_KEYS = new Set([...ICON_SRC.matchAll(/(\w+): [A-Z]\w*/g)].map((m) => m[1]));

const files = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.jsx?$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });

describe('concept icons', () => {
  it('every concept maps to an icon that Icon.jsx draws', () => {
    for (const [concept, icon] of Object.entries(CONCEPT_ICON)) expect(ICON_KEYS.has(icon), `${concept} -> ${icon}`).toBe(true);
  });
  it('no two concepts share an icon, except the arrows for "next" and "link"', () => {
    const seen = {};
    for (const [concept, icon] of Object.entries(CONCEPT_ICON)) {
      if (icon === 'arrowRight') continue;
      expect(seen[icon], `${concept} and ${seen[icon]} both use ${icon}`).toBeUndefined();
      seen[icon] = concept;
    }
  });
  it('every concept named in a story or Items call exists (a typo would draw no icon)', () => {
    const root = join(__dirname, '..');
    const used = new Set();
    for (const f of files(root)) {
      const s = readFileSync(f, 'utf8');
      if (!/iconFor|<Items|<KeyFacts|<WhyChain|<Compare|<Callout/.test(s) && !/tabs[\\/]story/.test(f)) continue;
      for (const m of s.matchAll(/\bicon: '(\w+)'/g)) used.add(m[1]);
      for (const m of s.matchAll(/iconFor\('(\w+)'\)/g)) used.add(m[1]);
    }
    const missing = [...used].filter((c) => !(c in CONCEPT_ICON));
    expect(missing).toEqual([]);
  });
});
