// The dashboard's citation (moved from CodeTab.jsx, unchanged): the
// one-line text every Method page's foot prints ("Cite this page",
// components/ui/CiteFoot.jsx) and the BibTeX entry on Data and code
// (#citation). Every part is read from the data or the versions file.
import { REPO } from '@/tabs/ai/links.js';
import { LAST_UPDATED, version } from './ledger.js';

const SITE_URL = 'https://uk-growth-with-ai.vercel.app';
const year = LAST_UPDATED.slice(0, 4);
export const CITE_TEXT = `PolicyEngine (${year}). AI and the UK economy: Beyond the forecast. Interactive dashboard, data updated ${LAST_UPDATED}; macro model solves ${version('solves').value}. ${SITE_URL}`;
export const CITE_BIB = `@misc{policyengine_ai_uk_${year},
  author       = {{PolicyEngine}},
  title        = {{AI} and the {UK} economy: Beyond the forecast},
  year         = {${year}},
  howpublished = {Interactive dashboard},
  url          = {${SITE_URL}},
  note         = {Data updated ${LAST_UPDATED}; macro model solves ${version('solves').value}; code at ${REPO}}
}`;
