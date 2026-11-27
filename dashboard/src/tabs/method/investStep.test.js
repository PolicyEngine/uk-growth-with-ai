import { describe, expect, it } from 'vitest';
import { investStepLine } from './investStep.js';

const years = [2034, 2035, 2036];
const reader = (vals) => (v, y) => vals[`${v}:${y}`];

describe('investStepLine (M11)', () => {
  it('reads the step and the debt gap from the data', () => {
    const line = investStepLine(reader({ 'I:2035': 2.84, 'I:2036': 7.15, 'debt_gdp_pp:2036': 1.99 }), 2036, years);
    expect(line).toContain('in 2036, the debt rule’s first year');
    expect(line).toContain('+2.8% above the forecast path in 2035 and +7.2% in 2036');
    expect(line).toContain('debt 2.0pp of GDP above');
  });
  it('shows nothing when investment does not step up', () => {
    expect(investStepLine(reader({ 'I:2035': 4.65, 'I:2036': 3.1, 'debt_gdp_pp:2036': 1.99 }), 2036, years)).toBeNull();
  });
  it('shows nothing when debt is not above the path', () => {
    expect(investStepLine(reader({ 'I:2035': 2.85, 'I:2036': 4.47, 'debt_gdp_pp:2036': 0 }), 2036, years)).toBeNull();
    expect(investStepLine(reader({ 'I:2035': 2.85, 'I:2036': 4.47, 'debt_gdp_pp:2036': -0.78 }), 2036, years)).toBeNull();
  });
  it('shows nothing when a value is missing', () => {
    expect(investStepLine(reader({ 'I:2036': 7.15, 'debt_gdp_pp:2036': 1.99 }), 2036, years)).toBeNull();
  });
  it('gives a line on the live data', () => {
    expect(investStepLine()).toMatch(/^Investment steps up again in \d{4}/);
  });
});
