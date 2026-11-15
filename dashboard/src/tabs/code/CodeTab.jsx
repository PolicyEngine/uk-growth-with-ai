'use client';

import Icon from '@/components/ab/Icon.jsx';
import CopyBlock from '@/components/ab/CopyBlock.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import { S } from '@/tabs/ai/surprise.js';
import { REPO, URLS } from '@/tabs/ai/links.js';
import { ext } from '../shared/ui.jsx';
import Card, { InfoCard, SectionHeading } from '@/components/ui/Card.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import CHANGELOG from '@/data/site-changelog.json';
import { VERSIONS, VINTAGES, RELEASES, ledger, ledgerTable, LAST_UPDATED, HAS_CHECKS, version } from './ledger.js';
import OnThisPage from '@/components/ui/OnThisPage.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { REF, SP_HELPER, STEPS } from './pipeline.js';

// Code: Reproduce (before you start, the 2028-surprise pipeline as connected
// nodes, what the outputs are) and Use OG-UK (the general workflow).
// Commands are checked against the scripts and CLI; see pipeline.js.

const SECTIONS = [
  { id: 'before', title: 'Reproduce the results', icon: 'key' },
  { id: 'pipeline', title: 'Run it step by step', icon: 'gitBranch' },
  { id: 'outputs', title: 'Outputs and checks', icon: 'flask' },
  { id: 'vintages', title: 'Data vintages and versions', icon: 'database' },
  { id: 'ledger', title: 'Source ledger', icon: 'list' },
  { id: 'cite', title: 'Cite this work', icon: 'fileText' },
  { id: 'changelog', title: 'Changelog', icon: 'history' },
  { id: 'use-oguk', title: 'Use OG-UK yourself', icon: 'code' },
];
const SITE_URL = 'https://uk-growth-with-ai.vercel.app';
const longDate = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

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

function BeforeYouStart() {
  return (
    <InfoCard
      icon="key"
      title="Before you start"
      className="mx-before"
      foot={
        <>
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
        </>
      }
    >
      <div className="mx-before-grid">
        <div>
          <p className="mx-kicker">Versions used</p>
          <dl className="mx-versions">
            {VERSIONS.filter((e) => e.id !== 'solves').map((e) => (
              <div key={e.id}>
                <dt>{e.label}</dt>
                <dd>{e.url ? ext(e.url, e.value) : e.value}</dd>
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
    </InfoCard>
  );
}

function PipelineMap() {
  return (
    <InfoCard icon="gitBranch" title="The 2028-surprise pipeline" className="mx-pipemap">
      <p>Nine steps, in order. Choose one for its file and commands.</p>
      <nav aria-label="Pipeline steps">
      <ol className="mx-pipe-row">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <NavLink tab="method" sub="code" anchor={s.id} className="mx-pipe-node">
              <span className="mx-pipe-n">{i + 1}</span>
              <Icon name={s.icon} size={18} />
              <span className="mx-pipe-label">{s.short}</span>
            </NavLink>
          </li>
        ))}
      </ol>
      </nav>
      <p className="mx-pipe-out">
        <Icon name="arrowDown" size={14} />
        <span>
          Output: <code>dashboard/src/data/surprise2028.json</code>, the only file Explore’s results views read. Who gains reads{' '}
          <code>cohorts2028.json</code>, written by <code>paper/cohort_welfare.py --json</code>.
        </span>
      </p>
    </InfoCard>
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
          <InfoCard
            icon={s.icon}
            title={s.title}
            morePreview={`Commands · ${firstCommand(s.code)}`}
            more={
              <>
                {s.more.map((m) => (
                  <p key={m} className="mx-fold-p">
                    {m}
                  </p>
                ))}
                <CopyBlock code={s.code} />
              </>
            }
          >
            <a className="mx-file" href={s.file.endsWith('zk0.1') ? tree(s.file) : blob(s.file)} target="_blank" rel="noreferrer">
              <Icon name="github" size={14} />
              <code>{s.file}</code>
            </a>
            <p>{s.line}</p>
          </InfoCard>
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
      <div className="cards-grid mx-oguk">
        {cards.map((c) => (
          <InfoCard
            key={c.title}
            icon={c.icon}
            title={c.title}
            more={<CopyBlock code={c.code} lang={c.lang || 'bash'} />}
            morePreview={`Code · ${c.preview}`}
          >
            <p>{c.line}</p>
          </InfoCard>
        ))}
        <InfoCard icon="book" title="Documentation">
          <p>
            Theory and API: {ext(URLS.ogCoreDocs, 'OG-Core')} and {ext('https://pslmodels.github.io/OG-UK', 'OG-UK')}{' '}
            documentation.
          </p>
        </InfoCard>
      </div>
    </>
  );
}

function Vintages() {
  return (
    <div className="cards-grid">
      <InfoCard icon="database" title="Data files" id="data-files">
        <div className="table-wrap">
          <table className="data-table ledger-table">
            <caption className="visually-hidden">Each data file, what it feeds and its vintage</caption>
            <thead>
              <tr>
                <th scope="col">File</th>
                <th scope="col">Feeds</th>
                <th scope="col">Vintage</th>
                <th scope="col">Built or read</th>
              </tr>
            </thead>
            <tbody>
              {VINTAGES.map((v) => (
                <tr key={v.file}>
                  <th scope="row">
                    <code>{v.file}</code>
                  </th>
                  <td>{v.what}</td>
                  <td>{v.vintage}</td>
                  <td>{v.date ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoCard>
      <InfoCard icon="package" title="Model versions" id="model-versions">
        <dl className="mx-versions">
          {VERSIONS.map((e) => (
            <div key={e.id}>
              <dt>{e.label}</dt>
              <dd>
                {e.url ? ext(e.url, e.value) : e.value}
                <span className="ledger-where">{e.where}</span>
              </dd>
            </div>
          ))}
        </dl>
      </InfoCard>
      <InfoCard icon="calendar" title="Official releases (ONS, OBR, DSIT)" id="releases">
        <ul className="ledger-releases">
          {RELEASES.map((r) => (
            <li key={r.id}>
              <span className="ledger-date">{r.released}</span>
              <span>
                {ext(r.url, `${r.publisher}: ${r.title}`)}
                {r.series ? <span className="ledger-where">{r.series}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </InfoCard>
    </div>
  );
}

function Ledger() {
  const rows = ledger();
  const groups = [...new Set(rows.map((r) => r.group))];
  return (
    <Card
      id="source-ledger"
      icon="list"
      title="Source ledger"
      finding="Every figure on the site, or group of figures, with its source, its vintage and the date it was last checked, read from the data files' own source fields."
      logo={false}
      aboutTitle="About this table"
      about={{
        how: HAS_CHECKS
          ? 'Official figures carry the release date and check recorded in ukContextChecks.json; the rest come from each data file.'
          : 'Built from each data file’s own source fields. Official figures will also carry the checks in ukContextChecks.json once that file is part of the build.',
        caveats: 'Published studies were checked against the primary text in the literature note (PR #37, then #41); the location in each source is given as its vintage.',
      }}
      download={{ title: 'Source ledger', context: `Data last updated ${LAST_UPDATED}`, table: ledgerTable }}
    >
      <div className="table-wrap ledger-wrap">
        <table className="data-table ledger-table">
          <caption className="visually-hidden">Source ledger</caption>
          <thead>
            <tr>
              <th scope="col">Figure</th>
              <th scope="col">Source</th>
              <th scope="col">Vintage</th>
              <th scope="col">Date checked</th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g}>
              <tr className="table-group">
                <th colSpan={4} scope="colgroup">
                  {g}
                </th>
              </tr>
              {rows
                .filter((r) => r.group === g)
                .map((r, i) => (
                  <tr key={`${g}-${i}`}>
                    <th scope="row">{r.figure}</th>
                    <td>{r.url ? ext(r.url, r.source) : r.source}</td>
                    <td>{r.vintage}</td>
                    <td>{r.checked ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          ))}
        </table>
      </div>
    </Card>
  );
}

const year = LAST_UPDATED.slice(0, 4);
const CITE_TEXT = `PolicyEngine (${year}). The macroeconomic effects of AI on the UK. Interactive dashboard, data updated ${LAST_UPDATED}; OG-UK solves ${version('solves').value}. ${SITE_URL}`;
const CITE_BIB = `@misc{policyengine_ai_uk_${year},
  author       = {{PolicyEngine}},
  title        = {The macroeconomic effects of {AI} on the {UK}},
  year         = {${year}},
  howpublished = {Interactive dashboard},
  url          = {${SITE_URL}},
  note         = {Data updated ${LAST_UPDATED}; OG-UK solves ${version('solves').value}; code at ${REPO}}
}`;

function Cite() {
  return (
    <div className="cards-grid">
      <InfoCard icon="fileText" title="Citation" id="citation">
        <p className="cite-text">{CITE_TEXT}</p>
        <CopyBlock code={CITE_BIB} lang="text" />
      </InfoCard>
      <InfoCard icon="alert" title="Known limitations" id="known-limits">
        <p>
          OG-UK has one sector, no unemployment, imposed technology paths and perfect foresight; its tax effect is likely too small. Each is
          stated once, on{' '}
          <NavLink tab="method" sub="how" anchor="m-limits">
            Method, limitations
          </NavLink>
          . The household study is one year and provisional:{' '}
          <NavLink tab="method" sub="households">
            Household method
          </NavLink>
          .
        </p>
      </InfoCard>
    </div>
  );
}

function Changelog() {
  return (
    <div className="info-card mx-card mx-history">
      <ol className="mx-history-list">
        {CHANGELOG.entries.map((e) => (
          <li key={e.commit}>
            <span className="mx-history-date">{longDate(e.date)}</span>
            <span>
              {e.text} {ext(`${REPO}/commit/${e.commit}`, e.commit)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function CodeTab() {
  return (
    <div className="page-with-contents mx-tab mx-code">
      <OnThisPage tab="method" sub="code" sections={SECTIONS} label="Code contents" />
      <div className="page-body">
        <PageIntro icon="code" question="Can I check and reproduce these results?" answer="Yes. The solves, the data files and the scripts that build every page are committed; below are the steps, the versions used, where every figure comes from and how to cite it.">
          <p className="updated-stamp">
            <Icon name="calendar" size={14} />
            <span>
              Data last updated <time dateTime={LAST_UPDATED}>{longDate(LAST_UPDATED)}</time>
            </span>
          </p>
        </PageIntro>
        <section>
          <SectionHeading id="before" icon="repeat" title="Reproduce the results">
            Everything here comes from {ext(REPO, 'uk-growth-with-ai')}. The solves are committed, so the pages rebuild without the model.
          </SectionHeading>
          <BeforeYouStart />
        </section>
        <section>
          <SectionHeading id="pipeline" icon="gitBranch" title="Run it step by step">
            Each step has its file, one sentence and its commands.
          </SectionHeading>
          <PipelineMap />
          <PipelineSteps />
        </section>
        <section>
          <SectionHeading id="outputs" icon="flask" title="Outputs and checks">
            What the numbers are in, and how they are checked.
          </SectionHeading>
          <div className="cards-grid">
            <InfoCard icon="ruler" title="Model units, not pounds" id="units">
              <p>Solver outputs are in model units. This study reports gaps against the OBR-central path instead.</p>
              <p className="mx-sub">OG-UK&rsquo;s map functions scale units to £bn by one ONS GDP anchor.</p>
            </InfoCard>
            <InfoCard icon="flask" title="Check the numbers">
              <p>
                Every finished gap is compared with its raw solve by{' '}
                {ext(blob('dashboard/scripts/check_numbers.py'), 'check_numbers.py')}.
              </p>
              <p className="mx-sub">The build also runs asserts on the data file.</p>
            </InfoCard>
          </div>
        </section>
        <section>
          <SectionHeading id="vintages" icon="database" title="Data vintages and versions">
            Which data, model and release each page is built from, read from the data files.
          </SectionHeading>
          <Vintages />
        </section>
        <section>
          <SectionHeading id="ledger" icon="list" title="Source ledger">
            Where each figure comes from and when it was checked.
          </SectionHeading>
          <Ledger />
        </section>
        <section>
          <SectionHeading id="cite" icon="fileText" title="Cite this work">
            A citation, and the limitations to cite with it.
          </SectionHeading>
          <Cite />
        </section>
        <section>
          <SectionHeading id="changelog" icon="history" title="Changelog">
            What changed on the site, newest first. Model decisions are on{' '}
            <NavLink tab="method" sub="how" anchor="m-history">
              Method, revision history
            </NavLink>
            .
          </SectionHeading>
          <Changelog />
        </section>
        <section>
          <SectionHeading id="use-oguk" icon="code" title="Use OG-UK yourself">
            The general workflow for any UK tax or benefit reform. It uses PSLmodels/OG-UK.
          </SectionHeading>
          <UseOguk />
        </section>
      </div>
    </div>
  );
}
