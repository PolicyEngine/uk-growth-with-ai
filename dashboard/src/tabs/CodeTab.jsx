'use client';

import { useEffect, useState } from 'react';
import CodeBlock from '../components/CodeBlock.jsx';
import TerminalBlock from '../components/TerminalBlock.jsx';

import { REPO, URLS, pr } from './ai/links.js';

// The real pipeline behind every number on the dashboard: install, patch
// OG-Core, run, check, build the dashboard data. Commands follow the
// repository README (branch fix/rerun-2-3-5, PR #11) and cli.py.
const ext = (href, text) => (
  <a href={href} target="_blank" rel="noreferrer">
    {text}
  </a>
);

const CLONE_BASH = `git clone ${REPO}.git
cd uk-growth-with-ai
git checkout fix/rerun-2-3-5   # until PR #11 is merged
pip install -e ".[test]"`;

const MODEL_BASH = `pip install "ogcore==0.17.0"
git clone https://github.com/vahid-ahmadi/OG-UK.git
git -C OG-UK checkout d0e6ae535da4ffbface55f0e64fb2074583a46a6
pip install -e OG-UK
export HUGGING_FACE_TOKEN=hf_your_token_here   # read access to PolicyEngine UK data`;

const PATCH_BASH = `SITE=$(python -c "import ogcore, os; print(os.path.dirname(os.path.dirname(ogcore.__file__)))")
python -c "import ogcore; assert ogcore.__version__ == '0.17.0', ogcore.__version__"
patch -d "$SITE" -p1 --dry-run < patches/ogcore-0.17.0-firm-gamma-tv.diff
patch -d "$SITE" -p1 < patches/ogcore-0.17.0-firm-gamma-tv.diff`;

const RUN_BASH = `# Main runs: baseline, Automation only, Automation + productivity (ramped)
python -m uk_growth_with_ai run --shapes ramp \\
    --out uk_growth_with_ai/data/scenarios.json

# Robustness run: government spending held at baseline levels
python -m uk_growth_with_ai run --shapes ramp --baseline-spending \\
    --out uk_growth_with_ai/data/scenarios_fixed_spending.json`;

const CHECK_BASH = `python -m uk_growth_with_ai check --results uk_growth_with_ai/data/scenarios.json
python -m uk_growth_with_ai report --arm anthropic_ramp
python -m uk_growth_with_ai obr`;

const DASH_BASH = `python -m uk_growth_with_ai dashboard          # writes dashboard/src/data/*.json
python -m uk_growth_with_ai dashboard --check  # exit 1 if the committed files are stale
python -m pytest

cd dashboard && bun install && bun run dev`;

const LAYOUT = [
  [['$ tree uk_growth_with_ai/', 'term-em']],
  'uk_growth_with_ai/',
  '├── scenarios.py       scenario definitions',
  '├── calibrate.py       the γ and Z solves',
  '├── solve.py           OG-UK runner: steady state and transition per scenario',
  '├── checks.py          validation checks',
  '├── obr.py             baseline against the OBR',
  '├── report.py          result tables',
  '├── dashboard_data.py  builds the dashboard JSON',
  '├── cli.py             run | report | obr | check | dashboard',
  '└── data/              scenarios.json, scenarios_fixed_spending.json, ...',
  'patches/ogcore-0.17.0-firm-gamma-tv.diff',
];

const REPORT_STEPS = [
  {
    title: 'Get the code',
    prose: (
      <>
        <p className="key-point">
          Everything on this dashboard is produced by the {ext(REPO, 'uk-growth-with-ai')} repository, with the
          results committed so the charts can be rebuilt without re-running the model.
        </p>
        <p>
          The re-run results live on the branch fix/rerun-2-3-5 ({ext(pr(11), 'PR #11')}) until it is merged. The
          package itself needs only NumPy, pandas and Dask; <code>report</code>, <code>obr</code> and{' '}
          <code>dashboard</code> work without the model installed.
        </p>
      </>
    ),
    panel: [{ type: 'code', filename: 'terminal', lang: 'bash', content: CLONE_BASH }],
  },
  {
    title: 'Install the model versions used',
    prose: (
      <>
        <p className="key-point">
          The results use OG-Core 0.17.0 and OG-UK at commit {ext(URLS.ogUkFork, 'd0e6ae5')}.
        </p>
        <p>
          OG-UK is installed from that commit rather than from {ext(URLS.ogUk, 'PSLmodels/OG-UK')}. It reads
          PolicyEngine UK microdata from Hugging Face, so a token with read access is needed once.
        </p>
      </>
    ),
    panel: [{ type: 'code', filename: 'terminal', lang: 'bash', content: MODEL_BASH }],
  },
  {
    title: 'Patch OG-Core for a time-varying γ',
    prose: (
      <>
        <p className="key-point">
          Stock OG-Core holds &gamma; fixed over time; the {ext(URLS.patch, 'patch')} lets it vary by year.
        </p>
        <p>
          The patch changes <code>ogcore/firm.py</code> in the installed package only; the design and its checks are
          in {ext(URLS.patchDoc, 'docs/firm_gamma_tv.md')}. <code>run</code> refuses to start if the firm block is
          unpatched.
        </p>
      </>
    ),
    panel: [{ type: 'code', filename: 'terminal', lang: 'bash', content: PATCH_BASH }],
  },
  {
    title: 'Run the scenarios',
    prose: (
      <>
        <p className="key-point">
          <code>run</code> solves the steady state and the transition path for the baseline and each AI scenario.
        </p>
        <ol className="txt-numbered">
          <li>
            The baseline is solved first; each AI scenario inherits its steady state, so all start from the same
            assets and debt ({ext(URLS.solve, 'solve.py')}).
          </li>
          <li>
            Z is solved against each scenario&rsquo;s target before the transition runs (
            {ext(URLS.calibrate, 'calibrate.py')}).
          </li>
          <li>
            <code>--baseline-spending</code> repeats the AI scenarios with government spending held at the
            baseline&rsquo;s levels, the robustness run for the fiscal convention.
          </li>
        </ol>
        <p>A full run takes several hours; add <code>--only anthropic</code> or <code>--only obr</code> to run one scenario.</p>
      </>
    ),
    panel: [{ type: 'code', filename: 'terminal', lang: 'bash', content: RUN_BASH }],
  },
  {
    title: 'Check the results',
    prose: (
      <>
        <p className="key-point">
          <code>check</code> runs the validation checks on a results file before anything is published.
        </p>
        <p>
          {ext(URLS.checks, 'checks.py')} tests the fiscal rule, the common spending share, the Z targets, the
          labour share and solution quality. <code>report</code> prints the year-by-year gaps for one scenario, and{' '}
          <code>obr</code> the baseline comparison with the OBR ({ext(URLS.obrPy, 'obr.py')}).
        </p>
      </>
    ),
    panel: [{ type: 'code', filename: 'terminal', lang: 'bash', content: CHECK_BASH }],
  },
  {
    title: 'Build the dashboard data',
    prose: (
      <>
        <p className="key-point">
          <code>dashboard</code> writes the two JSON files this site reads; they are generated, never edited by hand.
        </p>
        <p>
          {ext(URLS.dashboardData, 'dashboard_data.py')} builds <code>aiScenarios.json</code> (the model paths,
          including the fixed-spending run when present) and <code>ukAiPaths.json</code> (the OBR and ONS series).
          The test suite runs <code>dashboard --check</code>, so stale or hand-edited files fail.
        </p>
      </>
    ),
    panel: [
      { type: 'code', filename: 'terminal', lang: 'bash', content: DASH_BASH },
      { type: 'terminal', lines: LAYOUT },
    ],
  },
];


// Part 2: the general OG-UK workflow (from the earlier Code tab), for readers
// who want to run their own reforms. It uses PSLmodels/OG-UK; this report used
// the fork commit named in the footer.
const OGUK_INSTALL_BASH = `git clone https://github.com/PSLmodels/OG-UK.git
cd OG-UK
uv sync
export HUGGING_FACE_TOKEN=hf_your_token_here   # read access to PolicyEngine UK data`;

const REFORM_PY = `from datetime import datetime
from policyengine.core import ParameterValue, Policy
from policyengine.tax_benefit_models.uk import uk_latest

# Reform: raise the basic rate of income tax from 20% to 21%
basic_rate = uk_latest.get_parameter("gov.hmrc.income_tax.rates.uk[0].rate")

REFORM = Policy(
    name="Basic rate 21%",
    parameter_values=[
        ParameterValue(
            parameter=basic_rate,
            value=0.21,
            start_date=datetime(2026, 1, 1),
        )
    ],
)`;

const SS_PY = `from oguk import solve_steady_state, map_to_real_world

baseline = solve_steady_state(start_year=2026)
reform   = solve_steady_state(start_year=2026, policy=REFORM)

impact = map_to_real_world(baseline, reform)
print(f"GDP: {impact.gdp_pct:+.3f}%   Tax revenue: {impact.tax_revenue_pct:+.3f}%")`;

const TPI_PY = `from dask.distributed import Client
from oguk import run_transition_path, map_transition_to_real_world

client = Client(n_workers=2, threads_per_worker=1, memory_limit="2GB")
base_tp, reform_tp = run_transition_path(start_year=2026, policy=REFORM, client=client)
client.close()

impact = map_transition_to_real_world(base_tp, reform_tp)`;

const FIELDS_PY = `impact.years              # fiscal-year strings: ["2026-27", ...]
impact.gdp                # reform GDP path (£bn, per year)
impact.gdp_change         # £bn change against the baseline, per year
impact.tax_revenue_change
impact.consumption_change
impact.investment_change
impact.government_change
impact.debt_change

base_tp.r, reform_tp.r    # interest-rate paths`;

const MULTI_PY = `base_tp, reform_tp = run_transition_path(
    start_year=2026,
    policy=REFORM,
    client=client,
    multi_sector=True,    # eight-sector CES production
)`;

const GENERAL_STEPS = [
  {
    part: 'Using OG-UK',
    title: 'Install OG-UK',
    prose: (
      <>
        <p className="key-point">
          For your own analysis, install {ext(URLS.ogUk, 'OG-UK')} from PSLmodels with{' '}
          {ext('https://docs.astral.sh/uv/', 'uv')}; Python 3.11 or later is required.
        </p>
        <p>
          This report used the fork commit named in the footer. OG-UK reads PolicyEngine UK microdata from Hugging
          Face, so set a token with read access once.
        </p>
      </>
    ),
    panel: [{ type: 'code', filename: 'terminal', lang: 'bash', content: OGUK_INSTALL_BASH }],
  },
  {
    title: 'Define a reform',
    prose: (
      <>
        <p className="key-point">
          Reforms are PolicyEngine policies: a parameter from the UK tax-benefit rules, a new value and a start
          date.
        </p>
        <p>
          Anything PolicyEngine UK can represent &mdash; rates, thresholds, allowance tapers, new benefits &mdash;
          passes through; to change the reform, change the parameter path and value.
        </p>
      </>
    ),
    panel: [{ type: 'code', filename: 'reform.py', lang: 'py', content: REFORM_PY }],
  },
  {
    title: 'Solve the long-run steady state',
    prose: (
      <>
        <p className="key-point">
          <code>solve_steady_state</code> finds the long-run equilibrium under a policy; run it for the baseline
          and the reform and compare.
        </p>
        <p>A steady-state pair takes a few minutes on a laptop.</p>
      </>
    ),
    panel: [{ type: 'code', filename: 'steady_state.py', lang: 'py', content: SS_PY }],
  },
  {
    title: 'Run the transition path',
    prose: (
      <>
        <p className="key-point">
          The transition path gives the year-by-year adjustment from today to the steady state.
        </p>
        <p>
          It solves every cohort&rsquo;s lifetime under perfect foresight, so it is heavier; OG-UK uses{' '}
          {ext('https://www.dask.org/', 'Dask')} to spread the work across CPU cores.
        </p>
      </>
    ),
    panel: [{ type: 'code', filename: 'transition.py', lang: 'py', content: TPI_PY }],
  },
  {
    title: 'Read the outputs',
    prose: (
      <>
        <p className="key-point">
          Results come back as NumPy arrays by year, in pounds (the mapping is described under{' '}
          <a href="#methodology">Model</a>).
        </p>
        <p>
          Pass <code>multi_sector=True</code> for the eight-sector build (not used in this report). The full API
          and theory are in the {ext(URLS.ogCoreDocs, 'OG-Core documentation')} and the{' '}
          {ext('https://pslmodels.github.io/OG-UK', 'OG-UK documentation')}.
        </p>
      </>
    ),
    panel: [
      { type: 'code', filename: 'outputs.py', lang: 'py', content: FIELDS_PY },
      { type: 'code', filename: 'multi_sector.py', lang: 'py', content: MULTI_PY },
    ],
  },
];

const STEPS = [...REPORT_STEPS.map((st, i) => (i === 0 ? { ...st, part: 'Reproduce this report' } : st)), ...GENERAL_STEPS];

function PanelBody({ items }) {
  return (
    <>
      {items.map((it, i) =>
        it.type === 'code' ? (
          <CodeBlock key={i} filename={it.filename} lang={it.lang}>
            {it.content}
          </CodeBlock>
        ) : (
          <TerminalBlock key={i} lines={it.lines} />
        ),
      )}
    </>
  );
}

export default function CodeTab() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    function update() {
      // Reading line: a third of the way down, capped so a short step
      // parked just under the header still counts as the one being read.
      const offset = Math.min(window.innerHeight * 0.33, 260);
      let n = 0;
      for (let i = 0; i < STEPS.length; i++) {
        const el = document.getElementById(`code-step-${i + 1}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top < offset) n = i;
      }
      // Same rule as ScrollyStory: scrolled to the bottom means the last step.
      const doc = document.documentElement;
      const first = document.getElementById('code-step-1');
      if (first && first.offsetHeight > 0 && window.scrollY + window.innerHeight >= doc.scrollHeight - 2) {
        n = STEPS.length - 1;
      }
      setActive(n);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <>
      <div className="meth-intro">
        <h2>Code</h2>
        <p className="subtitle">
          How to reproduce every result, and how to use OG-UK for your own analysis.
        </p>
      </div>

      <div className="scrollytelling-container">
        <div className="scrolly-narrative code-narrative">
          {STEPS.map((step, i) => (
            <div key={i}>
              {step.part ? <h3 className="code-part">{step.part}</h3> : null}
              <div className={`narrative-step${i === active ? ' active' : ''}`} id={`code-step-${i + 1}`}>
              <div className="step-header">
                <div className="step-number">{i + 1}</div>
                <div className="step-title">{step.title}</div>
              </div>
                <div className="step-content">{step.prose}</div>
              </div>
            </div>
          ))}
        </div>

        <aside className="scrolly-sticky">
          <div className="example-panel">
            <div className="example-header">
              <span className="example-title">Code</span>
              <span className="example-badge">Step {active + 1}</span>
            </div>
            <div className="example-body">
              <PanelBody items={STEPS[active].panel} />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
