// One reference registry for Method and sources (Method redesign, section
// 7; M12, M13): Evidence's SOURCES (data/literature.js, not edited), the
// household study's references (story part 3's REFS and Household
// method's own links), and the models, software and data the macro model
// reads (tabs/method/sources.js SRC). Evidence's #sources lists them all,
// in four groups; each model page lists the ones it cites through the same
// component (components/ui/RefList.jsx).
//
// One format: key · full reference · where. The key is the in-text
// citation, the string running text uses: author-year keys in brackets,
// "et al." for three or more authors ("Doorley et al. (2026)");
// institutional keys as publisher, document, date ("OBR EFO, March 2026").
import { SOURCES } from '@/data/literature.js';
import { REFS } from '@/tabs/story/part3/sources.jsx';
import { PAPER_URL } from '@/tabs/story/part3/shared.jsx';
import { AI_STUDY } from '@/tabs/code/ledger.js';
import { SRC } from '@/tabs/method/sources.js';
import { docItem } from '@/lib/sourceItems.js';

// The household study's paper: one URL everywhere on Method.
export const AHMADI_URL = AI_STUDY.paperUrl ?? PAPER_URL;
// The paper as a card's source item (the household flow card).
export const ahmadiRef = () => docItem(REFS.ahmadi.title, AHMADI_URL, 'PolicyEngine');

// Six of Evidence's short names carry no brackets ("Korinek et al. 2026");
// Evidence's own tables read `short` and their checks pin it, so
// literature.js is not edited: the list overrides the key here only.
const KEY = {
  korinek: 'Korinek et al. (2026)',
  mollImas: 'Moll and Imas (2026)',
  acemoglu: 'Acemoglu (2025)',
  cerutti: 'Cerutti et al. (2025)',
  benzell21: 'Benzell et al. (2021)',
  caselli: 'Caselli and Manning (2019)',
};

// A title that repeats its key ("Ahmadi (2026), Who bears …") keeps the
// part after it; a title that names every author is kept whole.
const afterKey = (r) => (r.title.startsWith(`${r.label}, `) ? r.title.slice(r.label.length + 2) : r.title);
const fromRefs = (id) => ({ group: 'household', key: REFS[id].label, title: afterKey(REFS[id]), url: REFS[id].url });
const fromSrc = (k) => ({ group: 'software', key: SRC[k].label, title: null, url: SRC[k].url });

export const REFERENCES = {
  ...Object.fromEntries(Object.entries(SOURCES).map(([id, s]) => [id, { group: s.group, key: KEY[id] ?? s.short, title: s.title, url: s.url, loc: s.loc, use: s.use, read: s.read }])),
  ahmadi: { ...fromRefs('ahmadi'), url: AHMADI_URL },
  doorley: fromRefs('doorley'),
  briggs: fromRefs('briggs'),
  felten: fromRefs('felten'),
  pizzinelli: fromRefs('pizzinelli'),
  // the study's reference list (paper/sections/references.tex)
  cazzaniga: { group: 'household', key: 'Cazzaniga et al. (2024)', title: 'Cazzaniga, Jaumotte, Li, Melina, Panton, Pizzinelli, Rockall and Mendes Tavares (2024), Gen-AI: Artificial intelligence and the future of work, IMF Staff Discussion Note SDN/2024/001', url: 'https://doi.org/10.5089/9798400262548.006' },
  frs: { group: 'household', key: 'Family Resources Survey', title: 'Department for Work and Pensions, Family Resources Survey', url: 'https://www.gov.uk/government/collections/family-resources-survey--2' },
  spi: { group: 'household', key: 'HMRC Survey of Personal Incomes', title: 'HM Revenue and Customs, Personal incomes statistics', url: 'https://www.gov.uk/government/collections/personal-incomes-statistics' },
  hbai: { group: 'household', key: 'HBAI', title: REFS.hbai.title, url: REFS.hbai.url },
  ogCore: fromSrc('ogCoreParams'),
  // the package's name, written in sources.js only (model-name.test)
  ogUk: fromSrc('ogUk'),
  peUk: fromSrc('peUk'),
  unWpp: fromSrc('unWpp'),
  pinkBook: fromSrc('pinkBook'),
};

// The groups of Evidence's list, in order (the first two keep their ids)
export const REF_GROUPS = [
  { id: 'uk', title: 'UK official and UK-specific', icon: 'finances' },
  { id: 'model', title: 'Model-based studies', icon: 'model' },
  { id: 'household', title: 'Household study', icon: 'households' },
  { id: 'software', title: 'Models, software and data', icon: 'code' },
];

// What each model page cites
export const MACRO_REFS = ['obrEfoMar26', 'obrEfoOct26', 'obrBp9', 'obrFrs26', 'imfSip', 'imfArt4', 'korinek', 'ogCore', 'ogUk', 'peUk', 'unWpp', 'pinkBook'];
export const HOUSEHOLD_REFS = ['ahmadi', 'doorley', 'briggs', 'felten', 'pizzinelli', 'cazzaniga', 'obrFrs26', 'frs', 'spi', 'hbai', 'peUk'];
