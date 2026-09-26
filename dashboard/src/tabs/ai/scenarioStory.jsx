'use client';

// UK growth with AI › How the scenarios are built: the steps (left) and the
// sticky panels (right) for the two-pane story, in the same format as
// Methodology › How OG-UK works. Caveat ids (caveat-fiscal, ...) are the
// targets of the numbered caveat links on the Results sub-tab.

import AiChannels from '@/tabs/ai/AiChannels.jsx';
import D from '@/data/aiScenarios.json';
import { ARM_META, US_COLORS } from '@/tabs/ai/series.js';

const G0 = D.assum.gamma_base;
const G1 = D.assum.gamma_shocked;
const DG = +(G1 - G0).toFixed(3);
const Z_OBR = D.assum.Z_obr.toFixed(4);
const Z_ANTH = D.assum.Z_anthropic.toFixed(4);
const KL = Math.exp(Math.log(1 + D.assum.gamma_only_output_gain) / DG);
const OBR_Y_2030 = (D.idx.obr_ramp.Y[4] / D.idx.baseline.Y[4] - 1) * 100;
const signed = (x, dp = 1) => `${x >= 0 ? '+' : ''}${x.toFixed(dp)}`;

function Sw({ c, dashed }) {
  return <span className={`legend-line${dashed ? ' dashed' : ''}`} style={{ borderTopColor: c }} />;
}

// One scenario: what the source says, and how it enters OG-UK.
function Scenario({ color, dashed, name, tag, says, enters }) {
  return (
    <article className="scenario-card">
      <header className="scenario-head">
        <span className="scenario-name">
          <Sw c={color} dashed={dashed} />
          {name}
        </span>
        <span className="cell-tag">{tag}</span>
      </header>
      <div className="scenario-part">
        <div className="scenario-label">What it says</div>
        {says}
      </div>
      {enters ? (
        <div className="scenario-part">
          <div className="scenario-label">How it enters OG-UK</div>
          {enters}
        </div>
      ) : null}
    </article>
  );
}

export const STORY_STEPS = [
  {
    title: 'How AI enters the model',
    content: (
      <>
        <p>
          OG-UK has no AI parameter. We represent AI through <b>two production parameters</b> and let the
          rest of the economy — households&rsquo; saving and work, capital, prices, the tax base — respond in
          general equilibrium.
        </p>
        <p>
          <b>&gamma;, the capital weight</b>, stands for automation: tasks move from labour to capital. With
          Cobb-Douglas production (&epsilon;&nbsp;=&nbsp;1) the labour share is exactly 1&minus;&gamma;, so
          raising &gamma; from {G0} to {G1} is a <b>3.9pp</b> labour-share fall, 65% &rarr; 61.1%.
        </p>
        <p>
          <b>Z, total factor productivity</b>, stands for AI making production more efficient. It is not
          picked by hand: it is solved so that each scenario hits its source&rsquo;s target.
        </p>
        <p>
          Both parameters <b>ramp gradually over 2026&ndash;2030</b>, mirroring Anthropic&rsquo;s design where
          capability and adoption build to 2030. In 2026 they are still at their baseline values.
        </p>
      </>
    ),
  },
  {
    title: 'Which channels are in, and which are not',
    content: (
      <>
        <p>
          Anthropic&rsquo;s model has six AI channels; we collapse them into two parameters. The ones marked
          &ldquo;not modelled&rdquo; have <b>no counterpart</b> in these runs, so no result here speaks to them.
          For the full comparison with Anthropic, Moll &amp; Imas and the OBR, see{' '}
          <a href="#methodology/coverage">Methodology › Model coverage</a>.
        </p>
        <AiChannels showHeading={false} />
      </>
    ),
  },
  {
    title: 'Scenario 1 — UK, no AI',
    content: (
      <Scenario
        color={ARM_META.baseline.color}
        name="UK, no AI"
        tag="baseline"
        says={
          <p>
            No AI shock at all. The UK economy on its existing calibration: OBR-based productivity growth,
            ONS demographics, the current tax system.
          </p>
        }
        enters={
          <p>
            &epsilon; = 1.0, &gamma; = {G0} (labour share 65%), Z = 1.0 throughout. Every other path is
            measured against this.
          </p>
        }
      />
    ),
  },
  {
    title: 'Scenario 2 — UK, OBR displacement',
    content: (
      <Scenario
        color={ARM_META.obr_ramp.color}
        name="UK, OBR displacement"
        tag="OBR, EFO Box 2.2"
        says={
          <>
            <p>
              <b>OBR March 2026 EFO, Box 2.2</b> — an unemployment scenario about new technology (the
              OBR&rsquo;s AI-productivity scenarios are separate, in Briefing Paper 9, Annex B). Machines
              substitute for labour, capital deepens, and productivity rises for the workers who remain.
              Their words:
            </p>
            <blockquote>
              &ldquo;higher trend productivity fully offsets lower employment to leave the{' '}
              <b>level of GDP unchanged</b>… this implies a <b>lower labour share and a higher corporate
              profit share</b>… As labour income faces a higher effective tax rate, this{' '}
              <b>reduces the tax-richness of economic activity</b>.&rdquo;
            </blockquote>
            <p>
              Equilibrium unemployment rises to <b>5.5%</b>.
            </p>
          </>
        }
        enters={
          <p>
            &gamma; ramps {G0} &rarr; {G1} (automation), and <b>Z is solved for no productivity gain at
            fixed inputs</b>: at the baseline&rsquo;s capital and labour, GDP would be unchanged. In
            equilibrium GDP still rises with capital deepening ({signed(OBR_Y_2030)}% by 2030). Z = {Z_OBR}.
            Their 5.5% unemployment has <b>no counterpart</b>: OG-Core has no labour-market block.
          </p>
        }
      />
    ),
  },
  {
    title: 'Scenario 3 — UK, Anthropic substantial',
    content: (
      <Scenario
        color={ARM_META.anthropic_ramp.color}
        name="UK, Anthropic substantial"
        tag="US scenario, UK model"
        says={
          <p>
            <b>Korinek et al. (2026), Table 3, &ldquo;substantial&rdquo; column</b> — their middle case, not
            the modest one and not the extreme one. By 2030: labour share falls{' '}
            <b>60&cent; &rarr; 56.1&cent;</b> (&minus;3.9pp), measured TFP rises <b>+3.1%</b>, GDP +8.3%
            above the no-AI path, growth 5.4%, cognitive unemployment 4.5%.
          </p>
        }
        enters={
          <p>
            &gamma; ramps {G0} &rarr; {G1} to deliver the same <b>&minus;3.9pp</b> labour-share fall, applied
            to the UK&rsquo;s 65% rather than the US 60%. <b>Z solved jointly</b> for their +3.1% TFP ={' '}
            {Z_ANTH}. Their unemployment and wage split have no counterpart.
          </p>
        }
      />
    ),
  },
  {
    title: 'Reference — the US paths from Anthropic',
    content: (
      <Scenario
        color={US_COLORS.Substantial}
        dashed
        name="US, Anthropic — No AI / Modest / Substantial / Extreme"
        tag="reference only"
        says={
          <>
            <p>
              Anthropic&rsquo;s four published US paths — their own model&rsquo;s output for the United
              States, <b>not anything run here</b>.
            </p>
            <p>
              Table 3 publishes <b>2030 endpoints only</b>, so the dashed lines between 2026 and 2030 (in the
              collapsed GDP-paths chart) are interpolated by us, not published by them. The other charts show
              only their 2030 endpoints, as hollow dots.
            </p>
          </>
        }
      />
    ),
  },
  {
    title: 'Why both UK scenarios use the same γ path',
    content: (
      <>
        <p>
          Neither source publishes a UK labour-share number, so both UK scenarios impose Anthropic&rsquo;s{' '}
          <b>&minus;3.9pp</b> fall as the automation intensity, <b>ramped</b> over the window.
        </p>
        <p>
          A time-varying <code>gamma</code> is not something standard OG-Core supports, so these runs use a
          patch to OG-Core&rsquo;s firm block.
        </p>
        <p>
          What separates the two scenarios is <b>what Z is solved against</b>: Anthropic&rsquo;s +3.1%
          measured TFP, versus no productivity gain at fixed inputs for the OBR case. Apart from each
          arm&rsquo;s own G/Y (caveat 1, next step), that is the entire difference between the gold and teal
          paths on the Results sub-tab.
        </p>
      </>
    ),
  },
  {
    title: 'Caveats that affect every number',
    content: (
      <ol className="caveat-list" start={1}>
        <li id="caveat-fiscal">
          <b>The shocked arms change fiscal policy as well as technology.</b> Each arm sets{' '}
          <code>alpha_G</code> to its own steady-state G/Y — baseline 0.2887, OBR 0.2812, Anthropic 0.2852 —
          so government consumption differs from 2026, before any technology change. Fiscal results
          (government spending, tax, debt) therefore bundle a policy response with the AI effect. This is
          being fixed separately.
        </li>
        <li id="caveat-gy">
          <b>The <code>g_y_annual = 1.1%</code> sourcing error.</b> Every figure here inherits it; it is set
          out under <a href="#methodology/obr">Methodology › OBR comparison</a>.
        </li>
        <li id="caveat-sector">
          <b>Every result is 1-sector.</b> <code>multi_sector=False</code> in <code>run_scenarios.py</code>.
          Single-sector Cobb-Douglas was chosen so that &epsilon;=1 makes the labour share exactly
          1&minus;&gamma; and the &minus;3.9pp target is hit by algebra. The cost is that the{' '}
          <b>demand-composition channel is absent</b> — with one good, spending cannot shift from what gets
          automated toward what stays scarce (Moll &amp; Imas&rsquo;s Assumption 2), so on that point these
          runs are no better than Anthropic&rsquo;s one-good model. OG-UK&rsquo;s 8-sector build carries the
          channel, but its transition diverges past t&asymp;7.
        </li>
        <li id="caveat-displacement">
          <b>No displacement channel.</b> No unemployment, no search frictions, no occupational split, no
          household-level distinction between labour and capital taxation. So neither scenario speaks to
          displacement, and OG-UK cannot test the OBR&rsquo;s central fiscal claim: &ldquo;reduced
          tax-richness&rdquo; comes from labour income being taxed more heavily than the capital income
          replacing it. That is a PolicyEngine question, not an OG-UK one.
        </li>
      </ol>
    ),
  },
  {
    title: 'Caveats on how to read the charts',
    content: (
      <ol className="caveat-list" start={5}>
        <li id="caveat-window">
          <b>The window stops at 2029 for UK-only results.</b> OG-UK sets <code>tG1 = 4</code>, so in 2030
          government spending switches from a fixed share of GDP to a debt-targeting rule and investment
          absorbs the jump as the residual — in every arm, including the no-AI baseline. 2030 Government and
          Investment figures are artefacts of that rule, not AI effects, and are not reported. GDP and the
          labour share are unaffected and are shown at 2030 only where Anthropic&rsquo;s 2030 endpoints
          require it.
        </li>
        <li id="caveat-anticipation">
          <b>2026 differences are perfect-foresight anticipation.</b> &gamma; and Z are at their baseline
          values at t=0; apart from each arm&rsquo;s own G/Y (caveat 1), the shocked arms differ in 2026
          because households and firms see the ramp coming.
        </li>
        <li id="caveat-us">
          <b>US paths are 2030 endpoints only.</b> Anthropic publishes nothing for 2026&ndash;2029; the dashed
          US lines (in the collapsed GDP-paths chart) are our interpolation, and the comparison is
          cross-country and cross-model (OG-UK is OLG with UK demographics and a tax system;
          Anthropic&rsquo;s is a five-year US scenario device with neither).
        </li>
        <li id="caveat-nominal">
          <b>The OBR GDP line in the 2000&ndash;2029 chart is in cash terms.</b> The scenario paths are
          rebased to it at 2026 and then grow at the model&rsquo;s real rates, so from 2026 the OBR forecast
          is drawn dotted and is not comparable with them. The % of GDP panels are ratios, so this does not
          apply to them in the same way.
        </li>
        <li id="caveat-substantial">
          <b>&ldquo;Anthropic&rdquo; means the SUBSTANTIAL column</b> of Korinek et al. (2026) Table 3 —
          their middle case, not modest and not extreme.
        </li>
        <li id="caveat-z">
          <b>Z is a normalisation constant.</b> It absorbs the units of K/L, which are arbitrary in the model,
          so its level — including both solved values sitting below 1 — carries no economic meaning. Only
          the targets it is solved for do. (Anthropic&rsquo;s own model is task-based, with elasticity
          &sigma; = 0.5 across tasks; their &epsilon; = 3 is the capital-supply elasticity.)
        </li>
      </ol>
    ),
  },
];

const i = (text, cls = 'info', icon = '\\(\\to\\)') => ({ icon, text, cls });

export const STORY_PANELS = [
  { title: 'Production with AI', badge: 'Step 1', sections: [
    { label: 'Technology (1-sector, ε = 1)', type: 'math', equations: [
      { label: 'Output', tex: 'Y_t = Z_t\\,K_t^{\\gamma_t}\\,\\bigl(e^{g_y t}L_t\\bigr)^{1-\\gamma_t}' },
      { label: 'Labour share', tex: '\\frac{wL}{Y} = 1-\\gamma_t' },
    ]},
    { label: 'The two AI parameters', type: 'math', equations: [
      { label: 'Automation, 2026 → 2030', tex: `\\gamma_t = ${G0} \\to ${G1} \\quad (\\Delta = ${DG})` },
      { label: 'Labour share', tex: '65\\% \\to 61.1\\% \\quad (-3.9\\text{pp})' },
      { label: 'Productivity', tex: 'Z_t = 1 \\to Z^{*} \\quad \\text{(solved per scenario)}' },
    ]},
  ]},
  { title: 'Channel coverage', badge: 'Step 2', sections: [
    { label: 'Modelled', type: 'output', lines: [
      i('Automation — \\(\\gamma\\) ramps', 'accent', '✓'),
      i('Productivity — \\(Z\\) solved to target', 'accent', '✓'),
      i('Capital accumulation — endogenous', 'accent', '✓'),
    ]},
    { label: 'Partly', type: 'output', lines: [
      i('Adoption and diffusion — folded into the ramps', 'info', '~'),
    ]},
    { label: 'Not modelled', type: 'output', lines: [
      i('Unemployment and search', 'warn', '✗'),
      i('New tasks for people', 'warn', '✗'),
      i('Which goods get cheaper (needs multi-sector)', 'warn', '✗'),
    ]},
  ]},
  { title: 'UK, no AI', badge: 'Baseline', sections: [
    { label: 'Parameters, every year', type: 'math', equations: [
      { label: '', tex: `\\varepsilon = 1,\\quad \\gamma = ${G0},\\quad Z = 1` },
      { label: 'Labour share', tex: '1-\\gamma = 65\\%' },
    ]},
    { label: 'Role', type: 'output', lines: [
      i('Every other path is measured against this one'),
      i('OBR-based productivity growth, ONS demographics, current tax system'),
    ]},
  ]},
  { title: 'UK, OBR displacement', badge: 'EFO Box 2.2', sections: [
    { label: 'Target: no gain at fixed inputs', type: 'math', equations: [
      { label: 'At baseline K₀, L₀', tex: `Z^{\\text{OBR}} K_0^{${G1}} L_0^{${(1 - G1).toFixed(3)}} = K_0^{${G0}} L_0^{${(1 - G0).toFixed(2)}}` },
      { label: 'Solved', tex: `Z^{\\text{OBR}} = (K_0/L_0)^{-${DG}} = ${Z_OBR}` },
    ]},
    { label: 'Source vs these runs', type: 'output', lines: [
      i('Lower labour share — yes, \\(-3.9\\)pp imposed', 'accent', '✓'),
      i(`GDP level unchanged — only at fixed inputs; in equilibrium ${signed(OBR_Y_2030)}% by 2030`, 'info', '~'),
      i('Unemployment to 5.5% — no counterpart', 'warn', '✗'),
      i('Reduced tax-richness — not testable here', 'warn', '✗'),
    ]},
  ]},
  { title: 'UK, Anthropic substantial', badge: 'Korinek et al. T3', sections: [
    { label: 'Target: +3.1% measured TFP', type: 'math', equations: [
      { label: 'At baseline K₀, L₀', tex: `\\frac{Z^{\\text{A}} K_0^{${G1}} L_0^{${(1 - G1).toFixed(3)}}}{K_0^{${G0}} L_0^{${(1 - G0).toFixed(2)}}} = 1.031` },
      { label: 'Solved', tex: `Z^{\\text{A}} = 1.031\\,(K_0/L_0)^{-${DG}} = ${Z_ANTH}` },
    ]},
    { label: 'Source vs these runs', type: 'output', lines: [
      i('Labour share \\(-3.9\\)pp — imposed (UK 65% → 61.1%)', 'accent', '✓'),
      i('Measured TFP +3.1% — solved jointly with \\(\\gamma\\)', 'accent', '✓'),
      i('GDP +8.3%, growth 5.4% — outputs, compared on Results', 'info', '→'),
      i('Cognitive unemployment 4.5%, wage split — no counterpart', 'warn', '✗'),
    ]},
  ]},
  { title: 'US reference paths', badge: 'not run here', sections: [
    { label: 'What is published', type: 'output', lines: [
      i('Four US scenarios: No AI, Modest, Substantial, Extreme'),
      i('2030 endpoints only (Table 3)'),
      i('2026–2029 dashed lines are our interpolation', 'warn', '!'),
      i('Drawn as hollow dots / dashed lines on Results'),
    ]},
  ]},
  { title: 'Same γ, different Z', badge: 'Step 7', sections: [
    { label: 'Units: K₀/L₀ is arbitrary', type: 'math', equations: [
      { label: 'Output gain from γ alone, at K₀/L₀', tex: `(K_0/L_0)^{${DG}} - 1 = ${(D.assum.gamma_only_output_gain * 100).toFixed(2)}\\%,\\quad K_0/L_0 = ${KL.toFixed(4)}` },
    ]},
    { label: 'The only differences between arms', type: 'output', lines: [
      i('Same \\(\\gamma\\) path in both UK scenarios', 'accent', '='),
      i(`\\(Z^{*}\\): ${Z_ANTH} (Anthropic) vs ${Z_OBR} (OBR)`, 'accent', '≠'),
      i('Each arm’s own G/Y — caveat 1', 'warn', '≠'),
    ]},
  ]},
  { title: 'Affects every number', badge: 'Caveats 1–4', sections: [
    { label: 'Checklist', type: 'output', lines: [
      i('Fiscal policy differs by arm from 2026 (alpha_G)', 'warn', '1'),
      i('g_y_annual = 1.1% sourcing error', 'warn', '2'),
      i('1-sector: no demand-composition channel', 'warn', '3'),
      i('No displacement or unemployment', 'warn', '4'),
    ]},
  ]},
  { title: 'How to read the charts', badge: 'Caveats 5–10', sections: [
    { label: 'Checklist', type: 'output', lines: [
      i('UK-only window ends 2029 (tG1 = 4)', 'info', '5'),
      i('2026 gaps are anticipation', 'info', '6'),
      i('US: 2030 endpoints only', 'info', '7'),
      i('OBR GDP line is in cash terms', 'info', '8'),
      i('“Anthropic” = substantial column', 'info', '9'),
      i('Z level has no meaning, only its target', 'info', '10'),
    ]},
  ]},
];
