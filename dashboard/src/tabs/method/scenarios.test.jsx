// Scenarios: every direction arrow on the arm cards follows the sign of the
// value its words describe, for each scenario and closure (the cards show UK
// central; the helpers are checked for all four).
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { SCENARIOS, CLOSURES, fixedInputVsTz, gap } from '@/tabs/ai/surprise.js';
import ScenariosTab, { stressMove, tzGdpMove, stressItems, tzGdpItems } from './ScenariosTab.jsx';

afterEach(cleanup);

const sign = (x) => (x == null ? null : Math.abs(x) < 0.005 ? 0 : Math.sign(x));

describe('Scenarios direction icons', () => {
  it('the stress test arrow follows the sign of output at fixed inputs against technology unchanged', () => {
    for (const s of SCENARIOS) {
      for (const cl of CLOSURES) {
        const x = fixedInputVsTz(s.id, 'ss', cl);
        const m = stressMove(x);
        if (x == null) {
          expect(m).toBeNull();
          continue;
        }
        expect(m.icon, `${s.id} ${cl}`).toBe(x < 0 ? 'gapDown' : 'gapUp');
        expect(m.word, `${s.id} ${cl}`).toBe(x < 0 ? 'falls' : 'rises slightly');
      }
      for (const it of stressItems(s.id)) expect(it.text).toContain(stressMove(fixedInputVsTz(s.id, 'ss', it.key)).word);
    }
  });

  it('the technology-unchanged GDP arrow follows the sign of the GDP gap', () => {
    for (const s of SCENARIOS) {
      for (const cl of CLOSURES) {
        const x = gap(s.id, 'tz', cl, 'Y');
        const m = tzGdpMove(x);
        const want = { null: 'caveat', 0: 'onPath', 1: 'gapUp', '-1': 'gapDown' }[sign(x)];
        expect(m.icon, `${s.id} ${cl}`).toBe(want);
      }
      for (const it of tzGdpItems(s.id)) expect(it.text).toContain(tzGdpMove(gap(s.id, 'tz', it.key, 'Y')).word);
    }
  });

  it('renders the arm cards with their items and keeps the anchors', () => {
    const { container } = render(<ScenariosTab />);
    for (const id of ['s-scenarios', 's-arms', 's-timing', 'arm-tfp', 'arm-tz', 'arm-ss', 'm-jump', 'scenario-map', 'timing'])
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    expect(container.textContent).toContain('A bound, not a forecast');
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });
});
