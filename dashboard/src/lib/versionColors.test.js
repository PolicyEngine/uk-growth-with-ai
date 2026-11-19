// The version colour tokens (app/v2.css --version-*) and the literals in
// versionColors.js are one set; the gold's separation from the loss amber
// under simulated colour-vision deficiency is measured and pinned.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { VERSION_HEX, VERSION_TEXT_HEX, VERSION_TOKEN } from './versionColors.js';

const css = (f) => fs.readFileSync(path.join(__dirname, '..', 'app', f), 'utf8');
const token = (src, name) => new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(src)?.[1]?.toLowerCase();

// Machado et al. (2009), severity 1, on linear RGB; CIELAB delta E 1976
const M = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
};
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lab = ([r, g, b]) => {
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
};
const sim = (h, m) => {
  const l = rgb(h).map(lin);
  return m ? M[m].map((row) => Math.min(1, Math.max(0, row[0] * l[0] + row[1] * l[1] + row[2] * l[2]))) : l;
};
export const deltaE = (a, b, m) => {
  const A = lab(sim(a, m));
  const B = lab(sim(b, m));
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
};

describe('version colours', () => {
  const v2 = css('v2.css');
  it('the --version-* tokens equal the literals', () => {
    for (const id of Object.keys(VERSION_HEX)) {
      expect(token(v2, `--version-${id}`), id).toBe(VERSION_HEX[id].toLowerCase());
      expect(token(v2, `--version-${id}-text`), id).toBe(VERSION_TEXT_HEX[id].toLowerCase());
      expect(VERSION_TOKEN[id]).toBe(`var(--version-${id})`);
    }
  });
  // checks-panels.md measured 38 or more with its own simulation; this one
  // (Machado, linear RGB) gives 37.7 for blue against indigo
  it('the three versions stay apart under deuteranopia and protanopia', () => {
    const ids = Object.keys(VERSION_HEX);
    for (const m of [null, 'deuteranopia', 'protanopia'])
      for (let i = 0; i < ids.length; i += 1) for (let k = i + 1; k < ids.length; k += 1) expect(deltaE(VERSION_HEX[ids[i]], VERSION_HEX[ids[k]], m), `${ids[i]}/${ids[k]} ${m}`).toBeGreaterThanOrEqual(35);
  });
  // Measured 18 Nov (checks-c0.md): 22.6 in full colour, 5.1 under
  // deuteranopia, 2.4 under protanopia; the text pair 6.7 (deuteranopia).
  // The gold is not apart from the loss amber for those readers, so no
  // chart may tell them apart by colour alone. No upper bound is asserted:
  // a fix to the clash must not turn this red.
  it('the gold against the loss amber: apart in full colour', () => {
    const ab = css('ab.css');
    const loss = token(ab, '--c-loss');
    expect(token(ab, '--c-loss-text')).toBe('#b45309');
    expect(loss).toBe('#d97706');
    expect(deltaE(VERSION_HEX.tz, loss)).toBeGreaterThan(20);
  });
});
