// The sources behind Method and sources > Evidence: the coverage matrix, the
// source list and the OBR growth check. Published figures have one home, the
// UK evidence map (site-evidence-map.json): each row is read from the primary
// text at the location it gives, on the date it gives. `read` says when a
// figure could not be read from the publisher's own copy. Our own numbers are
// never here: they come from surprise2028.json.
import MAP from './site-evidence-map.json';

const EFO_MAR26 = 'https://assets.publishing.service.gov.uk/media/69a6d7b62e1f4fbda4252208/economic-and-fiscal-outlook-march-2026-web-accessible.pdf';
const EFO_OCT26 = 'https://assets.publishing.service.gov.uk/media/6ae4a7a9ec36e258a1998484/economic-and-fiscal-outlook-october-2026-web-accessible.pdf';
const KORINEK = 'https://www-cdn.anthropic.com/files/4zrzovbb/website/cf58f84d46a4a76bf5a5b039ac695fba6b80041c.pdf';

export const SOURCES = {
  obrEfoMar26: {
    short: 'OBR EFO, March 2026',
    title: 'Economic and fiscal outlook, March 2026: technological displacement scenario',
    who: 'OBR',
    year: 2026,
    group: 'uk',
    url: EFO_MAR26,
    use: 'Technological displacement scenario: GDP held unchanged while equilibrium unemployment rises.',
    loc: 'Box 2.2, pp.30–31; ¶6.18, pp.100–101',
  },
  obrFrs26: {
    short: 'OBR FRS, July 2026',
    title: 'Fiscal risks and sustainability, July 2026, Box 4.1',
    who: 'OBR',
    year: 2026,
    group: 'uk',
    url: 'https://assets.publishing.service.gov.uk/media/6a4cb4c74889d85e75ab40e0/E03599617_OBR_FRS_2026_Accessible.pdf',
    use: 'Illustrative fall in the wages-and-salaries share of GDP (40% to 20%) with GDP unchanged, and what it does to tax.',
    loc: 'Box 4.1, pp.86–88',
  },
  obrEfoOct26: {
    short: 'OBR EFO, October 2026',
    title: 'Economic and fiscal outlook, October 2026',
    who: 'OBR',
    year: 2026,
    group: 'uk',
    url: EFO_OCT26,
    use: 'Central AI productivity assumption, and the GDP growth path in the growth check.',
    loc: '¶1.27, p.21; GDP growth Table A.1, p.180',
  },
  obrBp9: {
    short: 'OBR Briefing paper No.9',
    title: 'Forecasting productivity, Annex B',
    who: 'OBR',
    year: 2025,
    group: 'uk',
    url: 'https://obr.uk/docs/dlm_uploads/Briefing_paper_No.9_Forecasting_productivity.pdf',
    use: 'J-curve and S-curve paths for AI’s productivity effect.',
    loc: '¶B.12, ¶B.14',
  },
  imfSip: {
    short: 'IMF UK Selected Issues 2026',
    title: 'Bellon, Deb, Gandhi and Rockall, “Unlocking AI-led productivity growth in the United Kingdom”, SIP/2026/072',
    who: 'IMF',
    year: 2026,
    group: 'uk',
    url: 'https://www.imf.org/-/media/files/publications/selected-issues-papers/2026/english/sipea2026072.pdf',
    use: 'Task-based model of AI adoption in 100 sectors, calibrated to a 10pp rise in the capital share.',
    loc: 'Table 1, p.29; ¶44, p.24',
  },
  imfArt4: {
    short: 'IMF Article IV 2026',
    title: 'United Kingdom: 2026 Article IV staff report, Country Report 26/172',
    who: 'IMF',
    year: 2026,
    group: 'uk',
    url: 'https://www.imf.org/-/media/files/publications/cr/2026/english/1gbrea2026001.pdf',
    use: 'AI acceleration as an upside risk to TFP.',
    loc: 'Risk assessment matrix, p.47',
  },
  boeMpr: {
    short: 'Bank of England MPR, Nov 2026',
    title: 'Monetary Policy Report, November 2026, Box D',
    who: 'Bank of England',
    year: 2026,
    group: 'uk',
    url: 'https://www.bankofengland.co.uk/-/media/boe/files/monetary-policy-report/2026/november/monetary-policy-report-november-2026.pdf',
    use: 'Firms’ estimates of AI’s productivity effect so far and over the next three years.',
    loc: 'Box D, p.58',
  },
  ippr: {
    short: 'IPPR, Transformed by AI',
    title: 'Jung and Srinivasa Desikan, Transformed by AI',
    who: 'IPPR',
    year: 2024,
    group: 'uk',
    url: 'https://files.ippr.org/production/Downloads/Transformed_by_AI_March24_2024-03-27-121003_kxis.pdf',
    use: 'Task-exposure scenarios for output and jobs.',
    loc: 'Table 4.1, p.25',
  },
  pwc2017: {
    short: 'PwC 2017',
    title: 'The economic impact of artificial intelligence on the UK economy',
    who: 'PwC',
    year: 2017,
    group: 'uk',
    url: 'https://www.pwc.co.uk/economic-services/assets/ai-uk-report-v2.pdf',
    use: 'Spatial CGE model of AI’s effect on UK GDP to 2030.',
    loc: 'p.4',
  },
  goScience: {
    short: 'PwC for GO-Science, 2025',
    title: 'The wider economic impacts of emerging technologies in the UK',
    who: 'PwC / GO-Science',
    year: 2025,
    group: 'uk',
    url: 'https://www.gov.uk/government/publications/the-wider-economic-impacts-of-emerging-technologies-in-the-uk/the-wider-economic-impacts-of-emerging-technologies-in-the-uk-html',
    use: 'CGE model of emerging technologies, including AI and machine learning, to 2035.',
    loc: 'Section 5',
  },
  korinek: {
    short: 'Korinek et al. 2026',
    title: 'Korinek, Jones, Sacher, Cotter and McCrory, “Economic scenarios for transformative AI”, WP 2026-02',
    who: 'Anthropic Institute',
    year: 2026,
    group: 'model',
    url: KORINEK,
    use: 'Task-based general equilibrium scenarios for the US to 2030, with GDP and the wage by capital-supply elasticity.',
    loc: 'Table 3, p.31; Table 5, p.37',
  },
  mollImas: {
    short: 'Moll and Imas 2026',
    title: 'Moll and Imas, “Will AI soon lead to double-digit growth?” (essay)',
    who: 'Moll and Imas',
    year: 2026,
    group: 'model',
    url: 'https://aleximas.substack.com/p/will-ai-soon-lead-to-double-digit',
    use: 'Solow model with the automated task share rising from one third to one by 2045; argue 4–5% growth is a more reasonable baseline.',
    loc: 'Essay, 9 Sept 2026',
  },
  acemoglu: {
    short: 'Acemoglu 2025',
    title: 'Acemoglu, “The simple macroeconomics of AI”, Economic Policy 40(121), 13–58, doi:10.1093/epolic/eiae042',
    who: 'Acemoglu',
    year: 2025,
    group: 'model',
    url: 'https://doi.org/10.1093/epolic/eiae042',
    use: 'Hulten’s-theorem bound on AI’s TFP and GDP effects over ten years (US).',
    loc: 'TFP bound: published summary; GDP and wage numbers from NBER w32487, p.4 and Table 1, p.41',
  },
  cerutti: {
    short: 'Cerutti et al. 2025 (IMF)',
    title: 'Cerutti et al., “The global impact of AI: mind the gap”, IMF WP/25/76',
    who: 'IMF',
    year: 2025,
    group: 'model',
    url: 'https://www.imf.org/-/media/files/publications/wp/2025/english/wpiea2025076-print-pdf.pdf',
    use: 'Global model of AI’s GDP effects; the UK is in “other advanced economies”.',
    loc: 'p.16',
  },
  benzell21: {
    short: 'Benzell et al. 2021',
    title: 'Benzell, Kotlikoff, LaGarda and Ye, “Simulating endogenous global automation”, NBER w29220',
    who: 'NBER',
    year: 2021,
    group: 'model',
    url: 'https://www.nber.org/system/files/working_papers/w29220/w29220.pdf',
    use: 'Multi-region OLG model of automation, with a UK region.',
    loc: 'p.3',
  },
  caselli: {
    short: 'Caselli and Manning 2019',
    title: 'Caselli and Manning, “Robot arithmetic: new technology and wages”, AER: Insights 1(1)',
    who: 'AER: Insights',
    year: 2019,
    group: 'model',
    url: 'https://cep.lse.ac.uk/pubs/download/dp1497.pdf',
    use: 'Average wages can fall with new technology if it raises the interest rate.',
    loc: 'CEP DP 1497, p.8',
  },
};

// Coverage: yes = modelled; part = assumed, imposed or partial; no = not in
// the model; na = the source does not say. The IMF UK column is the SIP/2026/072
// model, which is Rockall et al. (IMF WP/25/68); each note names its document.
export const MODELS = [
  { id: 'oguk', label: 'OG-UK (this study)', short: 'OG-UK' },
  { id: 'korinek', label: 'Korinek et al.', short: 'Korinek', src: 'korinek' },
  { id: 'moll', label: 'Moll and Imas', short: 'Moll & Imas', src: 'mollImas' },
  { id: 'obr', label: 'OBR', short: 'OBR', src: 'obrEfoMar26' },
  { id: 'imf', label: 'IMF UK', short: 'IMF UK', src: 'imfSip' },
];

export const CHANNELS = [
  {
    id: 'automation',
    label: 'Automation',
    icon: 'cpu',
    cells: {
      oguk: ['part', 'Imposed', 'A rising capital share γ on a set path.'],
      korinek: ['yes', 'Modelled', 'Tasks automated as the affected mass and the diffusion share rise; the automation share is fixed in each scenario (Table 1, pp.23–24).'],
      moll: ['yes', 'Modelled', 'Automated task share rises from one third to one by 2045.'],
      obr: ['part', 'Stated', 'Box 2.2: technology substitutes for labour; not modelled.'],
      imf: ['yes', 'Modelled', 'Endogenous task adoption, 27% cost saving per automated task.'],
    },
  },
  {
    id: 'labour-share',
    label: 'Labour share',
    icon: 'pie',
    cells: {
      oguk: ['part', 'Imposed', 'Exactly 1 − γ at ε = 1.'],
      korinek: ['yes', 'Modelled', 'Endogenous; 60.0 → 56.1 in the substantial case.'],
      moll: ['yes', 'Modelled', 'Equals one minus the automated share; goes to zero.'],
      obr: ['part', 'Assumed', 'FRS 2026 Box 4.1: wages and salaries 40% → 20% of GDP; EFO Box 2.2 gives no number.'],
      imf: ['yes', 'Modelled', 'Capital share +10pp in the long run, by calibration.'],
    },
  },
  {
    id: 'capital',
    label: 'Capital',
    icon: 'construction',
    cells: {
      oguk: ['yes', 'Modelled', 'Life-cycle saving plus foreign-owned capital (ζK).'],
      korinek: ['yes', 'Modelled', 'Capital supply with elasticity ε (3 by default).'],
      moll: ['yes', 'Modelled', 'Solow saving at 20%.'],
      obr: ['no', 'Not for AI', 'Investment is forecast, but its response to AI is not modelled.'],
      imf: ['yes', 'Modelled', 'Capital deepens endogenously.'],
    },
  },
  {
    id: 'adoption',
    label: 'Adoption and diffusion',
    icon: 'trend',
    cells: {
      oguk: ['part', 'In the ramp', 'Folded into the four-year ramp of γ and Z.'],
      korinek: ['yes', 'Modelled', 'Adopted share rises over 2026–2030.'],
      moll: ['part', 'Assumed path', 'Automation share follows a set path to 2045.'],
      obr: ['part', 'Assumed paths', 'BP9 J-curve and S-curve productivity paths.'],
      imf: ['yes', 'Modelled', 'Adoption is endogenous; 17 years to the long run.'],
    },
  },
  {
    id: 'new-tasks',
    label: 'New tasks',
    icon: 'sliders',
    cells: {
      oguk: ['no', 'No', 'One production function; no task counting.'],
      korinek: ['yes', 'Modelled', 'Task reinstatement creates new human tasks.'],
      moll: ['no', 'No', 'Pure automation.'],
      obr: ['no', 'No', 'Not in the scenario.'],
      imf: ['no', 'No', 'Only existing tasks and occupations (WP/25/68, p.24); reallocation to new tasks is outside the analysis (SIP ¶53).'],
    },
  },
  {
    id: 'unemployment',
    label: 'Unemployment',
    icon: 'briefcase',
    cells: {
      oguk: ['no', 'No', 'The labour market clears; displacement shows in the wage.'],
      korinek: ['yes', 'Modelled', 'Search and matching; 3.8% → 4.6% in the substantial case.'],
      moll: ['no', 'No', 'Full employment.'],
      obr: ['part', 'Assumed', 'Equilibrium unemployment rises to 5.5% by assumption.'],
      imf: ['no', 'No', 'Labour is supplied inelastically, so there is no unemployment (WP/25/68, p.16); displacement shows in wages (SIP ¶53).'],
    },
  },
  {
    id: 'households',
    label: 'Households and cohorts',
    icon: 'usersRound',
    cells: {
      oguk: ['yes', 'Modelled', 'Households by age cohort and ability type; the counts are on Method.'],
      korinek: ['part', 'Two occupations', 'Cognitive and other workers, one wage each.'],
      moll: ['no', 'No', 'Representative agent.'],
      obr: ['no', 'Not for AI', 'The OBR’s OLG model (Working paper 22) is not used for AI.'],
      imf: ['part', 'Partly', 'Households differ by income and wealth, from the Wealth and Assets Survey, but not by age (WP/25/68); the SIP reports no household results.'],
    },
  },
  {
    id: 'tax',
    label: 'Tax system',
    icon: 'receipt',
    cells: {
      oguk: ['yes', 'Modelled', 'Tax functions fitted to PolicyEngine-UK; one schedule for labour and capital income.'],
      korinek: ['no', 'No', 'Research funded by lump-sum taxes.'],
      moll: ['no', 'No', 'No government.'],
      obr: ['yes', 'Modelled', 'Fiscal forecast with separate effective rates on wages and profits (FRS 2026); the rates are on Explore, Public finances.'],
      imf: ['no', 'No', 'No government budget or tax system; WP/25/68 tests a capital tax only as a policy experiment (Table 6). The SIP has no fiscal results.'],
    },
  },
  {
    id: 'demand',
    label: 'Demand shifts',
    icon: 'cart',
    cells: {
      oguk: ['no', 'No', 'One sector: spending cannot shift between goods.'],
      korinek: ['no', 'No', 'One good.'],
      moll: ['part', 'Argued', 'Central to their argument, but argued, not modelled.'],
      obr: ['no', 'No', 'Not in the scenario.'],
      imf: ['no', 'No', '100 sectors combined with fixed Cobb–Douglas weights (WP/25/68, p.14; SIP Annex III), so spending shares do not respond; one WP/25/68 variant shifts them by assumption.'],
    },
  },
];

// The rows of "Where our numbers sit": the evidence map's rows with `plot`.
// Each row is a level gap against the study's own baseline (stated in the
// map); only OG-UK's figures are against the OBR-central path, and those come
// from surprise2028.json. `horizon` is stated because the rows mix horizons,
// and none is converted. lo == hi is a point; `mark` is the source's own
// central case; `none` = no number published; `unverified` = not confirmed in
// the published text. Rows sharing `join` draw as one bar from the lowest to
// the highest.
function plotRows(metric) {
  const out = [];
  const seen = {};
  for (const r of MAP.rows) {
    if (r.plot !== metric) continue;
    if (r.join && seen[r.join]) {
      const j = seen[r.join];
      j.lo = Math.min(j.lo, r.lo);
      j.hi = Math.max(j.hi, r.hi);
      j.ids.push(r.id);
      continue;
    }
    const row = {
      ids: [r.id],
      label: r.plotLabel,
      short: r.institution,
      horizon: r.plotHorizon,
      note: r.note,
      loc: r.loc,
      url: r.url,
      lo: r.lo ?? null,
      hi: r.hi ?? null,
      mark: r.mark ?? null,
      none: Boolean(r.none),
      unverified: Boolean(r.unverified),
    };
    if (r.join) seen[r.join] = row;
    out.push(row);
  }
  return out;
}
export const RANGES = { gdp: plotRows('gdp'), wage: plotRows('wage') };

// The OBR's real GDP growth forecast by calendar year, October 2026 EFO,
// Table A.1 (published to one decimal place). The growth check compares the
// years OG-UK's baseline covers.
export const OBR_GROWTH = {
  years: [2027, 2028, 2029, 2030, 2031],
  growth_pct: [1.0, 1.6, 1.8, 1.7, 1.6],
  src: 'obrEfoOct26',
  label: 'OBR, October 2026',
  loc: 'Table A.1, p.180',
  url: `${EFO_OCT26}#page=184`,
};
