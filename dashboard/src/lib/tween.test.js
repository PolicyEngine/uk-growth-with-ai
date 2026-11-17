import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cubicBezier, easing, lerpString, morphTiming } from './tween.js';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

// every declaration block's transition / transition-property values, comments stripped
function transitions(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/transition(?:-property)?\s*:\s*([^;}]*)/g)].map((m) => m[1]);
}

describe('no CSS transition of d (WebKit cannot animate it: Tween.jsx does)', () => {
  const files = fs.readdirSync(appDir).filter((f) => f.endsWith('.css'));
  it('finds the stylesheets', () => {
    expect(files.length).toBeGreaterThan(3);
  });
  for (const f of files) {
    it(f, () => {
      const bad = transitions(fs.readFileSync(path.join(appDir, f), 'utf8')).filter((v) => v.split(/,(?![^(]*\))/).some((part) => /^d(\s|$)/.test(part.trim())));
      expect(bad).toEqual([]);
    });
  }
});

describe('lerpString', () => {
  it('interpolates the numbers of two paths of the same shape', () => {
    const f = lerpString('M0,0L10,20', 'M10,10L30,40');
    expect(f(0)).toBe('M0,0L10,20');
    expect(f(0.5)).toBe('M5,5L20,30');
    expect(f(1)).toBe('M10,10L30,40');
  });
  it('handles negatives, decimals and exponents', () => {
    const f = lerpString('M-1.5,2e1', 'M1.5,-20');
    expect(f(0.5)).toBe('M0,0');
  });
  it('gives up (snap) on paths of different shapes', () => {
    expect(lerpString('M0,0L1,1', 'M0,0L1,1L2,2')).toBeNull();
    expect(lerpString('M0,0L1,1', 'M0,0C1,1')).toBeNull();
  });
  it('interpolates plain numbers (rect geometry)', () => {
    expect(lerpString('10', '20')(0.25)).toBe('12.5');
  });
});

describe('easing', () => {
  it('evaluates cubic-bezier like CSS', () => {
    const e = cubicBezier(0.22, 0.61, 0.36, 1);
    expect(e(0)).toBe(0);
    expect(e(1)).toBe(1);
    expect(e(0.5)).toBeGreaterThan(0.7);
    expect(easing('linear')(0.3)).toBeCloseTo(0.3);
    expect(easing('cubic-bezier(0, 0, 1, 1)')(0.4)).toBeCloseTo(0.4, 3);
  });
});

describe('morphTiming', () => {
  it('reads the --morph entry of the computed transition lists', () => {
    const t = morphTiming({
      transitionProperty: 'opacity, --morph',
      transitionDuration: '0.5s, 900ms',
      transitionDelay: '0s, 0.1s',
      transitionTimingFunction: 'ease, cubic-bezier(0.22, 0.61, 0.36, 1)',
    });
    expect(t.duration).toBe(900);
    expect(t.delay).toBe(100);
    expect(t.ease(1)).toBe(1);
  });
  it('is null with no entry or a zero duration (reduced motion, the landing snap)', () => {
    expect(morphTiming({ transitionProperty: 'none', transitionDuration: '0s', transitionDelay: '0s', transitionTimingFunction: 'ease' })).toBeNull();
    expect(morphTiming({ transitionProperty: '--morph', transitionDuration: '0s', transitionDelay: '0s', transitionTimingFunction: 'ease' })).toBeNull();
  });
});
