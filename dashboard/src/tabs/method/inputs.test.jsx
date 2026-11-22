// Inputs and sources: every input row keeps its anchor (Method redesign,
// M3). The ids are typed in inputs.js, frozen at the slug each label had on
// 22 Nov 2026 under the 2028 set, so a reworded label or an added symbol
// cannot move a link from another page.
import { describe, expect, it } from 'vitest';
import { INPUTS, ROWS } from './inputs.js';

const FROZEN = [
  'in-uk-low-output-at-fixed-inputs',
  'in-uk-low-labour-share-fall',
  'in-uk-central-output-at-fixed-inputs',
  'in-uk-central-labour-share-fall-headline',
  'in-uk-high-output-at-fixed-inputs',
  'in-uk-high-labour-share-fall',
  'in-korinek-et-al-substantial-us-labour-shar',
  'in-stress-test-gdp-held-at-the-obr-s-centra',
  'in-which-pairs-the-three-arms-the-headline',
  'in-the-scenario-s-ai-starts-as-a-surprise-o',
  'in-linear-four-year-ramp-to-full-weight',
  'in-perfect-foresight-after-the-surprise',
  'in-trend-productivity-growth',
  'in-2030-debt-gdp-target',
  'in-vintage',
  'in-demographics',
  'in-tax-functions',
  'in-k-share-of-the-extra-capital-firms-want-',
  'in-k-bound-no-foreign-capital',
  'in-d-foreign-share-of-new-government-debt',
  'in-world-interest-rate',
  'in-capital-share-labour-share-65',
  'in-elasticity-of-substitution',
  'in-depreciation',
  'in-households-80-ages-seven-earnings-groups',
  'in-employer-nics-as-a-payroll-tax',
  'in-common-rule-debt-rule-from-2036',
  'in-fixed-spending',
  'in-debt-neutral-transfers',
  'in-debt-repricing-speed-sensitivity',
  'in-solver-and-gate-tolerances',
  'in-employees-displaced-survivors-wage-rise',
  'in-rise-in-the-return-on-capital',
];

describe('Inputs and sources', () => {
  it('every input row has its frozen id, once, in both data sets', () => {
    expect(ROWS.map((r) => r.id)).toEqual(FROZEN);
    expect(INPUTS.map((r) => r.id)).toEqual(FROZEN);
    expect(new Set(FROZEN).size).toBe(FROZEN.length);
  });
});
