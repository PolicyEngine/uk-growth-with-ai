// One icon per concept across the dashboard: every item, step title, stat
// tile, call-out and caveat takes its icon from here (by concept name), so
// the same idea always wears the same icon. Names are Icon.jsx keys; icons
// are always drawn plain (never in a box or circle, never a tick badge).
export const CONCEPT_ICON = {
  // the economy
  gdp: 'trend', // output, GDP
  gapUp: 'arrowUpRight', // above the path
  gapDown: 'arrowDownRight', // below the path
  onPath: 'equal', // on the path / no change
  path: 'lineChart', // a path or series over time
  forecast: 'calendarClock', // a forecast, the OBR's projection
  productivity: 'gauge',
  capital: 'factory', // capital, capital income, investment
  labour: 'briefcase', // work, labour income, employment
  pay: 'banknote', // pay rates, wages
  gni: 'wallet', // national income UK residents keep
  foreign: 'globe', // foreign owners, abroad, open capital
  depreciation: 'repeat', // capital that wears out
  ai: 'cpu', // AI, the technology shock
  shock: 'zap', // the shock arriving
  timing: 'clock', // when something happens
  // the public finances
  finances: 'landmark', // public finances, government
  debt: 'piggy', // public debt
  tax: 'receipt', // tax receipts
  benefits: 'handCoins', // benefits, transfers
  rule: 'scale', // a fiscal rule
  // people
  households: 'users',
  jobLoss: 'userMinus', // employees assumed displaced
  jobKeep: 'userCheck', // those who keep their jobs
  age: 'hourglass', // birth year, cohorts
  poverty: 'home', // poverty measures
  inequality: 'pie', // Gini, how income is shared
  deciles: 'bars', // income deciles
  takeUp: 'fileText', // benefit take-up, claims
  // method and evidence
  model: 'layers', // a model (OG-UK, uk-ai-study)
  scenario: 'sliders', // a scenario or assumption
  closure: 'network', // closure: where new capital comes from
  measure: 'ruler', // a measure or definition
  draws: 'shuffle', // random draws
  source: 'book', // a source, publication
  data: 'database',
  code: 'code',
  compare: 'arrowLeftRight', // comparison
  range: 'split', // a range or spread across cases
  breakEven: 'target',
  cost: 'pound', // a cost in pounds
  // notes
  caveat: 'info', // a caveat, what a figure means
  limit: 'alert', // what a model cannot say, a warning
  excluded: 'ban', // left out of the model
  provisional: 'flask', // provisional, draft work
  canSay: 'eye', // what a model can say
  cannotSay: 'eyeOff', // what it cannot say
  why: 'lightbulb', // the reason
  next: 'arrowRight',
  link: 'arrowRight',

  // the story's parts
  record: 'library', // part 1: the official record

  // Concepts added by the itemising pass, one block per page group (keep
  // each to its own block). Each needs an icon no other concept uses.
  // part 1:
  // part 2:
  // part 3:
  // explore:
  // method:
  equation: 'sigma', // the model's equations
  closed: 'lock', // closed capital: no foreign capital
  start: 'flag', // the starting point of a run
  revision: 'history', // a revision, the changelog
  pipeline: 'gitBranch', // the run pipeline
  version: 'package', // a software version
  release: 'calendar', // a release or update date
  install: 'download', // installing the model
  coverage: 'layoutGrid', // the coverage matrix
  table: 'table', // a table of estimates
  ledger: 'list', // the source ledger
  stages: 'listTree', // stages of a pipeline
  generations: 'usersRound', // overlapping generations
  interest: 'percent', // interest rates, repricing
  scarceGoods: 'cart', // demand for goods that stay scarce
  jump: 'construction', // a one-year jump, no adjustment costs
  prerequisite: 'key', // what you need first
  repo: 'github', // the code repository
  check: 'microscope', // a check of the numbers
  arithmetic: 'calculator', // arithmetic, not a solve
};

// Strict: an unknown concept draws no icon (concepts.test.js checks every
// concept named in the source exists, so a typo fails the tests).
export const iconFor = (concept) => CONCEPT_ICON[concept];
