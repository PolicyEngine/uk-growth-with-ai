'use client';

import Icon from '@/components/ab/Icon.jsx';
import InfoCard from '@/components/ab/InfoCard.jsx';
import CopyBlock from '@/components/ab/CopyBlock.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import { S } from '@/tabs/ai/surprise.js';
import { REPO, URLS } from '@/tabs/ai/links.js';
import { ext, scrollToId } from '../shared/ui.jsx';
import SubTabs, { SubTabPanel, useSubTabParam } from '../shared/subtabs.jsx';
import { REF, SP_HELPER, STEPS } from './pipeline.js';

// Code: Reproduce (before you start, the 2028-surprise pipeline as connected
// nodes, what the outputs are) and Use OG-UK (the general workflow).
// Commands are checked against the scripts and CLI; see pipeline.js.

export const CODE_SUBS = [
  { id: 'reproduce', label: 'Reproduce', icon: 'repeat' },
  { id: 'oguk', label: 'Use OG-UK', icon: 'code' },
];

const firstCommand = (code) => code.split('\n').find((l) => l.trim() && !l.trim().startsWith('#')).replace(/\s+#.*$/, '').replace(/\s*\\$/, '');
const blob = (p) => `${REPO}/blob/${REF}/${p}`;
const tree = (p) => `${REPO}/tree/${REF}/${p}`;

const INSTALL = `git clone ${REPO}.git && cd uk-growth-with-ai
pip install -e ".[test]"
pip install "ogcore==0.17.0"
git clone https://github.com/vahid-ahmadi/OG-UK.git
git -C OG-UK checkout d0e6ae535da4ffbface55f0e64fb2074583a46a6
pip install -e OG-UK`;

const PATCH = `SITE=$(python -c "import ogcore, os; print(os.path.dirname(os.path.dirname(ogcore.__file__)))")
python -c "import ogcore; assert ogcore.__version__ == '0.17.0', ogcore.__version__"
patch -d "$SITE" -p1 --dry-run < patches/ogcore-0.17.0-firm-gamma-tv.diff
patch -d "$SITE" -p1 < patches/ogcore-0.17.0-firm-gamma-tv.diff`;

const ENV = `export HF_TOKEN=hf_your_token HUGGING_FACE_TOKEN=hf_your_token   # read access to PolicyEngine UK data
export HF_HUB_DISABLE_SHARED_BLOBS=1
export DASK_DISTRIBUTED__SCHEDULER__WORKER_TTL=None
: > "$WORK/un_api_token.txt"   # empty: demographics from the GitHub mirror, as every run so far`;

const VERSIONS = [
  ['Python', '3.13.15'],
  ['OG-Core', '0.17.0, plus the γ patch'],
  ['OG-UK', 'vahid-ahmadi/OG-UK at d0e6ae5'],
  ['policyengine', '5.0.4'],
  ['policyengine-uk', '2.90.2'],
  ['NumPy, pandas', '2.3.5, 3.0.5'],
];

function BeforeYouStart() {
  return (
    <div className="info-card mx-card mx-before" id="before">
      <h3 className="info-card-title">
        <Icon name="key" size={18} />
        <span>Before you start</span>
      </h3>
      <div className="mx-before-grid">
        <div>
          <p className="mx-kicker">Versions used</p>
          <dl className="mx-versions">
            {VERSIONS.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{k === 'OG-UK' ? ext(URLS.ogUkFork, v) : v}</dd>
              </div>
            ))}
            <div>
              <dt>Dashboard data</dt>
              <dd>
                {S.generated_utc} from {S.source_commit}
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <p className="mx-kicker">You need</p>
          <ul className="mx-needs">
            <li>A Hugging Face token with read access, set as both HF_TOKEN and HUGGING_FACE_TOKEN.</li>
            <li>The R1–R4 baselines in WORK: each closure&rsquo;s baseline_p1 pickles.</li>
            {/* elapsed_min over the 38 solve records in analysis/surprise/output (zk0.1, zk0, zk0.5) at 524849d: 6.5 to 8.7, median 6.8 */}
            <li>About 15 GB of memory for a specification build; about seven minutes a solve (6.5 to 8.7 across the committed solves).</li>
          </ul>
        </div>
      </div>
      <Disclosure inCard title="Install the model" preview="Clone, OG-Core 0.17.0, OG-UK d0e6ae5">
        <CopyBlock code={INSTALL} />
      </Disclosure>
      <Disclosure inCard title="Patch OG-Core for a time-varying γ" preview="Runs refuse to start without it">
        <p className="mx-fold-p">
          Stock OG-Core holds &gamma; fixed over time. The {ext(URLS.patch, 'patch')} adds a time dimension (
          {ext(URLS.patchDoc, 'design')}).
        </p>
        <CopyBlock code={PATCH} />
      </Disclosure>
      <Disclosure inCard title="Environment" preview="Tokens, Hugging Face cache, Dask">
        <CopyBlock code={ENV} />
      </Disclosure>
      <Disclosure inCard title="The sp helper used below" preview="Runs the CLI as the driver does">
        <CopyBlock code={SP_HELPER} />
      </Disclosure>
    </div>
  );
}

function PipelineMap() {
  return (
    <nav className="info-card mx-card mx-pipemap" aria-label="Pipeline">
      <div className="mx-fig-cap">
        <span className="mx-fig-title">The 2028-surprise pipeline</span>
        <span className="mx-fig-sub">Nine steps, in order. Choose one for its file and commands.</span>
      </div>
      <ol className="mx-pipe-row">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="mx-pipe-node"
              onClick={(e) => {
                e.preventDefault();
                scrollToId(s.id);
              }}
            >
              <span className="mx-pipe-n">{i + 1}</span>
              <Icon name={s.icon} size={18} />
              <span className="mx-pipe-label">{s.short}</span>
            </a>
          </li>
        ))}
      </ol>
      <p className="mx-pipe-out">
        <Icon name="arrowDown" size={14} />
        <span>
          Output: <code>dashboard/src/data/surprise2028.json</code>, the only file the Results tab reads. Cohorts reads{' '}
          <code>cohorts2028.json</code>, written by <code>paper/cohort_welfare.py --json</code>.
        </span>
      </p>
    </nav>
  );
}

function PipelineSteps() {
  return (
    <ol className="mx-pipe-steps">
      {STEPS.map((s, i) => (
        <li key={s.id} id={s.id} className="mx-pipe-step" tabIndex={-1}>
          <span className="mx-pipe-dot" aria-hidden="true">
            {i + 1}
          </span>
          <div className="info-card mx-card">
            <h3 className="info-card-title">
              <Icon name={s.icon} size={18} />
              <span>{s.title}</span>
            </h3>
            <div className="info-card-body">
              <a className="mx-file" href={s.file.endsWith('zk0.1') ? tree(s.file) : blob(s.file)} target="_blank" rel="noreferrer">
                <Icon name="github" size={14} />
                <code>{s.file}</code>
              </a>
              <p>{s.line}</p>
            </div>
            <Disclosure inCard title="Commands and detail" preview={firstCommand(s.code)}>
              {s.more.map((m) => (
                <p key={m} className="mx-fold-p">
                  {m}
                </p>
              ))}
              <CopyBlock code={s.code} />
            </Disclosure>
          </div>
        </li>
      ))}
    </ol>
  );
}

const OG_INSTALL = `git clone https://github.com/PSLmodels/OG-UK.git
cd OG-UK
uv sync
export HUGGING_FACE_TOKEN=hf_your_token   # read access to PolicyEngine UK data`;

const REFORM_PY = `from datetime import datetime
from policyengine.core import ParameterValue, Policy
from policyengine.tax_benefit_models.uk import uk_latest

# Raise the basic rate of income tax from 20% to 21%
basic_rate = uk_latest.get_parameter("gov.hmrc.income_tax.rates.uk[0].rate")
REFORM = Policy(
    name="Basic rate 21%",
    parameter_values=[
        ParameterValue(parameter=basic_rate, value=0.21, start_date=datetime(2026, 1, 1)),
    ],
)`;

const SS_PY = `from oguk import solve_steady_state, map_to_real_world

baseline = solve_steady_state(start_year=2026)
reform = solve_steady_state(start_year=2026, policy=REFORM)
impact = map_to_real_world(baseline, reform)
print(f"GDP {impact.gdp_pct:+.3f}%  tax revenue {impact.tax_revenue_pct:+.3f}%")`;

const TPI_PY = `from dask.distributed import Client
from oguk import run_transition_path, map_transition_to_real_world

client = Client(n_workers=2, threads_per_worker=1, memory_limit="2GB")
base_tp, reform_tp = run_transition_path(start_year=2026, policy=REFORM, client=client)
client.close()
impact = map_transition_to_real_world(base_tp, reform_tp)
impact.years, impact.gdp_change, impact.tax_revenue_change   # £bn by year`;

const MULTI_PY = `base_tp, reform_tp = run_transition_path(
    start_year=2026, policy=REFORM, client=client,
    multi_sector=True,   # eight-sector production; not used in this study
)`;

function UseOguk() {
  const cards = [
    {
      icon: 'download',
      title: 'Install',
      line: 'Install OG-UK from PSLmodels with uv. It needs Python 3.11 or later.',
      code: OG_INSTALL,
      preview: 'git clone, uv sync, token',
    },
    {
      icon: 'sliders',
      title: 'Define a reform',
      line: 'A reform is a PolicyEngine policy: a parameter, a value and a start date.',
      code: REFORM_PY,
      preview: 'reform.py',
      lang: 'py',
    },
    {
      icon: 'target',
      title: 'Solve the steady state',
      line: 'Solve the baseline and the reform, then compare the long run.',
      code: SS_PY,
      preview: 'steady_state.py, a few minutes',
      lang: 'py',
    },
    {
      icon: 'trend',
      title: 'Run the transition path',
      line: 'The year-by-year path. Dask spreads the cohorts across cores.',
      code: TPI_PY,
      preview: 'transition.py',
      lang: 'py',
    },
    {
      icon: 'layers',
      title: 'More sectors',
      line: 'Pass multi_sector=True for the eight-sector build.',
      code: MULTI_PY,
      preview: 'multi_sector.py',
      lang: 'py',
    },
  ];
  return (
    <>
      <div className="card-grid cols-2 mx-oguk">
        {cards.map((c) => (
          <InfoCard
            key={c.title}
            icon={c.icon}
            title={c.title}
            className="mx-card"
            more={<CopyBlock code={c.code} lang={c.lang || 'bash'} />}
            moreTitle="Code"
            morePreview={c.preview}
          >
            <p>{c.line}</p>
          </InfoCard>
        ))}
        <InfoCard icon="book" title="Documentation" className="mx-card">
          <p>
            Theory and API: {ext(URLS.ogCoreDocs, 'OG-Core')} and {ext('https://pslmodels.github.io/OG-UK', 'OG-UK')}{' '}
            documentation.
          </p>
        </InfoCard>
      </div>
    </>
  );
}

export default function CodeTab({ active = true }) {
  const [sub, setSub] = useSubTabParam(CODE_SUBS.map((t) => t.id), active);
  return (
    <div className="mx-tab mx-code">
      <SubTabs
        tabs={CODE_SUBS.map((t) => ({ value: t.id, label: t.label, icon: t.icon }))}
        value={sub}
        onChange={setSub}
        ariaLabel="Code sections"
        idPrefix="csub"
      />
      <SubTabPanel idPrefix="csub" value={sub}>
        {sub === 'reproduce' ? (
          <>
            <header className="mx-intro">
              <h2>Reproduce the results</h2>
              <p>
                Everything here comes from {ext(REPO, 'uk-growth-with-ai')}. The solves are committed, so the pages
                rebuild without the model.
              </p>
            </header>
            <BeforeYouStart />
            <PipelineMap />
            <PipelineSteps />
            <div className="card-grid cols-2">
              <InfoCard icon="ruler" title="Model units, not pounds" className="mx-card" id="units">
                <p>Solver outputs are in model units. This study reports gaps against the OBR-central path instead.</p>
                <p className="mx-sub">OG-UK&rsquo;s map functions scale units to £bn by one ONS GDP anchor.</p>
              </InfoCard>
              <InfoCard icon="flask" title="Check the numbers" className="mx-card">
                <p>
                  Every finished gap is compared with its raw solve by{' '}
                  {ext(blob('dashboard/scripts/check_numbers.py'), 'check_numbers.py')}.
                </p>
                <p className="mx-sub">The build also runs asserts on the data file.</p>
              </InfoCard>
            </div>
          </>
        ) : null}
        {sub === 'oguk' ? (
          <>
            <header className="mx-intro">
              <h2>Use OG-UK yourself</h2>
              <p>The general workflow for any UK tax or benefit reform. It uses PSLmodels/OG-UK.</p>
            </header>
            <UseOguk />
          </>
        ) : null}
      </SubTabPanel>
    </div>
  );
}
