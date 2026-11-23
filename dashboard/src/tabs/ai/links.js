import S from '@/lib/activeData.js';
import AI from '@/data/aiStudy2425.json';
import { SET, COHORT_SOURCE_COMMIT, FILES_REF } from '@/lib/dataKeys.js';

// Every external URL on the dashboard, verified (HTTP 200) on 26 Sept 2026.
// Code-file links point at main (the re-run, PR #11, is merged).
export const REPO = 'https://github.com/PolicyEngine/uk-growth-with-ai';
export const REPO_BLOB = `${REPO}/blob/main`;
export const issue = (n) => `${REPO}/issues/${n}`;
export const pr = (n) => `${REPO}/pull/${n}`;

// OBR Economic and fiscal outlook, March 2026: a PDF page (not the printed
// page number). Box 2.2 p35; paras 1.2-1.3 p10; 1.9-1.10 p12; 2.10 p25;
// 5.20 p88; 6.18 p105.
export const EFO_PDF = 'https://assets.publishing.service.gov.uk/media/69a6d7b62e1f4fbda4252208/economic-and-fiscal-outlook-march-2026-web-accessible.pdf';
export const efo = (page) => `${EFO_PDF}#page=${page}`;
export const EFO_PAGE = { box22: 35, p1_2: 10, p1_3: 10, p1_9: 12, p1_10: 12, p2_10: 25, p5_20: 88, p6_18: 105 };
// Korinek et al. (2026): Table 1 on PDF page 23, Table 3 on page 31.
const KORINEK_PDF = 'https://www-cdn.anthropic.com/files/4zrzovbb/website/cf58f84d46a4a76bf5a5b039ac695fba6b80041c.pdf';

export const URLS = {
  obrEfo: EFO_PDF,
  obrEconTables: 'https://obr.uk/download/march-2026-economic-and-fiscal-outlook-detailed-forecast-tables-economy/',
  obrPsfDatabank: 'https://obr.uk/download/public-finances-databank-march-2026-efo/',
  obrBp9: 'https://obr.uk/docs/dlm_uploads/Briefing_paper_No.9_Forecasting_productivity.pdf',
  obrWp22: 'https://obr.uk/docs/dlm_uploads/Working_paper_22_A_new_UK_overlapping_generations_model.pdf',
  korinek: KORINEK_PDF,
  korinekT1: `${KORINEK_PDF}#page=23`,
  korinekT3: `${KORINEK_PDF}#page=31`,
  mollImas: 'https://aleximas.substack.com/p/will-ai-soon-lead-to-double-digit',
  ogCore: 'https://github.com/PSLmodels/OG-Core',
  ogCore017: 'https://github.com/PSLmodels/OG-Core/releases/tag/v0.17.0',
  ogCoreDocs: 'https://pslmodels.github.io/OG-Core/',
  ogCoreParams: 'https://pslmodels.github.io/OG-Core/content/intro/parameters.html',
  ogUkDefaults: 'https://github.com/PSLmodels/OG-UK/blob/master/oguk/oguk_default_parameters.json',
  hmrcEmployerRates: 'https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027',
  hbai: 'https://www.gov.uk/government/collections/households-below-average-income-hbai--2',
  ucEligibility: 'https://www.gov.uk/universal-credit/eligibility',
  jsa: 'https://www.gov.uk/jobseekers-allowance',
  ogUk: 'https://github.com/PSLmodels/OG-UK',
  ogUkFork: 'https://github.com/PSLmodels/OG-UK/commit/d0e6ae535da4ffbface55f0e64fb2074583a46a6',
  unWpp: 'https://population.un.org/wpp/',
  popData: 'https://github.com/EAPD-DRB/Population-Data',
  peUk: 'https://github.com/PolicyEngine/policyengine-uk',
  patch: `${REPO_BLOB}/patches/ogcore-0.17.0-firm-gamma-tv.diff`,
  patchDoc: `${REPO_BLOB}/docs/firm_gamma_tv.md`,
  readme: `${REPO_BLOB}/README.md`,
  solve: `${REPO_BLOB}/uk_growth_with_ai/solve.py`,
  cli: `${REPO_BLOB}/uk_growth_with_ai/cli.py`,
  checks: `${REPO_BLOB}/uk_growth_with_ai/checks.py`,
  dashboardData: `${REPO_BLOB}/uk_growth_with_ai/dashboard_data.py`,
  obrPy: `${REPO_BLOB}/uk_growth_with_ai/obr.py`,
  calibrate: `${REPO_BLOB}/uk_growth_with_ai/calibrate.py`,
  rerun: `${REPO_BLOB}/uk_growth_with_ai/rerun.py`,
  scenariosJson: `${REPO_BLOB}/uk_growth_with_ai/data/scenarios.json`,
  obrComparison: `${REPO_BLOB}/docs/OG_UK_OBR_COMPARISON.md`,
};

// Result files on GitHub, pinned to the commit each data file records (never
// main, so a link shows the file the page was built from).

export const atRef = (ref, p, kind = 'blob') => `${REPO}/${kind}/${ref}/${p}`;
export const RESULTS_SHA = S.source_commit;
export const COHORTS_SHA = COHORT_SOURCE_COMMIT;
export const ogOutput = (zk) => atRef(RESULTS_SHA, `${SET.outputDir}/${zk}`, 'tree');
export const ogResult = (zk, label) => atRef(RESULTS_SHA, `${SET.outputDir}/${zk}/${label}.json`);
export const ogScenarioFile = (sid) => atRef(FILES_REF, SET.scenarioFile(sid));
export const OG_RESULT_URLS = {
  assemble: atRef(RESULTS_SHA, 'uk_growth_with_ai/surprise.py'),
  doc: atRef(SET.docsRef, SET.designDoc),
  // the cohort state files at the pinned cohort commit (R3-03): the 2028
  // results commit lacks the _dnfull files cohorts2028.json reads
  cohortsDir: atRef(COHORTS_SHA, SET.cohortsDir, 'tree'),
  cohortScript: atRef(COHORTS_SHA, 'paper/cohort_welfare.py'),
  // the sanity gate: the shock-year investment flag (+17%), flagged, never failed
  sanity: atRef(SET.docsRef, `${SET.designDoc}#the-sanity-gate-after-every-solve`),
  // the gilt rate is the private return less about 2pp: one for one with r
  giltRate: atRef(RESULTS_SHA, 'docs/rerun_r1_r4.md'),
  // the national-accounts check (`check`: Y - C - I - G within +/-6% of
  // GDP) on the assembled files, in the set's results sanity audit
  checkLog: atRef(SET.sanityRef, `${SET.sanityDoc}${SET.checkLogAnchor ?? ''}`),
  // the real-world plausibility review: investment rows rated implausible
  plausibility: atRef('59139aa', 'docs/redesign/real-world-plausibility.md'),
};
// uk-ai-study PR #18: a file at the PR's commit (GitHub's blob view renders a
// CSV as a table).
export const AI_SHA = AI.source.commit;
export const aiFile = (p) => (AI.source.files_base_url ? `${AI.source.files_base_url}${p}` : `https://github.com/${AI.source.repo}/blob/${AI_SHA}/${p}`);
export const AI_PR = `https://github.com/${AI.source.repo}/pull/${AI.source.pr}`;
