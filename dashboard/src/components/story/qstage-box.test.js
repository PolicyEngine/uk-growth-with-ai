// The question box (QStage, sub.pin 'full'; Vahid, 22 Nov: "lets fix the
// text in middle and dont move the text when scroll, also lower the
// height of the box color"): its height is clamped (about 60% of the
// screen, 420-640px; about 70% at 900px and below), the question is
// centred in it by the box's own grid, and nothing ties the question to
// the scroll: no sticky holder, no transform, no scroll-linked property
// on the card. The phase is read from the box (boxPhase).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { boxPhase, qMid } from './QStage.jsx';

const css = readFileSync(join(__dirname, '..', '..', 'app', 'story.css'), 'utf8');
const rule = (sel) => {
  const m = css.match(new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`));
  // the declarations only, comments set aside
  return m ? m[2].replace(/\/\*[\s\S]*?\*\//g, '') : '';
};

describe('the question box', () => {
  it('is clamped: about 60% of the screen (420-640px), about 70% at 900px and below', () => {
    expect(css).toMatch(/--q-pin: clamp\(420px, 60svh, 640px\);/);
    expect(css).toMatch(/--q-pin-phone: clamp\(380px, 70svh, 640px\);/);
    expect(rule('.q-stage')).toMatch(/height: var\(--q-pin\);/);
    expect(css).toMatch(/@media \(max-width: 900px\) \{\s*\.q-stage \{\s*height: var\(--q-pin-phone\);/);
  });
  it('centres the question in the box, with nothing tied to the scroll', () => {
    const stage = rule('.q-stage');
    expect(stage).toMatch(/display: grid;/);
    expect(stage).toMatch(/align-content: center;/);
    expect(stage).toMatch(/justify-items: center;/);
    const hold = rule('.q-stage-hold');
    expect(hold).toMatch(/position: static;/);
    expect(hold).not.toMatch(/sticky|--q-top|transform/);
    for (const sel of ['.q-stage-card', '.q-visual', '.q-stage-hold']) {
      const r = rule(sel);
      expect(r, sel).not.toMatch(/transform|var\(--qa\)|var\(--qm\)|translate|scale\(/);
    }
    // and QStage writes no position on the card (only --qa, --qm, the phase)
    const js = readFileSync(join(__dirname, 'QStage.jsx'), 'utf8');
    expect(js).not.toMatch(/--q-top/);
  });
  it('reads its phase from the box: in as the box arrives, done once its foot reaches the rail', () => {
    const V = 800;
    const R = 100;
    const h = 480;
    const at = (top) => boxPhase({ top, bottom: top + h, V, R });
    expect(at(V + 10).phase).toBe('wait');
    expect(at(V - h * 0.5).phase).toBe('in');
    // centred at the optical centre: not leaving yet
    const centred = qMid(R, V) - h / 2;
    expect(at(centred).qm).toBe(0);
    expect(at(R - h).phase).toBe('done');
    // monotone as the page scrolls down
    let last = -1;
    for (let top = V; top >= R - h; top -= 20) {
      const q = at(top).qm;
      expect(q).toBeGreaterThanOrEqual(last);
      last = q;
    }
  });
});
