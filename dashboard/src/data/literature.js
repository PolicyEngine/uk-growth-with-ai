// Published figures for the Other studies tab. Every figure is typed from the
// primary source at the location given, as checked in
// docs/literature_comparison.md (PR #37, 12 Nov 2026), which records how each
// was read. `read` says when a figure could not be read from the publisher's
// own copy. Our own numbers are never here: they come from surprise2028.json.

const EFO_MAR26 = 'https://assets.publishing.service.gov.uk/media/69a6d7b62e1f4fbda4252208/economic-and-fiscal-outlook-march-2026-web-accessible.pdf';
const KORINEK = 'https://www-cdn.anthropic.com/files/4zrzovbb/website/cf58f84d46a4a76bf5a5b039ac695fba6b80041c.pdf';

export const SOURCES = {
  obrEfoMar26: {
    short: 'OBR EFO, March 2026',
    title: 'Economic and fiscal outlook, March 2026: technological displacement scenario',
    who: 'OBR',
    year: 2026,
    group: 'uk',
    url: EFO_MAR26,
    use: 'GDP held unchanged while unemployment rises; debt +1.3% of GDP by 2030-31.',
    loc: 'Box 2.2, pp.30–31; ¶6.18, pp.100–101; GDP growth ¶1.9',
  },
  obrFrs26: {
    short: 'OBR FRS, July 2026',
    title: 'Fiscal risks and sustainability, July 2026, Box 4.1',
    who: 'OBR',
    year: 2026,
    group: 'uk',
    url: 'https://assets.publishing.service.gov.uk/media/6a4cb4c74889d85e75ab40e0/E03599617_OBR_FRS_2026_Accessible.pdf',
    use: 'Wages and salaries fall from 40% to 20% of GDP over 45 years; tax nearly 4pp of GDP lower.',
    loc: 'Box 4.1, pp.86–88',
  },
  obrEfoOct26: {
    short: 'OBR EFO, October 2026',
    title: 'Economic and fiscal outlook, October 2026',
    who: 'OBR',
    year: 2026,
    group: 'uk',
    url: 'https://obr.uk/download/economic-and-fiscal-outlook-october-2026/',
    use: 'Central assumption: AI adds 0.2pp a year to productivity growth by the medium term.',
    loc: '¶1.27, p.21',
  },
  obrBp9: {
    short: 'OBR Briefing paper No.9',
    title: 'Forecasting productivity, Annex B',
    who: 'OBR',
    year: 2025,
    group: 'uk',
    url: 'https://obr.uk/briefing-paper-no-9-forecasting-productivity/',
    use: 'J-curve and S-curve AI paths: 0.1pp and 0.25pp a year by year five.',
    loc: '¶B.12, ¶B.14',
    read: 'Not re-fetched: the OBR download gate refuses automated access; figures as read in the #31 review.',
  },
  imfSip: {
    short: 'IMF UK Selected Issues 2026',
    title: 'Bellon, Deb, Gandhi and Rockall, “Unlocking AI-led productivity growth in the United Kingdom”, SIP/2026/072',
    who: 'IMF',
    year: 2026,
    group: 'uk',
    url: 'https://www.imf.org/-/media/files/publications/selected-issues-papers/2026/english/sipea2026072.pdf',
    use: 'Output +3.26% at year 5 and +7.96% at year 10; capital share +10pp in the long run.',
    loc: 'Table 1, p.29; ¶44, p.24',
  },
  imfArt4: {
    short: 'IMF Article IV 2026',
    title: 'United Kingdom: 2026 Article IV staff report, Country Report 26/172',
    who: 'IMF',
    year: 2026,
    group: 'uk',
    url: 'https://www.imf.org/-/media/files/publications/cr/2026/english/1gbrea2026001.pdf',
    use: 'Risk matrix: TFP 1 to 5pp higher over 10 years.',
    loc: 'Risk assessment matrix, p.47',
  },
  boeMpr: {
    short: 'Bank of England MPR, Nov 2026',
    title: 'Monetary Policy Report, November 2026, Boxes C and D',
    who: 'Bank of England',
    year: 2026,
    group: 'uk',
    url: 'https://www.bankofengland.co.uk/-/media/boe/files/monetary-policy-report/2026/november/monetary-policy-report-november-2026.pdf',
    use: 'Firms report 0.1–0.2pp a year from AI so far and expect 0.9pp a year over the next three years.',
    loc: 'Box D, PDF p.59',
  },
  ippr: {
    short: 'IPPR, Transformed by AI',
    title: 'Jung and Srinivasa Desikan, Transformed by AI',
    who: 'IPPR',
    year: 2024,
    group: 'uk',
    url: 'https://www.ippr.org/articles/transformed-by-ai',
    use: 'Central GDP gain +3.1% (first wave) to +6.3% (integrated AI), horizon unstated.',
    loc: 'Table 4.1, p.25',
    read: 'Read from a mirror copy of the PDF.',
  },
  pwc2017: {
    short: 'PwC 2017',
    title: 'The economic impact of artificial intelligence on the UK economy',
    who: 'PwC',
    year: 2017,
    group: 'uk',
    url: 'https://www.pwc.co.uk/economic-services/assets/ai-uk-report-v2.pdf',
    use: 'GDP up to 10.3% higher in 2030, of which productivity 1.9%.',
    loc: 'p.4',
  },
  goScience: {
    short: 'PwC for GO-Science, 2025',
    title: 'The wider economic impacts of emerging technologies in the UK',
    who: 'PwC / GO-Science',
    year: 2025,
    group: 'uk',
    url: 'https://www.gov.uk/government/publications/the-wider-economic-impacts-of-emerging-technologies-in-the-uk/the-wider-economic-impacts-of-emerging-technologies-in-the-uk-html',
    use: 'AI and machine learning add 2.98% to UK real GDP by 2035.',
    loc: 'Section 5',
  },
  korinek: {
    short: 'Korinek et al. 2026',
    title: 'Korinek, Jones, Sacher, Cotter and McCrory, “Economic scenarios for transformative AI”, WP 2026-02',
    who: 'Anthropic Institute',
    year: 2026,
    group: 'model',
    url: KORINEK,
    use: '“Substantial”: GDP +8.3%, TFP +3.1%, labour share 60.0 → 56.1 in 2030 (US); GDP and wage by capital-supply elasticity.',
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
    title: 'Acemoglu, “The simple macroeconomics of AI”, Economic Policy 40(121)',
    who: 'Acemoglu',
    year: 2025,
    group: 'model',
    url: 'https://www.nber.org/system/files/working_papers/w32487/w32487.pdf',
    use: 'TFP no more than 0.66% and GDP +0.93–1.16% over ten years (US).',
    loc: 'NBER w32487, p.4; Table 1, p.41',
  },
  cerutti: {
    short: 'Cerutti et al. 2025 (IMF)',
    title: 'Cerutti et al., “The global impact of AI: mind the gap”, IMF WP/25/76',
    who: 'IMF',
    year: 2025,
    group: 'model',
    url: 'https://www.imf.org/-/media/files/publications/wp/2025/english/wpiea2025076-print-pdf.pdf',
    use: 'Other advanced economies (including the UK): GDP +1.6% to +4.7% after 10 years.',
    loc: 'p.16',
  },
  benzell21: {
    short: 'Benzell et al. 2021',
    title: 'Benzell, Kotlikoff, LaGarda and Ye, “Simulating endogenous global automation”, NBER w29220',
    who: 'NBER',
    year: 2021,
    group: 'model',
    url: 'https://www.nber.org/system/files/working_papers/w29220/w29220.pdf',
    use: 'Multi-region OLG: UK output +10.0% in 2050.',
    loc: 'p.3',
  },
  caselli: {
    short: 'Caselli and Manning 2019',
    title: 'Caselli and Manning, “Robot arithmetic: new technology and wages”, AER: Insights 1(1)',
    who: 'AER: Insights',
    year: 2019,
    group: 'model',
    url: 'https://cep.lse.ac.uk/pubs/download/dp1497.pdf',
    use: 'Average wages can fall with new technology only if it raises the interest rate.',
    loc: 'CEP DP 1497, p.8',
  },
};

// Coverage: yes = modelled; part = assumed, imposed or partial; no = not in
// the model; na = the source does not say.
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
      korinek: ['yes', 'Modelled', 'Tasks automated as the affected mass and automation shares rise.'],
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
      imf: ['na', 'Not stated', 'Not stated in the paper’s summary of the model.'],
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
      imf: ['na', 'Not stated', 'Says many workers may see lower wages; no unemployment figure.'],
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
      imf: ['na', 'Not stated', 'No household detail reported.'],
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
      obr: ['yes', 'Modelled', 'Fiscal forecast with separate effective rates on wages and profits (FRS 2026); the rates are on Results, Public finances.'],
      imf: ['na', 'Not stated', 'No fiscal results.'],
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
      imf: ['na', 'Not stated', '100 sectors on the supply side; demand shifts not stated.'],
    },
  },
];

// Published ranges for "Where our numbers sit". Each row is a level gap
// against a OBR-central path; `horizon` is stated because the rows mix horizons,
// and none is converted. lo == hi is a point; `mark` is a highlighted value.
export const RANGES = {
  gdp: [
    { src: 'acemoglu', label: 'Acemoglu', lo: 0.93, hi: 1.16, horizon: '10 years, US', note: 'GDP +0.93–1.16%' },
    { src: 'cerutti', label: 'Cerutti et al. (IMF)', lo: 1.6, hi: 4.7, horizon: '10 years, other advanced economies', note: 'Low to high scenario' },
    { src: 'goScience', label: 'PwC for GO-Science', lo: 2.98, hi: 2.98, horizon: 'By 2035, UK', note: 'AI and machine learning' },
    { src: 'ippr', label: 'IPPR, central case', lo: 3.1, hi: 6.3, horizon: 'Horizon unstated, UK', note: 'First wave to integrated AI' },
    { src: 'imfSip', label: 'IMF UK', lo: 3.26, hi: 7.96, horizon: 'Year 5 to year 10, UK', note: 'Output, baseline scenario' },
    { src: 'korinek', label: 'Korinek et al.', lo: 6.4, hi: 10.0, mark: 8.3, horizon: '2030, US', note: 'Capital-supply elasticity 1 to ∞; substantial case 8.3%' },
    { src: 'pwc2017', label: 'PwC 2017', lo: 1.9, hi: 10.3, horizon: '2030, UK', note: 'Productivity only to total' },
    { src: 'benzell21', label: 'Benzell et al.', lo: 10.0, hi: 10.0, horizon: '2050, UK', note: 'Multi-region OLG' },
  ],
  wage: [
    { src: 'obrEfoMar26', label: 'OBR displacement', lo: 0, hi: 0, horizon: 'To 2030-31, UK', note: 'Productivity “not reflected in higher real earnings”' },
    { src: 'acemoglu', label: 'Acemoglu', lo: 0.8, hi: 1.0, horizon: '10 years, US', note: 'Average wage; columns read from the order of the table’s cells' },
    { src: 'korinek', label: 'Korinek et al.', lo: -1.6, hi: 5.6, mark: 2.1, horizon: '2030, US', note: 'Capital-supply elasticity 1 to ∞; substantial case +2.1%' },
    { src: 'imfSip', label: 'IMF UK', none: true, horizon: 'UK', note: 'Wages rise “overall”; no number published' },
  ],
};

// The OBR's GDP growth for 2027-2030, published to one decimal place.
export const OBR_GROWTH = { value: 1.6, src: 'obrEfoMar26', loc: '¶1.9, p.7', url: `${EFO_MAR26}#page=12` };
