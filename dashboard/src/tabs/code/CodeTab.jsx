'use client';

import Icon from '@/components/ab/Icon.jsx';
import IconLine from '@/components/ui/IconLine.jsx';
import { SET, DATA_FILE } from '@/lib/dataKeys.js';
import { SURPRISE_YEAR } from '@/tabs/ai/surprise.js';
import CopyBlock from '@/components/ab/CopyBlock.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import { REPO, URLS, issue } from '@/tabs/ai/links.js';
import { ext } from '../shared/ui.jsx';
import Card, { InfoCard, SectionHeading } from '@/components/ui/Card.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import { MACRO_ABOUT } from '@/lib/labels.js';
import CHANGELOG from '@/data/site-changelog.json';
import { METHOD_FACTS as MF, setHas } from '@/lib/dataKeys.js';
import { MODEL_VERSIONS, VINTAGES, AI_FULL_RERUN, AI_STUDY, RELEASES, ledger, ledgerTable, LAST_UPDATED, longDate, version } from './ledger.js';
import { COMMIT as STUDY_COMMIT, REPO_URL as STUDY_REPO } from '@/tabs/story/part3/sources.jsx';
import { HISTORY } from './history.js';
import OnThisPage from '@/components/ui/OnThisPage.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import IconText from '@/tabs/method/IconText.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { REF, DASH_REF, SP_HELPER, STEPS } from './pipeline.js';
import HouseholdsDetail from '@/tabs/households/HouseholdsDetail.jsx';
import { CITE_BIB, CITE_TEXT } from './cite.js';
import MathSym, { mathNodes } from '@/components/ui/MathSym.jsx';

// Data and code (Method redesign, section 8; M15): three start cards (the
// repository, the data files, rerun it), then rerun the results (before you
// start, the pipeline's step cards, outputs and checks), the data files and
// versions (with the household study's result files, #detail-sources), the
// source ledger, the one changelog (model decisions and site changes), the
// general workflow for the macro model's package, and last the page's own
// citation. Commands are checked against the scripts and CLI; see
// pipeline.js. The rail lists six sections; #use-oguk sits between the
// changelog and the citation, not in it.

const SECTIONS = [
  { id: 'start', title: 'Start here', icon: iconFor('code') },
  { id: 'before', title: 'Rerun the results', icon: iconFor('prerequisite') },
  { id: 'vintages', title: 'Data files and versions', icon: iconFor('data') },
  { id: 'ledger', title: 'Source ledger', icon: iconFor('ledger') },
  { id: 'changelog', title: 'Changelog and revisions', icon: iconFor('revision') },
  { id: 'cite', title: 'Cite this work', icon: iconFor('source') },
];
const firstCommand = (code) => code.split('\n').find((l) => l.trim() && !l.trim().startsWith('#')).replace(/\s+#.*$/, '').replace(/\s*\\$/, '');
// dashboard files at the dashboard branch; the run's files at the set's ref
const refFor = (p) => (p.startsWith('dashboard/') ? DASH_REF : REF);
const blob = (p) => `${REPO}/blob/${refFor(p)}/${p}`;
const tree = (p) => `${REPO}/tree/${refFor(p)}/${p}`;

const INSTALL = `git clone ${REPO}.git && cd uk-growth-with-ai
pip install -e ".[test]"
pip install "ogcore==0.17.0"
git clone https://github.com/PSLmodels/OG-UK.git
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

// The solve-time sentence (elapsed_min over the solve records in
// analysis/surprise/output: methodFacts.json solve_minutes), on the Rerun
// it card, visible at rest (checks/cross_review.py reads its record count)
const SOLVE_TIMES = !setHas('methodFactsFile') ? (
  <>Solve times for the {SURPRISE_YEAR} runs are not compiled yet.</>
) : (
  <>
    Solves: median {MF.solve_minutes.median.toFixed(1)} minutes, {MF.solve_minutes.min.toFixed(1)} to {MF.solve_minutes.max.toFixed(1)} across {MF.solve_minutes.records} committed solve records.
  </>
);

// Start here: three text cards, no fold
const STUDY_TREE = `${STUDY_REPO}/tree/${STUDY_COMMIT}`;
function StartCards() {
  return (
    <div className="card-grid mx-start">
      <InfoCard icon={iconFor('code')} title="The repository" foot={<StartLink anchor="model-versions">Model versions</StartLink>}>
        <p>Code, solves and this site: {ext(REPO, 'uk-growth-with-ai')}</p>
        <p>Macro model solves at {version('solves').value}.</p>
        <p>
          Household study at{' '}
          <a href={STUDY_TREE} target="_blank" rel="noopener noreferrer">
            {AI_STUDY.commit.slice(0, 7)}
          </a>
          .
        </p>
        <CopyBlock code={`git clone ${REPO}.git`} />
      </InfoCard>
      <InfoCard icon={iconFor('data')} title="The data files" foot={<StartLink anchor="data-files">Data files and builds</StartLink>}>
        <p>{VINTAGES.length} files and builds feed the pages.</p>
        <p>Data last updated {longDate(LAST_UPDATED)}.</p>
      </InfoCard>
      <InfoCard icon={iconFor('pipeline')} title="Rerun it" foot={<StartLink anchor="before">Before you start</StartLink>}>
        <p>Install the model, patch OG-Core, run the pipeline, check the numbers, build the pages.</p>
        <p>{SOLVE_TIMES}</p>
      </InfoCard>
    </div>
  );
}
function StartLink({ anchor, children }) {
  return (
    <p className="mx-ov-link">
      <NavLink tab="method" sub="code" anchor={anchor}>
        {children} <Icon name="arrowRight" size={14} strokeWidth={2} />
      </NavLink>
    </p>
  );
}

function BeforeYouStart() {
  return (
    <InfoCard
      title="Before you start"
      className="mx-before"
      foot={
        <>
          {/* one More info, its four parts as bold row heads (review round 3,
              R3-13; preview allowed, C0 ruling 2) */}
          <Disclosure inCard title="More info" preview="Install, patch, environment and the sp helper">
            <div className="mx-before-part">
              <p className="mx-before-head">
                <b>Install the model.</b> Clone, <span data-package="">OG-Core 0.17.0, OG-UK d0e6ae5</span>.
              </p>
              <CopyBlock code={INSTALL} />
            </div>
            <div className="mx-before-part">
              <p className="mx-before-head">
                <b>Patch OG-Core for a time-varying <MathSym name="gamma" />.</b> Runs refuse to start without it.
              </p>
              <Items
                items={[
                  { icon: 'model', text: <>Stock OG-Core holds <MathSym name="gamma" /> fixed over time.</> },
                  { icon: 'code', text: <>The {ext(URLS.patch, 'patch')} adds a time dimension ({ext(URLS.patchDoc, 'design')}).</> },
                ]}
              />
              <CopyBlock code={PATCH} />
            </div>
            <div className="mx-before-part">
              <p className="mx-before-head">
                <b>Environment.</b> Tokens, Hugging Face cache, Dask.
              </p>
              <CopyBlock code={ENV} />
            </div>
            <div className="mx-before-part">
              <p className="mx-before-head">
                <b>The sp helper used below.</b> Runs the CLI as the driver does.
              </p>
              <CopyBlock code={SP_HELPER} />
            </div>
          </Disclosure>
        </>
      }
    >
      <div className="mx-before-grid">
        <div>
          <p className="mx-kicker">
            <IconText icon="version">Versions used</IconText>
          </p>
          <Items
            items={[
              {
                icon: 'link',
                text: (
                  <>
                    Every version and data build:{' '}
                    <NavLink tab="method" sub="code" anchor="vintages">
                      the vintages table
                    </NavLink>
                    .
                  </>
                ),
              },
            ]}
          />
        </div>
        <div>
          <p className="mx-kicker">
            <IconText icon="prerequisite">You need</IconText>
          </p>
          {/* the solve times moved to the Rerun it card (Start here) */}
          <Items
            items={[
              { icon: 'prerequisite', text: 'A Hugging Face read token, as HF_TOKEN and HUGGING_FACE_TOKEN.' },
              { icon: 'data', text: 'The R1–R4 baselines in WORK: each closure’s baseline_p1 pickles.' },
              { icon: 'measure', text: 'About 15 GB of memory for a specification build.' },
            ]}
          />
        </div>
      </div>
    </InfoCard>
  );
}

// What the pipeline writes (the pipeline map's two lines until the Method
// redesign removed the map: the nine step cards say the same)
const OUTPUT_LINES = [
  { icon: 'data', text: <>Output: <code>dashboard/src/data/{DATA_FILE}</code>, the only file Explore&rsquo;s results views read.</> },
  { icon: 'households', text: <>Who gains reads <code>{SET.cohorts}</code>, from <code>paper/cohort_welfare.py --json</code>.</> },
];

function PipelineSteps() {
  return (
    <ol className="mx-pipe-steps">
      {STEPS.map((s, i) => (
        <li key={s.id} id={s.id} className="mx-pipe-step" tabIndex={-1}>
          <span className="mx-pipe-dot" aria-hidden="true">
            {i + 1}
          </span>
          <InfoCard
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
        { icon: 'install', text: 'Install the macro model’s package from PSLmodels with uv.' },
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
            title={c.title}
            more={<CopyBlock code={c.code} lang={c.lang || 'bash'} />}
            morePreview={`Code · ${c.preview}`}
          >
            <Items items={c.line} />
          </InfoCard>
        ))}
        <InfoCard title="Documentation">
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

const MODEL_ICON = { 'Macro model': 'model', 'Household study': 'households' };
function ModelCell({ m }) {
  if (!MODEL_ICON[m]) return <span className="ledger-where">No model</span>;
  return (
    <span className="mx-model-cell">
      {m}
    </span>
  );
}

function Vintages() {
  return (
    <div className="cards-stack">
      <InfoCard title="Data files and builds" id="data-files">
        <div className="table-wrap">
          <table className="data-table ledger-table">
            <caption className="visually-hidden">Each data file or build, its model, what it feeds, its vintage, its release date and the code that reproduces it</caption>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">File or build</th>
                <th scope="col">Feeds</th>
                <th scope="col">Vintage</th>
                <th scope="col">Released</th>
                <th scope="col">Built or read</th>
                <th scope="col">Replicate</th>
              </tr>
            </thead>
            <tbody>
              {VINTAGES.map((v) => (
                <tr key={v.file}>
                  <td>
                    <ModelCell m={v.model} />
                  </td>
                  <th scope="row">{v.file.includes('.') ? <code>{v.file}</code> : v.file}</th>
                  <td>{v.what}</td>
                  <td>{v.url ? ext(v.url, v.vintage) : v.vintage}</td>
                  <td className="ledger-date-cell">{v.released ?? '—'}</td>
                  <td className="ledger-date-cell">{v.date ?? '—'}</td>
                  <td>
                    {v.code ? ext(v.code.url, v.code.label) : null}
                    {v.code && v.result ? ' · ' : null}
                    {v.result ? ext(v.result.url, v.result.label) : null}
                    {!v.code && !v.result ? '—' : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Items
          className="mx-foot-items"
          items={[
            AI_FULL_RERUN === false ? { icon: 'caveat', text: 'The household study: the manifest attests results without a clean-room rerun.' } : null,
            // results outside the attested rebuild, as the data file lists them
            AI_STUDY.outsideRebuild?.length ? { icon: 'provisional', text: `Outside that rebuild: ${AI_STUDY.outsideRebuild.join(', ')}.` } : null,
          ].filter(Boolean)}
        />
      </InfoCard>
      {/* the household study's result files and commit (#detail-sources;
          a Method sub-tab until the Method redesign) */}
      <HouseholdsDetail />
      {/* one column: the versions table needs the width, and the two cards
          differ in height by hundreds of pixels */}
      <div className="cards-grid mx-stack-grid">
      <InfoCard title="Model versions" id="model-versions">
        <div className="table-wrap">
          <table className="data-table ledger-table" data-reference="">
            <caption className="visually-hidden">Software versions, by model</caption>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Software</th>
                <th scope="col">Version</th>
              </tr>
            </thead>
            <tbody>
              {MODEL_VERSIONS.map((e) => (
                <tr key={e.id}>
                  <td>
                    <ModelCell m={e.model} />
                  </td>
                  <th scope="row" data-package="">{e.label}</th>
                  <td>
                    {e.url ? ext(e.url, mathNodes(e.value)) : mathNodes(e.value)}{' '}
                    <span className="ledger-where">{e.where}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoCard>
      <InfoCard title="Official releases (ONS, OBR, DSIT)" id="releases">
        <ul className="ledger-releases" data-reference="">
          {RELEASES.map((r) => (
            <li key={r.id}>
              <span className="ledger-date">
                Released {r.released}
                {r.fetched ? ' ' : null}
                {r.fetched ? <span className="ledger-where">Read {r.fetched}</span> : null}
              </span>{' '}
              <span>
                {ext(r.url, `${r.publisher}: ${r.title}`)}
                {r.series ? ' ' : null}
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

// How a figure was checked a second time, in words (review round 2, R2-14):
// the evidence map's "read" and "review" marks, or the official figure's
// own description of its second read.
function howChecked(how) {
  if (how === 'review') return 'Confirmed in the 15 Nov 2026 review';
  if (how === 'read') return 'Re-read in the primary text';
  return `Second read: ${how}`;
}

function Ledger() {
  const rows = ledger();
  const groups = [...new Set(rows.map((r) => r.group))];
  return (
    <Card
      id="source-ledger"
      icon={iconFor('ledger')}
      title="Source ledger"
      // its book icon holds links only (the card shell, push C): the code
      // that builds the ledger, so the card keeps its one button
      replication={{ code: 'https://github.com/PolicyEngine/uk-growth-with-ai/blob/dashboard/story/dashboard/src/tabs/code/ledger.js' }}
      finding={<IconText icon="ledger">Every figure or group of figures, with its source, vintage and last check, read from the data files.</IconText>}
      logo={false}
      aboutTitle="About this table"
      about={{
        how: (
          <Items
            items={[
              { icon: 'period', text: 'Each official figure the story prints is listed with its release.' },
              { icon: 'check', text: 'And the second, independent read of its primary file (ukContextChecks.json).' },
              { icon: 'data', text: 'The rest come from each data file.' },
            ]}
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
      <div className="table-wrap ledger-wrap" data-no-axes="A table of sources">
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
                      {r.how ? (
                        <>
                          {' '}
                          <span className="ledger-where">{howChecked(r.how)}</span>
                        </>
                      ) : null}
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

function Cite() {
  return (
    <div className="cards-grid mx-cite-grid">
      <InfoCard title="Citation" id="citation">
        <p className="cite-text">
          <IconText icon="source">{CITE_TEXT}</IconText>
        </p>
        <CopyBlock code={CITE_BIB} lang="text" />
      </InfoCard>
      <InfoCard title="Known limitations" id="known-limits">
        <Items
          items={[
            {
              icon: 'model',
              text: (
                <>
                  Macro model:{' '}
                  <NavLink tab="method" sub="how" anchor="m-limits">
                    the limitations grid
                  </NavLink>
                  .
                </>
              ),
            },
            {
              icon: 'households',
              text: (
                <>
                  The household study:{' '}
                  <NavLink tab="method" sub="households" anchor="hm-out">
                    what it leaves out
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
    <span className="mx-history-date">{longDate(e.date)}</span>{' '}
    <span>
      {mathNodes(e.text)} {ext(`${REPO}/commit/${e.commit}`, e.commit)}
    </span>
  </li>
);
const RECENT = 8;

// Model decisions (the revision history, each on the tracker), then the
// site's changes: one list, in Data and code.
function Revisions() {
  return (
    <div className="info-card mx-card mx-history" id="revisions">
      <h3 className="info-card-title">
        <Icon name={iconFor('revision')} size={18} />
        <span>Model decisions</span>
      </h3>
      <ol className="mx-history-list" data-reference="">
        {HISTORY.map(([d, , t, n], i) => (
          <li key={i}>
            <span className="mx-history-date">{d}</span>{' '}
            <span className="mx-history-text">
              <span>
                {mathNodes(t)} {ext(issue(n), `#${n}`)}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Changelog() {
  const [recent, older] = [CHANGELOG.entries.slice(0, RECENT), CHANGELOG.entries.slice(RECENT)];
  return (
    <div className="info-card mx-card mx-history" data-reference="">
      <h3 className="info-card-title">
        <Icon name={iconFor('code')} size={18} />
        <span>Site changes</span>
      </h3>
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
          <IconLine icon="calendar" className="updated-stamp">
            Data last updated <time dateTime={LAST_UPDATED}>{longDate(LAST_UPDATED)}</time>
          </IconLine>
        </PageIntro>
        <section>
          <SectionHeading id="start" icon={iconFor('code')} title="Start here" />
          <StartCards />
        </section>
        <section>
          <SectionHeading id="before" icon={iconFor('prerequisite')} title="Rerun the results">
            <IconText icon="code">Everything here comes from {ext(REPO, 'uk-growth-with-ai')}. The macro model is {MACRO_ABOUT}; its solves are committed, so pages rebuild without it.</IconText>
          </SectionHeading>
          <BeforeYouStart />
          <div className="section-heading mx-subhead" id="pipeline" tabIndex={-1}>
            <div className="section-heading-text">
              <h3>Run it step by step</h3>
              <p>
                <IconText icon="stages">Each step has its file, one sentence and its commands.</IconText>
              </p>
            </div>
          </div>
          <PipelineSteps />
          <div className="section-heading mx-subhead" id="outputs" tabIndex={-1}>
            <div className="section-heading-text">
              <h3>Outputs and checks</h3>
              <p>
                <IconText icon="measure">What the numbers are in, and how they are checked.</IconText>
              </p>
            </div>
          </div>
          <Items className="mx-pipe-items" items={OUTPUT_LINES} />
          <div className="cards-grid">
            <InfoCard title="Model units, not pounds" id="units">
              <Items
                items={[
                  { icon: 'measure', text: 'Solver outputs are in model units.' },
                  { icon: 'path', text: 'This study reports gaps against the OBR’s central forecast path instead.' },
                  { icon: 'cost', text: 'The model’s map functions scale to £bn by one ONS GDP anchor.' },
                ]}
              />
            </InfoCard>
            <InfoCard title="Check the numbers">
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
          <SectionHeading id="vintages" icon={iconFor('data')} title="Data files and versions">
            <IconText icon="version">Which data, model and release each page is built from.</IconText>
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
          <SectionHeading id="changelog" icon={iconFor('revision')} title="Changelog and revisions">
            <IconText icon="revision">How the model design and the site changed. Each decision is on the tracker.</IconText>
          </SectionHeading>
          <Revisions />
          <Changelog />
        </section>
        <section>
          <SectionHeading id="use-oguk" icon={iconFor('code')} title="Use the macro model yourself">
            <IconText icon="install">The general workflow for any UK tax or benefit reform. It uses {ext(URLS.ogUk, 'PSLmodels/OG-UK')}.</IconText>
          </SectionHeading>
          <UseOguk />
        </section>
        {/* the page's own citation, last (Method redesign, M14): the full
            section, so no "Cite this page" foot here */}
        <section>
          <SectionHeading id="cite" icon={iconFor('source')} title="Cite this work">
            <IconText icon="source">A citation, and the limitations to cite with it.</IconText>
          </SectionHeading>
          <Cite />
        </section>
      </div>
    </div>
  );
}
