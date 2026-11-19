// The revision history: model design decisions, each recorded on the
// tracker (issue or PR number last). Rendered once, in Data and code's
// changelog section (it was on OG-UK method until November 2026).
// A dated entry records what was decided that day, so its years are typed
// (the 12 Nov entry is the 2028 set's design), never read from the active
// data file.
import { ZETA, CENTRAL, BOUND } from '@/tabs/ai/surprise.js';

export const HISTORY = [
  ['11 Nov 2026', 'revision', 'Corrective reruns R1–R4: OBR debt path, UK demographics, a stated closure, a GDP-neutral share-only arm.', 27],
  ['12 Nov 2026', 'closure', `Some foreign capital (ζK = ${ZETA[CENTRAL]}, the share of the extra capital firms want that foreign investors supply), GNI first; ζK = ${ZETA[BOUND]} shown beside it as a bound.`, 16],
  ['12 Nov 2026', 'shock', 'AI becomes an unanticipated 2028 shock from one 2027 start. Headline year 2031.', 27],
  ['12 Nov 2026', 'scenario', 'Scenarios calibrated to UK sources; Korinek et al.’s US case kept as an upper case.', 27],
  ['12 Nov 2026', 'tax', 'OG-UK already includes NICs, so nothing is added. The tax gap becomes a limitation.', 27],
  ['12 Nov 2026', 'households', 'Debt-neutral variant for cohort welfare; NNI reported beside GNI.', 27],
  ['12 Nov 2026', 'limit', '“Automation only” renamed the OBR-style stress test; technology-unchanged arm added.', 27],
  ['13 Nov 2026', 'debt', 'Debt/GDP checked with debt repriced at the speed the OBR assumes; caveat added on Public finances.', 43],
  ['15 Nov 2026', 'finances', 'Fixed spending solved for UK central and Korinek et al.; ζK = 0.5 shown as a sensitivity, now on Explore.', 44],
  ['18 Nov 2026', 'shock', 'AI now starts in 2027, as a surprise, and is in full by 2030, the headline year; the debt rule still starts in 2036. The 2028 timing is kept for comparison.', 44],
];
