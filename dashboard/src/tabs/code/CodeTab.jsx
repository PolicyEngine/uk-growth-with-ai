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
import MF from '@/data/methodFacts.json';
import { VERSIONS, VINTAGES, RELEASES, ledger, ledgerTable, LAST_UPDATED, HAS_CHECKS, version } from './ledger.js';
import OnThisPage from '@/components/ui/OnThisPage.jsx';
import { Items, WhyChain } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import IconText from '@/tabs/method/IconText.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { REF, SP_HELPER, STEPS } from './pipeline.js';

// Code: Reproduce (before you start, the 2028-surprise pipeline as connected
// nodes, what the outputs are) and Use OG-UK (the general workflow).
// Commands are checked against the scripts and CLI; see pipeline.js.

const SECTIONS = [
  { id: 'before', title: 'Reproduce the results', icon: iconFor('prerequisite') },
  { id: 'pipeline', title: 'Run it step by step', icon: iconFor('pipeline') },
  { id: 'outputs', title: 'Outputs and checks', icon: iconFor('check') },
  { id: 'vintages', title: 'Data vintages and versions', icon: iconFor('data') },
  { id: 'ledger', title: 'Source ledger', icon: iconFor('ledger') },
  { id: 'cite', title: 'Cite this work', icon: iconFor('source') },
  { id: 'changelog', title: 'Changelog', icon: iconFor('revision') },
  { id: 'use-oguk', title: 'Use OG-UK yourself', icon: iconFor('code') },
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
      icon={iconFor('prerequisite')}
      title="Before you start"
      className="mx-before"
      foot={
        <>
          <Disclosure inCard title={<IconText icon="install">Install the model</IconText>} preview="Clone, OG-Core 0.17.0, OG-UK d0e6ae5">
            <CopyBlock code={INSTALL} />
          </Disclosure>
          <Disclosure inCard title={<IconText icon="code">Patch OG-Core for a time-varying γ</IconText>} preview="Runs refuse to start without it">
            <Items
              items={[
                { icon: 'model', text: <>Stock OG-Core holds &gamma; fixed over time.</> },
                { icon: 'code', text: <>The {ext(URLS.patch, 'patch')} adds a time dimension ({ext(URLS.patchDoc, 'design')}).</> },
              ]}
            />
            <CopyBlock code={PATCH} />
          </Disclosure>
          <Disclosure inCard title={<IconText icon="prerequisite">Environment</IconText>} preview="Tokens, Hugging Face cache, Dask">
            <CopyBlock code={ENV} />
          </Disclosure>
          <Disclosure inCard title={<IconText icon="code">The sp helper used below</IconText>} preview="Runs the CLI as the driver does">
            <CopyBlock code={SP_HELPER} />
          </Disclosure>
        </>
      }
    >
      <div className="mx-before-grid">
        <div>
          <p className="mx-kicker">
            <IconText icon="version">Versions used</IconText>
          </p>
          <dl className="mx-versions" data-reference="">
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
          <p className="mx-kicker">
            <IconText icon="prerequisite">You need</IconText>
          </p>
          {/* elapsed_min over the solve records in analysis/surprise/output: methodFacts.json solve_minutes */}
          <Items
            items={[
              { icon: 'prerequisite', text: 'A Hugging Face read token, as HF_TOKEN and HUGGING_FACE_TOKEN.' },
              { icon: 'data', text: 'The R1–R4 baselines in WORK: each closure’s baseline_p1 pickles.' },
              { icon: 'measure', text: 'About 15 GB of memory for a specification build.' },
              {
                icon: 'timing',
                text: (
                  <>
                    Solves: median {MF.solve_minutes.median.toFixed(1)} minutes, {MF.solve_minutes.min.toFixed(1)} to{' '}
                    {MF.solve_minutes.max.toFixed(1)} across {MF.solve_minutes.records} committed solve records.
                  </>
                ),
              },
            ]}
          />
        </div>
      </div>
    </InfoCard>
  );
}

function PipelineMap() {
  return (
    <InfoCard icon={iconFor('pipeline')} title="The 2028-surprise pipeline" className="mx-pipemap">
      <p>
        <IconText icon="stages">Nine steps, in order. Choose one for its file and commands.</IconText>
      </p>
      <nav aria-label="Pipeline steps">
      <ol className="mx-pipe-row">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <NavLink tab="method" sub="code" anchor={s.id} className="mx-pipe-node">
              <span className="mx-pipe-n">{i + 1}</span>
              <Icon name={iconFor(s.icon)} size={18} />
              <span className="mx-pipe-label">{s.short}</span>
            </NavLink>
          </li>
        ))}
      </ol>
      </nav>
      <Items
        className="mx-pipe-items"
        items={[
          { icon: 'data', text: <>Output: <code>dashboard/src/data/surprise2028.json</code>, the only file Explore&rsquo;s results views read.</> },
          { icon: 'households', text: <>Who gains reads <code>cohorts2028.json</code>, from <code>paper/cohort_welfare.py --json</code>.</> },
        ]}
      />
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
            icon={iconFor(s.icon)}
            title={s.title}
            morePreview={`Commands · ${firstCommand(s.code)}`}
            more={
              <>
                <Items items={s.more.map((m) => ({ key: m, icon: 'caveat', text: m }))} />
                <CopyBlock code={s.code} />
              </>
            }
          >
            <a className="mx-file" href={s.file.endsWith('zk0.1') ? tree(s.file) : blob(s.file)} target="_blank" rel="noreferrer">
              <Icon name="github" size={14} />
              <code>{s.file}</code>
            </a>
            <p>
              <IconText icon="stages">{s.line}</IconText>
            </p>
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
      icon: 'install',
      title: 'Install',
      line: [
        { icon: 'install', text: 'Install OG-UK from PSLmodels with uv.' },
        { icon: 'version', text: 'It needs Python 3.11 or later.' },
      ],
      code: OG_INSTALL,
      preview: 'git clone, uv sync, token',
    },
    {
      icon: 'scenario',
      title: 'Define a reform',
      line: [{ icon: 'rule', text: 'A PolicyEngine policy: a parameter, a value and a start date.' }],
      code: REFORM_PY,
      preview: 'reform.py',
      lang: 'py',
    },
    {
      icon: 'breakEven',
      title: 'Solve the steady state',
      line: [
        { icon: 'equation', text: 'Solve the baseline and the reform.' },
        { icon: 'compare', text: 'Then compare the long run.' },
      ],
      code: SS_PY,
      preview: 'steady_state.py, a few minutes',
      lang: 'py',
    },
    {
      icon: 'path',
      title: 'Run the transition path',
      line: [
        { icon: 'path', text: 'The year-by-year path.' },
        { icon: 'generations', text: 'Dask spreads the cohorts across cores.' },
      ],
      code: TPI_PY,
      preview: 'transition.py',
      lang: 'py',
    },
    {
      icon: 'model',
      title: 'More sectors',
      line: [{ icon: 'code', text: 'Pass multi_sector=True for the eight-sector build.' }],
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
            icon={iconFor(c.icon)}
            title={c.title}
            more={<CopyBlock code={c.code} lang={c.lang || 'bash'} />}
            morePreview={`Code · ${c.preview}`}
          >
            <Items items={c.line} />
          </InfoCard>
        ))}
        <InfoCard icon={iconFor('source')} title="Documentation">
          <Items
            items={[
              { icon: 'link', text: <>Theory and API: {ext(URLS.ogCoreDocs, 'OG-Core')} and {ext('https://pslmodels.github.io/OG-UK', 'OG-UK')} documentation.</> },
            ]}
          />
        </InfoCard>
      </div>
    </>
  );
}

function Vintages() {
  return (
    <div className="cards-stack">
      <InfoCard icon={iconFor('data')} title="Data files" id="data-files">
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
      <div className="cards-grid">
      <InfoCard icon={iconFor('version')} title="Model versions" id="model-versions">
        <dl className="mx-versions" data-reference="">
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
      <InfoCard icon={iconFor('period')} title="Official releases (ONS, OBR, DSIT)" id="releases">
        <ul className="ledger-releases" data-reference="">
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
    </div>
  );
}

function Ledger() {
  const rows = ledger();
  const groups = [...new Set(rows.map((r) => r.group))];
  return (
    <Card
      id="source-ledger"
      icon={iconFor('ledger')}
      title="Source ledger"
      finding={<IconText icon="ledger">Every figure or group of figures, with its source, vintage and last check, read from the data files.</IconText>}
      logo={false}
      aboutTitle="About this table"
      about={{
        how: (
          <Items
            items={
              HAS_CHECKS
                ? [
                    { icon: 'period', text: 'Each official figure the story prints is listed with its release.' },
                    { icon: 'check', text: 'And the second, independent read of its primary file (ukContextChecks.json).' },
                    { icon: 'data', text: 'The rest come from each data file.' },
                  ]
                : [
                    { icon: 'data', text: 'Built from each data file’s own source fields.' },
                    { icon: 'check', text: 'Official figures will also carry the checks in ukContextChecks.json.' },
                  ]
            }
          />
        ),
        caveats: (
          <Items
            items={[
              { icon: 'source', text: 'Published studies were checked against the primary text (PR #37, then #41).' },
              { icon: 'period', text: 'The location in each source is given as its vintage.' },
            ]}
          />
        ),
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
                    <td>
                      {r.checked ?? '—'}
                      {r.how ? <span className="ledger-where">Second read: {r.how}</span> : null}
                    </td>
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
      <InfoCard icon={iconFor('source')} title="Citation" id="citation">
        <p className="cite-text">
          <IconText icon="source">{CITE_TEXT}</IconText>
        </p>
        <CopyBlock code={CITE_BIB} lang="text" />
      </InfoCard>
      <InfoCard icon={iconFor('limit')} title="Known limitations" id="known-limits">
        <Items
          items={[
            { icon: 'model', text: 'OG-UK: one sector, no unemployment, imposed technology paths, perfect foresight.' },
            { icon: 'tax', text: 'Its tax effect is likely too small.' },
            {
              icon: 'link',
              text: (
                <>
                  Each is stated once:{' '}
                  <NavLink tab="method" sub="how" anchor="m-limits">
                    Method, limitations
                  </NavLink>
                  .
                </>
              ),
            },
            {
              icon: 'provisional',
              text: (
                <>
                  The household study is one year and provisional:{' '}
                  <NavLink tab="method" sub="households">
                    Household method
                  </NavLink>
                  .
                </>
              ),
            },
          ]}
        />
      </InfoCard>
    </div>
  );
}

const Entry = ({ e }) => (
  <li>
    <span className="mx-history-date">{longDate(e.date)}</span>
    <span>
      {e.text} {ext(`${REPO}/commit/${e.commit}`, e.commit)}
    </span>
  </li>
);
const RECENT = 8;

function Changelog() {
  const [recent, older] = [CHANGELOG.entries.slice(0, RECENT), CHANGELOG.entries.slice(RECENT)];
  return (
    <div className="info-card mx-card mx-history" data-reference="">
      <ol className="mx-history-list">
        {recent.map((e) => (
          <Entry key={e.commit} e={e} />
        ))}
      </ol>
      {older.length ? (
        <Disclosure inCard title={<IconText icon="revision">Earlier changes</IconText>} preview={`${older.length} more, back to ${longDate(older[older.length - 1].date)}`}>
          <ol className="mx-history-list">
            {older.map((e) => (
              <Entry key={e.commit} e={e} />
            ))}
          </ol>
        </Disclosure>
      ) : null}
    </div>
  );
}

export default function CodeTab() {
  return (
    <div className="page-with-contents mx-tab mx-code">
      <OnThisPage tab="method" sub="code" sections={SECTIONS} label="Code contents" />
      <div className="page-body">
        <PageIntro icon={iconFor('code')} question="Can I check and reproduce these results?" answer={<IconText icon="check">Yes. The solves, the data files and the scripts that build every page are committed.</IconText>}>
          <WhyChain
            label="From a clean machine to the pages"
            links={[
              { icon: 'install', text: 'Install the model' },
              { icon: 'code', text: 'Patch OG-Core' },
              { icon: 'pipeline', text: 'Run the pipeline' },
              { icon: 'check', text: 'Check the numbers' },
              { icon: 'data', text: 'Build the pages' },
            ]}
          />
          <p className="updated-stamp">
            <Icon name="calendar" size={14} />
            <span>
              Data last updated <time dateTime={LAST_UPDATED}>{longDate(LAST_UPDATED)}</time>
            </span>
          </p>
        </PageIntro>
        <section>
          <SectionHeading id="before" icon={iconFor('prerequisite')} title="Reproduce the results">
            <IconText icon="code">Everything here comes from {ext(REPO, 'uk-growth-with-ai')}. The solves are committed, so the pages rebuild without the model.</IconText>
          </SectionHeading>
          <BeforeYouStart />
        </section>
        <section>
          <SectionHeading id="pipeline" icon={iconFor('pipeline')} title="Run it step by step">
            <IconText icon="stages">Each step has its file, one sentence and its commands.</IconText>
          </SectionHeading>
          <PipelineMap />
          <PipelineSteps />
        </section>
        <section>
          <SectionHeading id="outputs" icon={iconFor('check')} title="Outputs and checks">
            <IconText icon="measure">What the numbers are in, and how they are checked.</IconText>
          </SectionHeading>
          <div className="cards-grid">
            <InfoCard icon={iconFor('measure')} title="Model units, not pounds" id="units">
              <Items
                items={[
                  { icon: 'measure', text: 'Solver outputs are in model units.' },
                  { icon: 'path', text: 'This study reports gaps against the OBR-central path instead.' },
                  { icon: 'cost', text: 'OG-UK’s map functions scale units to £bn by one ONS GDP anchor.' },
                ]}
              />
            </InfoCard>
            <InfoCard icon={iconFor('check')} title="Check the numbers">
              <Items
                items={[
                  { icon: 'check', text: <>Every finished gap is checked against its raw solve: {ext(blob('dashboard/scripts/check_numbers.py'), 'check_numbers.py')}.</> },
                  { icon: 'data', text: 'The build also runs asserts on the data file.' },
                ]}
              />
            </InfoCard>
          </div>
        </section>
        <section>
          <SectionHeading id="vintages" icon={iconFor('data')} title="Data vintages and versions">
            <IconText icon="release">Which data, model and release each page is built from, read from the data files.</IconText>
          </SectionHeading>
          <Vintages />
        </section>
        <section>
          <SectionHeading id="ledger" icon={iconFor('ledger')} title="Source ledger">
            <IconText icon="source">Where each figure comes from and when it was checked.</IconText>
          </SectionHeading>
          <Ledger />
        </section>
        <section>
          <SectionHeading id="cite" icon={iconFor('source')} title="Cite this work">
            <IconText icon="source">A citation, and the limitations to cite with it.</IconText>
          </SectionHeading>
          <Cite />
        </section>
        <section>
          <SectionHeading id="changelog" icon={iconFor('revision')} title="Changelog">
            <IconText icon="revision">What changed on the site, newest first. Model decisions are on{' '}
            <NavLink tab="method" sub="how" anchor="m-history">
              Method, revision history
            </NavLink>
            .</IconText>
          </SectionHeading>
          <Changelog />
        </section>
        <section>
          <SectionHeading id="use-oguk" icon={iconFor('code')} title="Use OG-UK yourself">
            <IconText icon="install">The general workflow for any UK tax or benefit reform. It uses PSLmodels/OG-UK.</IconText>
          </SectionHeading>
          <UseOguk />
        </section>
      </div>
    </div>
  );
}
