'use client';

// Model comparison tab: what each of the four sources can represent, then
// OG-UK's no-AI baseline against the OBR. Two-pane story; the ✓/✗ grids live
// in the right-hand panel. Model numbers are computed from aiScenarios.json;
// published figures come from metrics.js with their sources.

import { Cv } from '@/tabs/ai/scenarioStory.jsx';
import { URLS, issue, pr, efo, EFO_PAGE } from '@/tabs/ai/links.js';
import {
  OBR, OGUK_COMPONENTS, PRODUCTIVITY, G_Y, meanGrowth, signed, YEARS, LS_FALL,
} from '@/tabs/ai/metrics.js';

const COLS = ['Korinek et al.', 'Moll & Imas', 'OBR', 'OG-UK'];
const ext = (href, text) => (
  <a href={href} target="_blank" rel="noreferrer">
    {text}
  </a>
);

// Baseline check against the OBR (EFO March 2026).
const MEAN = meanGrowth('baseline');
const GROW_YEARS = `${YEARS[1]}–${String(YEARS[YEARS.length - 1]).slice(2)}`;
const pp = (x) => `${signed(x, 2)}pp`;
const COMPONENTS = [
  // [label, OBR label, OBR value, OG-UK label, OG-UK value, dp]
  ['Productivity growth', 'productivity, medium term (¶1.2)', OBR.productivity, 'e^{g_y} − 1', PRODUCTIVITY],
  ['Population vs labour supply, 2030', 'labour supply (¶1.2, ¶1.10)', OBR.labourSupply2030, 'population aged 21–100, 2029→30', OGUK_COMPONENTS.population2030],
  ['Balanced growth vs potential, 2030', 'potential output (¶2.10)', OBR.potential2030, 'g_y + g_n', OGUK_COMPONENTS.balanced2030],
  ['Balanced growth vs potential, first year', 'potential output 2026 (¶2.10)', OBR.potential2026, 'g_y + g_n, 2026→27', OGUK_COMPONENTS.balanced2026],
];

export const COVERAGE_STEPS = [
  {
    title: 'Four sources, four kinds of model',
    content: (
      <>
        <p className="key-point">
          The four sources differ in what they are: two structural models, one argued model and one forecast
          scenario.
        </p>
        <ul className="txt-bullets">
          <li>
            <b>Korinek et al. (2026)</b>: a task-based model of the US to 2030, with two occupations and a
            frictional labour market. It supplies the calibration of the Automation + productivity scenario (
            <a href="#scenarios">Scenario design</a>).
          </li>
          <li>
            <b>Moll and Imas</b> ({ext(URLS.mollImas, '9 September 2026')}): a Solow growth model with task-based
            production and a representative agent, used to argue that double-digit growth is unlikely.
          </li>
          <li>
            <b>OBR</b> (March 2026 EFO, {ext(efo(EFO_PAGE.box22), 'Box 2.2')}): a scenario layered on the central forecast, not a structural
            model.
          </li>
          <li>
            <b>OG-UK</b>: an overlapping-generations general-equilibrium model of the UK with a tax system, run
            here with one sector (<Cv id="sector" />).
          </li>
        </ul>
      </>
    ),
  },
  {
    title: 'Where they overlap: automation, factor shares, capital',
    content: (
      <>
        <p className="key-point">All four represent automation and a falling labour share; three model capital.</p>
        <ol className="txt-numbered">
          <li>
            <b>Automation.</b> In their {ext(URLS.korinekT1, 'Table 1')}, Korinek et al. raise the affected mass m<sub>t</sub> from 0.14 in mid-2026 to
            0.2, 0.3 or 0.5 in 2030 (ceiling 0.624), with automation shares &psi; of 0.50, 0.75 or 0.90. Moll and
            Imas raise the automatable share of tasks from one third today to 100% by 2045. The OBR states it
            (&ldquo;substitute for labour, increasing capital deepening&rdquo;). OG-UK raises &gamma;.
          </li>
          <li>
            <b>Labour share.</b> It falls in all four: endogenously for Korinek et al. and Moll and Imas, by
            assumption for the OBR, and by exactly the rise in &gamma; in OG-UK.
          </li>
          <li>
            <b>Capital accumulation.</b> Modelled by Korinek et al. (with a capital-supply elasticity of 3), Moll
            and Imas (Solow saving) and OG-UK (life-cycle saving); the OBR forecasts investment but does not model
            the AI response.
          </li>
          <li>
            <b>Augmentation</b>, productivity without displacement: Korinek et al.&rsquo;s share 1&minus;&psi; and
            the OBR&rsquo;s &ldquo;raising productivity for workers who remain&rdquo;. In OG-UK only the Automation
            + productivity scenario has it; in Automation only, &gamma; and Z together leave output at fixed
            inputs unchanged. Moll and Imas model pure automation.
          </li>
        </ol>
      </>
    ),
  },
  {
    title: 'Channels only Korinek et al. model: adoption, new tasks, unemployment',
    content: (
      <>
        <p className="key-point">
          Diffusion, new human tasks and unemployment are in Korinek et al. only; OG-UK has none of them.
        </p>
        <p>
          Korinek et al. model <b>diffusion</b> (the adopted share d<sub>t</sub>, from 0.10 to 0.20, 0.40 or 0.6
          by 2030), <b>task reinstatement</b> (new human tasks, &rho; of 0.50, 0.25 or 0), <b>unemployment and
          search</b> (matching, a search discount and posting speed) and an <b>ideas stock</b>. Moll and Imas share
          only the ideas channel, in their extension on AI in research. The OBR states an unemployment outcome (
          {OBR.unemployment}%) without modelling search.
        </p>
        <p>
          In OG-UK, adoption is folded into the ramps of &gamma; and Z; reinstatement and search have no
          counterpart (<Cv id="displacement" />).
        </p>
      </>
    ),
  },
  {
    title: 'What only OG-UK has: households, cohorts, a tax system',
    content: (
      <>
        <p className="key-point">
          OG-UK is the only source with heterogeneous households; the OBR alone shares its cohorts and tax system.
        </p>
        <ul className="txt-bullets">
          <li>
            <b>Workers differ</b>: productivity e<sub>j,s</sub> varies over 7 ability types and 80 ages. Korinek et
            al. have two occupations with one wage each; Moll and Imas and the OBR have none.
          </li>
          <li>
            <b>Cohorts</b> on the UN World Population Prospects projection for the UK, which only the OBR&rsquo;s
            demographic forecast shares.
          </li>
          <li>
            <b>The UK tax system</b>, through income-tax functions fitted to PolicyEngine UK, which only the
            OBR&rsquo;s public-finance forecast shares.
          </li>
        </ul>
        <p className="note-box">
          <b>Demand composition</b> &mdash; spending shifting towards what stays scarce as automated goods get
          cheaper &mdash; is absent from every model as run. It is central to Moll and Imas&rsquo;s argument, but
          argued rather than modelled; Korinek et al. have one good; OG-UK&rsquo;s multi-sector build is not used (
          <Cv id="sector" />
          ).
        </p>
      </>
    ),
  },
  {
    title: 'Six AI channels mapped onto two parameters',
    content: (
      <>
        <p className="key-point">
          In OG-UK, capability and adoption are folded into the ramps of &gamma; and Z; reinstatement and search
          have no counterpart.
        </p>
        <p>
          The labour-share fall in Korinek et al. comes from the affected mass, diffusion and automation share
          jointly (m&middot;d&middot;&psi;), so adoption enters OG-UK&rsquo;s &gamma; as well as Z. OG-UK has no
          tasks to count separately.
        </p>
        <p>
          The models also measure substitution between different things. Korinek et al.&rsquo;s elasticity of
          0.5 is across tasks; Moll and Imas cite Charles Jones&rsquo;s elasticity of 0.2 across goods; OG-UK&rsquo;s
          &epsilon; is between capital and labour, set to 1 (Cobb-Douglas) so that the labour share is exactly
          1&minus;&gamma; and the {LS_FALL.toFixed(1)}pp target is met by construction.
        </p>
      </>
    ),
  },
  {
    title: 'The OBR has an OLG model, but not for this scenario',
    content: (
      <>
        <p className="key-point">
          Box 2.2 states its outcomes; it does not derive them from a model.
        </p>
        <p>
          The OBR has an overlapping-generations model of the same class as OG-UK (
          {ext(URLS.obrWp22, 'Working Paper No. 22, A new UK overlapping generations model')}, April 2025), but
          Box 2.2 is an assumption layered on the central forecast. Its AI-productivity scenarios are separate, in{' '}
          {ext(URLS.obrBp9, 'Briefing Paper No. 9, Forecasting productivity')}, Annex B. The OBR case can therefore
          be imposed in OG-UK but not tested against the OBR&rsquo;s own model.
        </p>
      </>
    ),
  },
  {
    title: 'OG-UK baseline against the OBR: GDP growth',
    content: (
      <>
        <p className="key-point">
          OG-UK&rsquo;s no-AI baseline grows {MEAN.toFixed(2)}% a year on average over {GROW_YEARS}, against the
          OBR&rsquo;s {OBR.growth2027to30.toFixed(2)}%: a gap of {pp(MEAN - OBR.growth2027to30)}.
        </p>
        <p>
          Every scenario is measured against the no-AI baseline, so the baseline is checked against the
          OBR&rsquo;s March 2026 <i>Economic and fiscal outlook</i> ({ext(efo(EFO_PAGE.p1_9), 'paragraph 1.9')}).
          The model&rsquo;s growth rates are computed from the committed results; the component values below come
          from the repository&rsquo;s {ext(URLS.obrPy, 'obr.py')} comparison.
        </p>
      </>
    ),
  },
  {
    title: 'The growth components',
    content: (
      <>
        <p className="key-point">
          Productivity growth now matches the OBR; the remaining gap is population growth against labour supply.
        </p>
        <ol className="txt-numbered">
          <li>
            <b>Productivity.</b> OG-UK&rsquo;s labour-augmenting growth of {(G_Y * 100).toFixed(1)}% (
            {PRODUCTIVITY.toFixed(1)}% a year) equals the OBR&rsquo;s medium-term productivity growth (
            {ext(efo(EFO_PAGE.p1_2), 'paragraph 1.2')}).
          </li>
          <li>
            <b>Population.</b> OG-UK&rsquo;s g<sub>n</sub> is growth of the model population aged 21&ndash;100 (
            {OGUK_COMPONENTS.population2030}% in 2030), not labour supply; the OBR&rsquo;s labour supply grows{' '}
            {OBR.labourSupply2030}% because ageing lowers participation and hours ({ext(efo(EFO_PAGE.p1_10), 'paragraph 1.10')}).
          </li>
          <li>
            <b>Balanced growth.</b> g<sub>y</sub>&nbsp;+&nbsp;g<sub>n</sub> is the balanced-growth rate (
            {OGUK_COMPONENTS.balanced2030}% in 2030), not potential output ({OBR.potential2030}%, {ext(efo(EFO_PAGE.p2_10), 'paragraph 2.10')}). Realised growth
            sits below it because model labour input per person falls as the population ages.
          </li>
        </ol>
        <p className="note-box">
          Before the re-run, <code>g_y_annual</code> was 1.1%: the OBR&rsquo;s potential output growth entered as
          labour-augmenting productivity, which double-counted labour supply already carried by g<sub>n</sub>. It
          is now {(G_Y * 100).toFixed(1)}%, the OBR&rsquo;s productivity figure ({ext(issue(5), 'issue #5')},{' '}
          {ext(pr(11), 'PR #11')}).
        </p>
      </>
    ),
  },
  {
    title: 'What has not been checked, and what each model contributes',
    content: (
      <>
        <p className="key-point">Only growth has been compared with the OBR year by year.</p>
        <p>
          The OBR also publishes borrowing ({OBR.borrowing2425}% of GDP in 2024-25 and {OBR.borrowing2526}% in
          2025-26, falling to {OBR.borrowing3031}% in 2030-31; {ext(efo(EFO_PAGE.p1_3), 'paragraph 1.3')}), debt and receipts. OG-UK produces all three, and
          its own ratios to GDP differ from the data (<Cv id="levels" />); a year-by-year comparison has not been
          run.
        </p>
        <p>
          OG-UK is weakest where Korinek et al. are strongest (adoption, reinstatement, unemployment) and strongest
          on households, cohorts and the tax system, where only the OBR also covers cohorts and tax. OG-UK adds the
          general-equilibrium response of capital, saving, prices and the tax base to an imposed technology path;{' '}
          {ext(URLS.peUk, 'PolicyEngine UK')} adds who bears it.
        </p>
      </>
    ),
  },
];

const i = (text, cls = 'info', icon = '\\(\\to\\)') => ({ icon, text, cls });

export const COVERAGE_PANELS = [
  { title: 'The four sources', badge: 'Step 1', sections: [
    { label: 'Model class', type: 'output', lines: [
      i('Korinek et al.: task-based, 2 occupations, search frictions; US, to 2030', 'accent', 'K'),
      i('Moll and Imas: Solow with task-based production, representative agent', 'info', 'M'),
      i('OBR: scenario on the central forecast, not a structural model', 'info', 'O'),
      i('OG-UK: OLG general equilibrium, UK, tax system; 1 sector as run', 'accent', 'G'),
    ]},
  ]},
  { title: 'Shared channels', badge: 'Step 2', sections: [
    { label: 'Who models what', type: 'grid', cols: COLS, rows: [
      { label: 'Automation', cells: ['y', 'y', 'y', 'y'] },
      { label: 'Factor shares', cells: ['y', 'y', 'y', 'y'] },
      { label: 'Capital accumulation', cells: ['y', 'y', 'p', 'y'] },
      { label: 'Augmentation', cells: ['y', 'n', 'y', 'Scenario 3 only'] },
    ]},
  ]},
  { title: 'Channels only Korinek et al. model', badge: 'Step 3', sections: [
    { label: 'Who models what', type: 'grid', cols: COLS, rows: [
      { label: 'Adoption / diffusion', cells: ['y', 'n', 'n', 'n'] },
      { label: 'Task reinstatement', cells: ['y', 'n', 'n', 'n'] },
      { label: 'Unemployment / search', cells: ['y', 'n', 'p', 'n'] },
      { label: 'Ideas / R&D', cells: ['y', 'y', 'n', 'n'] },
    ]},
  ]},
  { title: 'OG-UK strengths', badge: 'Step 4', sections: [
    { label: 'Who models what', type: 'grid', cols: COLS, rows: [
      { label: 'Worker heterogeneity', cells: ['p', 'n', 'n', 'y'] },
      { label: 'Cohorts / demographics', cells: ['n', 'n', 'y', 'y'] },
      { label: 'Fiscal / tax system', cells: ['n', 'n', 'y', 'y'] },
      { label: 'Demand composition', cells: ['n', 'p', 'n', 'n'] },
    ]},
    { label: 'Key', type: 'output', lines: [
      i('✓ modelled · ~ partly, argued or stated · ✗ absent', 'info', ''),
    ]},
  ]},
  { title: 'Mapping to OG-UK', badge: 'Step 5', sections: [
    { label: 'Channels → two parameters', type: 'math', equations: [
      { label: 'Automation, adoption', tex: '\\to\; \\gamma_t' },
      { label: 'Productivity, adoption', tex: '\\to\; Z_t' },
    ]},
    { label: 'Elasticity of substitution (object differs by model)', type: 'grid', cols: COLS, rows: [
      { label: 'Value', cells: ['0.5', '0.2', 'n/a', 'ε = 1'] },
      { label: 'Between', cells: ['tasks', 'goods', '—', 'K and L'] },
    ]},
  ]},
  { title: 'The OBR case', badge: 'Step 6', sections: [
    { label: 'What Box 2.2 is', type: 'output', lines: [
      i('States labour-share and unemployment outcomes', 'info'),
      i('Does not derive them from a model', 'warn', '!'),
      i('OBR OLG model exists (Working Paper 22, April 2025), not used for it', 'info'),
      i('AI-productivity scenarios: Briefing Paper 9, Annex B', 'info'),
    ]},
  ]},
  { title: 'Headline test', badge: 'Step 7', sections: [
    { label: `Real GDP growth, ${GROW_YEARS} average`, type: 'grid', cols: ['OBR', 'OG-UK', 'Gap'], rows: [
      { label: 'Real GDP growth', cells: [`${OBR.growth2027to30.toFixed(2)}%`, `${MEAN.toFixed(2)}%`, pp(MEAN - OBR.growth2027to30)] },
    ]},
    { label: 'Source', type: 'output', lines: [
      i('OBR, EFO March 2026, ¶1.9; OG-UK no-AI baseline', 'info', ''),
    ]},
  ]},
  { title: 'Components', badge: 'Step 8', sections: [
    { label: 'OBR against the OG-UK no-AI baseline', type: 'grid', cols: ['OBR', 'OG-UK', 'Gap'], rows:
      COMPONENTS.map(([label, , obr, , oguk]) => ({
        label,
        cells: [`${obr.toFixed(1)}%`, `${oguk.toFixed(2)}%`, pp(oguk - obr)],
      })),
    },
    { label: 'Definitions', type: 'output', lines: COMPONENTS.map(([label, o, , g]) => i(`${label}: OBR ${o}; OG-UK ${g}`, 'info', '')) },
  ]},
  { title: 'Open checks', badge: 'Step 9', sections: [
    { label: 'Not yet compared with the OBR year by year', type: 'output', lines: [
      i(`Borrowing (${OBR.borrowing2526}% of GDP 2025-26 → ${OBR.borrowing3031}% 2030-31)`, 'warn', '○'),
      i('Debt', 'warn', '○'),
      i('Receipts', 'warn', '○'),
    ]},
    { label: 'What each model adds', type: 'output', lines: [
      i('OG-UK: general-equilibrium response to an imposed technology path', 'accent'),
      i('PolicyEngine UK: who bears it', 'accent'),
    ]},
  ]},
];

