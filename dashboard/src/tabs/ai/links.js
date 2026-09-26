// Every external URL on the dashboard, verified (HTTP 200) on 26 Sept 2026.
// Code-file links point at the branch fix/rerun-2-3-5 (PR #11) until it is
// merged; switch REPO_BLOB to .../blob/main then.
export const REPO = 'https://github.com/PolicyEngine/uk-growth-with-ai';
export const REPO_BLOB = `${REPO}/blob/fix/rerun-2-3-5`;
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
  ogUk: 'https://github.com/PSLmodels/OG-UK',
  ogUkFork: 'https://github.com/vahid-ahmadi/OG-UK/commit/d0e6ae535da4ffbface55f0e64fb2074583a46a6',
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
  scenariosJson: `${REPO_BLOB}/uk_growth_with_ai/data/scenarios.json`,
  obrComparison: `${REPO_BLOB}/docs/OG_UK_OBR_COMPARISON.md`,
};
