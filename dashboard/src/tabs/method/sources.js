// Where every input on Method comes from: one link per source, to the exact
// page (PDF page numbers, found by searching each PDF for the printed page
// and the cited paragraph, 16 Nov 2026), and one link per modelling choice to
// the line of code that sets it. A modelling choice is said to be one; no
// published source is invented for it.
import { REPO, URLS, efo, EFO_PAGE } from '@/tabs/ai/links.js';
import S from '@/data/surprise2028.json';

// The commit the results were built from (surprise2028.json `source_commit`)
export const RUN = S.source_commit;
export const code = (p, line) => `${REPO}/blob/${RUN}/${p}${line ? `#L${line}` : ''}`;

const OGUK_PARAMS = 'https://github.com/vahid-ahmadi/OG-UK/blob/d0e6ae535da4ffbface55f0e64fb2074583a46a6/oguk/oguk_default_parameters.json';
const EFO_OCT = 'https://assets.publishing.service.gov.uk/media/6ae4a7a9ec36e258a1998484/economic-and-fiscal-outlook-october-2026-web-accessible.pdf';
const FRS = 'https://assets.publishing.service.gov.uk/media/6a4cb4c74889d85e75ab40e0/E03599617_OBR_FRS_2026_Accessible.pdf';
const IMF_SIP = 'https://www.imf.org/-/media/files/publications/selected-issues-papers/2026/english/sipea2026072.pdf';
const IMF_ART4 = 'https://www.imf.org/-/media/files/publications/cr/2026/english/1gbrea2026001.pdf';

export const SRC = {
  // OBR
  efoMarPath: { label: 'OBR EFO, March 2026, ¶1.2', url: efo(EFO_PAGE.p1_2) },
  efoMarBox22: { label: 'OBR EFO, March 2026, Box 2.2', url: efo(EFO_PAGE.box22) },
  efoMarDebt: { label: 'OBR public finances databank, March 2026', url: URLS.obrPsfDatabank },
  efoOct127: { label: 'OBR EFO, October 2026, ¶1.27', url: `${EFO_OCT}#page=25` },
  efoOct: { label: 'OBR EFO, October 2026, debt interest ready reckoner', url: EFO_OCT },
  efoOctA1: { label: 'OBR EFO, October 2026, Table A.1', url: `${EFO_OCT}#page=184` },
  bp9B12: { label: 'OBR Briefing paper No.9, ¶B.12', url: `${URLS.obrBp9}#page=50` },
  bp9B14: { label: 'OBR Briefing paper No.9, ¶B.14', url: `${URLS.obrBp9}#page=51` },
  frs86: { label: 'OBR FRS, July 2026, Box 4.1, p.86', url: `${FRS}#page=91` },
  frs87: { label: 'OBR FRS, July 2026, Box 4.1, p.87', url: `${FRS}#page=92` },
  frs88: { label: 'OBR FRS, July 2026, Box 4.1, Chart E, p.88', url: `${FRS}#page=93` },
  wp22: { label: 'OBR Working paper No.22, ¶2.18', url: `${URLS.obrWp22}#page=17` },
  // IMF (PDF pages from the claim audit of 16 Nov 2026)
  imfSip44: { label: 'IMF SIP/2026/072, ¶44 (27% cost saving)', url: `${IMF_SIP}#page=27` },
  imfSipFig9: { label: 'IMF SIP/2026/072, Figure 9', url: `${IMF_SIP}#page=28` },
  imfSipT1: { label: 'IMF SIP/2026/072, Table 1', url: `${IMF_SIP}#page=32` },
  imfArt4: { label: 'IMF 2026 Article IV, risk assessment matrix', url: `${IMF_ART4}#page=52` },
  // Korinek et al. (2026)
  korinekT3: { label: 'Korinek et al. (2026), Table 3, p.31', url: URLS.korinekT3 },
  korinekT5: { label: 'Korinek et al. (2026), Table 5, p.37', url: `${URLS.korinek}#page=37` },
  // ONS
  unWpp: { label: 'UN World Population Prospects', url: URLS.unWpp },
  popData: { label: 'EAPD-DRB Population-Data', url: URLS.popData },
  pinkBook: { label: 'ONS, UK Balance of Payments, The Pink Book: 2026', url: 'https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments/bulletins/unitedkingdombalanceofpaymentsthepinkbook/2026' },
  // OG-Core and OG-UK
  ogCoreParams: { label: 'OG-Core parameter documentation', url: 'https://pslmodels.github.io/OG-Core/content/intro/parameters.html' },
  ogukParams: { label: 'OG-UK default parameters', url: OGUK_PARAMS },
  peUk: { label: 'PolicyEngine-UK', url: URLS.peUk },
  doorley: { label: 'Doorley, O’Connor, O’Shea and Tuda (2026), ESRI/DoF', url: 'https://doi.org/10.26504/jr16' },
  ogCore017: { label: 'OG-Core 0.17.0', url: URLS.ogCore017 },
  ogUk: { label: 'OG-UK', url: URLS.ogUk },
  // the study's own notes and code (modelling choices)
  closureMemo: { label: 'closure memo', url: `${REPO}/blob/${RUN}/docs/closure_choice.md` },
  calibNote: { label: 'UK calibration note', url: `${REPO}/blob/${RUN}/docs/uk_calibration.md` },
  ukTargets: { label: 'uk_targets.json', url: code('analysis/surprise/uk_targets.json') },
  tg1: { label: 'scenarios.py: TG1 = 10', url: code('uk_growth_with_ai/scenarios.py', 45) },
  surpriseYear: { label: 'surprise.py: SURPRISE_YEAR = 2028', url: code('uk_growth_with_ai/surprise.py', 55) },
  rampWeights: { label: 'surprise.py: ramp weights', url: code('uk_growth_with_ai/surprise.py', 137) },
  debtTarget: { label: 'rerun.py: the 2030 debt target', url: code('uk_growth_with_ai/rerun.py', 74) },
  fiscalRules: { label: 'design note: fiscal rules', url: `${REPO}/blob/${RUN}/docs/surprise_2028.md` },
  rerunNote: { label: 'rerun note', url: `${REPO}/blob/${RUN}/docs/rerun_r1_r4.md` },
  pr43: { label: 'PR #43', url: `${REPO}/pull/43` },
  checks: { label: 'checks.py', url: code('uk_growth_with_ai/checks.py') },
};

// Replication: for each Method section, the code that produces it and the
// result file it is read from
export const REPLICATE = {
  'm-model': [{ label: 'solve.py', url: code('uk_growth_with_ai/solve.py') }, SRC.ogukParams],
  'm-shock': [{ label: 'firm-gamma patch', url: URLS.patch }, { label: 'arms.py', url: code('uk_growth_with_ai/arms.py') }],
  'm-scenarios': [SRC.ukTargets, SRC.surpriseYear],
  'm-closures': [{ label: 'surprise.py', url: code('uk_growth_with_ai/surprise.py') }, { label: 'results, zk0.1 and zk0', url: `${REPO}/tree/${RUN}/analysis/surprise/output` }],
  'm-rules': [SRC.tg1, SRC.debtTarget],
  'm-path': [SRC.checks, { label: 'restart gate result', url: code('analysis/surprise/output/zk0.1/GATE_continuation.json') }],
  'm-limits': [SRC.closureMemo, { label: 'red flags 1–3', url: `${REPO}/blob/${RUN}/docs/red_flags_1_3.md` }],
};
