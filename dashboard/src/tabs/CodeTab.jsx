'use client';

import { useEffect, useState } from 'react';
import CodeBlock from '../components/CodeBlock.jsx';
import TerminalBlock from '../components/TerminalBlock.jsx';

const INSTALL_BASH = `git clone https://github.com/PSLmodels/OG-UK.git
cd OG-UK
uv sync`;

const HF_TOKEN_BASH = `export HUGGING_FACE_TOKEN=hf_your_token_here`;

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

from og_dashboard.reform import REFORM

baseline = solve_steady_state(start_year=2026)
reform   = solve_steady_state(start_year=2026, policy=REFORM)

impact = map_to_real_world(baseline, reform)

print(f"GDP:         £{impact.gdp:,.1f}bn  ({impact.gdp_pct:+.3f}%)")
print(f"Tax revenue: £{impact.tax_revenue:,.1f}bn  ({impact.tax_revenue_pct:+.3f}%)")
print(f"Investment:  £{impact.investment:,.1f}bn  ({impact.investment_pct:+.3f}%)")
print(f"Interest:    {impact.r_baseline:.2%} -> {impact.r_reform:.2%}")`;

const TERMINAL = [
  [['Solving baseline steady state (age_specific=\'pooled\', 1-sector)...', 'term-dim']],
  [['  Done in 71.4s', 'term-dim']],
  [['Solving reform steady state (age_specific=\'pooled\', 1-sector)...', 'term-dim']],
  [['  Done in 38.2s', 'term-dim']],
  '',
  [['Steady state impact (£bn, current prices)', 'term-em']],
  [['============================================================', 'term-dim']],
  'Variable          Baseline       Reform     Change        %',
  [['------------------------------------------------------------', 'term-dim']],
  [['GDP                2853.8       2852.6     '], ['  -1.2   -0.043%', 'term-neg']],
  [['Consumption        1819.4       1817.2     '], ['  -2.2   -0.121%', 'term-neg']],
  [['Investment          469.1        466.2     '], ['  -2.9   -0.612%', 'term-neg']],
  [['Government          564.4        565.5     '], ['  +1.1   +0.198%', 'term-pos']],
  [['Tax revenue        1036.4       1051.7     '], [' +15.3   +1.473%', 'term-pos']],
  [['Debt               2691.4       2691.0     '], ['  -0.4   -0.014%', 'term-neg']],
  '',
  'Interest rate:  3.84% -> 3.87%',
];

const TPI_PY = `from dask.distributed import Client
from oguk import run_transition_path, map_transition_to_real_world

from og_dashboard.reform import REFORM

client = Client(n_workers=2, threads_per_worker=1, memory_limit="2GB")

base_tp, reform_tp = run_transition_path(
    start_year=2026,
    policy=REFORM,
    client=client,
)

client.close()

impact = map_transition_to_real_world(base_tp, reform_tp)

# First ten years of GDP and tax-revenue impacts
for i in range(10):
    print(
        f"{impact.years[i]}  "
        f"ΔGDP {impact.gdp_change[i]:+6.2f}  "
        f"ΔRevenue {impact.tax_revenue_change[i]:+6.2f}"
    )`;

const FIELDS_PY = `impact = map_transition_to_real_world(base_tp, reform_tp)

impact.years              # fiscal-year strings: ["2026-27", ..., "2085-86"]
impact.gdp                # reform GDP path (£bn, per year)
impact.gdp_change         # £bn change vs baseline, per year
impact.tax_revenue_change
impact.consumption_change
impact.investment_change
impact.government_change
impact.debt_change

# Interest-rate paths live on the TPI results themselves
base_tp.r, reform_tp.r    # baseline / reform r(t)`;

const MULTI_PY = `base_tp, reform_tp = run_transition_path(
    start_year=2026,
    policy=REFORM,
    client=client,
    multi_sector=True,    # 8-sector CES production
)`;

const LS_TERMINAL = [
  [['$ tree python/', 'term-em']],
  'python/',
  '├── pyproject.toml',
  '├── og_dashboard/',
  '│   ├── __init__.py',
  '│   └── reform.py',
  '└── scripts/',
  '    ├── 01_install.sh',
  '    ├── 03_steady_state.py',
  '    ├── 04_transition.py',
  '    └── 06_multi_sector.py',
];

const STEPS = [
  {
    title: 'Install',
    prose: (
      <>
        <p>
          OG-UK uses <a href="https://docs.astral.sh/uv/" target="_blank" rel="noreferrer">uv</a>, a fast
          Python package manager. With Python 3.11+ and uv on your machine, three commands are enough — see
          the panel on the right.
        </p>
        <p>
          OG-UK pulls the PolicyEngine UK microdata from HuggingFace, so set a token once with read access
          to <code>policyengine/policyengine-uk-data</code>.
        </p>
        <p>
          With that done, <code>uv run python scripts/03_steady_state.py</code> solves a baseline and a
          reform steady state and prints the impact in £bn.
        </p>
      </>
    ),
    panel: [
      { type: 'code', filename: 'terminal', lang: 'bash', content: INSTALL_BASH },
      { type: 'code', filename: 'terminal', lang: 'bash', content: HF_TOKEN_BASH },
    ],
  },
  {
    title: 'Define a reform',
    prose: (
      <>
        <p>
          Reforms use the <strong>PolicyEngine</strong> API: pick a parameter from the UK tax-and-benefit
          rule book, give it a new value and a start date. Anything PolicyEngine can represent — rates,
          thresholds, allowance tapers, new benefits — flows straight through.
        </p>
        <p>
          To simulate a different reform, swap the parameter path and value. The rest of the pipeline does
          not change.
        </p>
      </>
    ),
    panel: [{ type: 'code', filename: 'python/og_dashboard/reform.py', lang: 'py', content: REFORM_PY }],
  },
  {
    title: 'Solve the long-run steady state',
    prose: (
      <>
        <p>
          The fastest way to see what a reform does. <code>solve_steady_state</code> finds the long-run
          equilibrium of the UK economy under a given policy: the prices, quantities and tax revenues that
          emerge once the economy has fully adjusted. Run it once for the baseline, once for the reform; the
          difference gives the answer.
        </p>
        <p>
          A typical run takes a couple of minutes on a laptop. The terminal output on the right is{' '}
          <em>illustrative</em> — the format matches <code>03_steady_state.py</code>, but the numbers depend
          on the calibration date and your data release.
        </p>
      </>
    ),
    panel: [
      { type: 'code', filename: 'python/scripts/03_steady_state.py', lang: 'py', content: SS_PY },
      { type: 'terminal', lines: TERMINAL },
    ],
  },
  {
    title: 'Run the year-by-year transition path',
    prose: (
      <>
        <p>
          The steady state tells you where the economy ends up. The <strong>transition path</strong> tells
          you how it gets there — year by year, 60&nbsp;periods by default (configurable). This is what
          powers the dashed lines in the <strong>Showcase</strong> tab.
        </p>
        <p>
          The transition costs more compute — the model solves every cohort&rsquo;s lifetime under rational
          expectations — so OG-UK uses{' '}
          <a href="https://www.dask.org/" target="_blank" rel="noreferrer">Dask</a> to parallelise across CPU
          cores.
        </p>
      </>
    ),
    panel: [{ type: 'code', filename: 'python/scripts/04_transition.py', lang: 'py', content: TPI_PY }],
  },
  {
    title: 'From abstract units to pounds',
    prose: (
      <>
        <p>
          OG-UK solves in dimensionless model units. To translate them into figures a policymaker can read —
          billions of pounds, percentages of GDP — the model anchors its steady-state GDP to the ONS figure
          and scales every other variable in proportion.
        </p>
        <p>
          Each attribute returns as a NumPy array indexed by year — ready for a Plotly chart, a pandas
          DataFrame, or whatever else you like.
        </p>
      </>
    ),
    panel: [{ type: 'code', filename: 'oguk/api.py', lang: 'py', content: FIELDS_PY }],
  },
  {
    title: 'Bring in the eight industry sectors',
    prose: (
      <>
        <p>
          Pass <code>multi_sector=True</code> and the same call returns the breakdown across the eight UK
          industry sectors (energy, manufacturing, construction, trade &amp; transport, info &amp; finance,
          real estate, business services, public &amp; other) — the basis for the <em>industry by
          industry</em> view in the Showcase tab.
        </p>
        <p>The same call returns sector-level output, capital and labour alongside the macro aggregates.</p>
      </>
    ),
    panel: [{ type: 'code', filename: 'python/scripts/06_multi_sector.py', lang: 'py', content: MULTI_PY }],
  },
  {
    title: 'Where to go next',
    prose: (
      <>
        <p>
          Every step above ships as a runnable file in this repo&rsquo;s{' '}
          <code>python/</code> folder — the panel on the right shows the layout. Pick the script that matches
          the step you want and run it on its own:
        </p>
        <ul className="intro-list">
          <li>
            <code>scripts/03_steady_state.py</code> — fastest, prints a one-line £bn impact summary.
          </li>
          <li>
            <code>scripts/04_transition.py</code> — heavier, produces the full year-by-year path.
          </li>
          <li>
            <code>scripts/06_multi_sector.py</code> — the 8-sector calibration behind the Showcase-tab
            industry views.
          </li>
        </ul>
        <p>
          Edit <code>og_dashboard/reform.py</code> to swap the parameter, value or start date. Every script
          imports <code>REFORM</code> from there, so the rest of the pipeline stays unchanged. For more
          variations, the upstream{' '}
          <a href="https://github.com/PSLmodels/OG-UK/tree/main/examples" target="_blank" rel="noreferrer">
            OG-UK examples
          </a>{' '}
          directory carries additional pipelines (<code>run_oguk_fast_tpi.py</code>,{' '}
          <code>run_oguk_fast_sector.py</code>, <code>plot.py</code>). Full API reference and theory
          documentation:{' '}
          <a href="https://pslmodels.github.io/OG-UK" target="_blank" rel="noreferrer">
            pslmodels.github.io/OG-UK
          </a>
          .
        </p>
      </>
    ),
    panel: [{ type: 'terminal', lines: LS_TERMINAL }],
  },
];

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
      const offset = window.innerHeight * 0.33;
      let n = 0;
      for (let i = 0; i < STEPS.length; i++) {
        const el = document.getElementById(`code-step-${i + 1}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top < offset) n = i;
      }
      setActive(n);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <>
      <div className="code-intro">
        <h2>From a few lines of Python to a full UK transition path</h2>
        <p>
          OG-UK is open source, and every Code-tab step that carries logic ships as a runnable file in this
          repo&rsquo;s <code>python/</code> folder. Scroll through the seven steps below; the panel on the
          right shows the code for whichever step you are reading, and the filename label points to the same
          file on disk. Pick a step, run it on its own, swap the reform. Full context lives in{' '}
          <a href="https://github.com/PSLmodels/OG-UK" target="_blank" rel="noreferrer">PSL&rsquo;s OG-UK repository</a>.
        </p>
      </div>

      <div className="scrollytelling-container">
        <div className="scrolly-narrative code-narrative">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`narrative-step${i === active ? ' active' : ''}`}
              id={`code-step-${i + 1}`}
            >
              <div className="step-header">
                <div className="step-number">{i + 1}</div>
                <div className="step-title">{step.title}</div>
              </div>
              <div className="step-content">{step.prose}</div>
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
