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
  rise: 'arrowUp', // an official growth rate above zero
  fall: 'arrowDown', // an official growth rate below zero
  flat: 'minus', // an official growth rate of zero
  period: 'calendar', // the period a figure covers: year, quarter, months
  revision: 'history', // first estimates, open to revision
  survey: 'list', // a survey (Labour Force Survey, BICS)
  business: 'building', // businesses
  workers: 'usersRound', // UK workers (the exposure grid)
  labourShare: 'percent', // labour's share of GDP
  nominal: 'coins', // before adjusting for inflation
  complement: 'handshake', // work that AI complements
  // part 2:
  entrants: 'baby', // cohorts that enter the economy after the shock
  headline: 'flag', // the headline figures
  outputSplit: 'workflow', // where output goes
  // part 3:
  // explore:
  // method:
  // shell:
  answers: 'help', // what a part of the story answers
  handover: 'compass', // a change of model between parts
  deeper: 'link', // links to where a part's figures live in detail
  external: 'externalLink', // a link that leaves the dashboard
};

// Strict: an unknown concept draws no icon (concepts.test.js checks every
// concept named in the source exists, so a typo fails the tests).
export const iconFor = (concept) => CONCEPT_ICON[concept];
