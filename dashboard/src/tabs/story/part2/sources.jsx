'use client';

import S from '@/lib/activeData.js';
import { COHORTS as C, COHORT_SOURCE_COMMIT } from '@/lib/dataKeys.js';
import U from '@/data/ukContext.json';
import { REPO, URLS, efo, EFO_PAGE } from '@/tabs/ai/links.js';
import { SOURCES as LIT } from '@/data/literature.js';
import { result } from '@/tabs/ai/surprise.js';
import SourceLine from '@/components/ui/SourceLine.jsx';
import { docItem, fileItem, navItem } from '@/lib/sourceItems.js';

// Part 2's links: every model result goes to its OG-UK method section and
// to the result file it is read from, on GitHub at the commit the data
// file was built from; every input goes to the document it comes from.
// Links sit in cards and figure captions only, never inside an SVG.

export const COMMIT = S.source_commit;
const blob = (commit, path) => `${REPO}/blob/${commit}/${path}`;

// The result file of one solve (analysis/surprise/output/<closure>/<label>.json).
export function resultUrl(sid, arm, cl) {
  const r = result(sid, arm, cl);
  return r?.label ? blob(COMMIT, `analysis/surprise/output/${cl}/${r.label}.json`) : null;
}
// The no-shock path's own solve at a closure.
export const pathUrl = (cl) => blob(COMMIT, `analysis/surprise/output/${cl}/continuation.json`);
// The cohort welfare file is built by its own script, at its own commit.
const COHORT_COMMIT = COHORT_SOURCE_COMMIT;
export const COHORT_COMMIT_TEXT = COHORT_COMMIT;
export const COHORT_URL = blob(COHORT_COMMIT, String(C.generated_by ?? 'paper/cohort_welfare.py').split(' ')[0]);
// The dashboard data builder, which assembles every result file into the site's data.
export const BUILDER_URL = blob(COMMIT, 'analysis/surprise/build_dashboard_data.py');

// OG-UK's default parameters (the fork the solves ran on): the capital share
// (so the path's labour share), the closure's openness and the world rate.
export const OG_DEFAULTS = URLS.ogUkFork.replace('/commit/', '/blob/') + '/oguk/oguk_default_parameters.json';

// External inputs, from the verified URL lists (tabs/ai/links.js, data/literature.js).
export const SRC = {
  efoMar26: URLS.obrEfo,
  efoBox22: efo(EFO_PAGE.box22),
  bp9: LIT.obrBp9.url,
  frs26: LIT.obrFrs26.url,
  imfSip: LIT.imfSip.url,
  korinekT3: URLS.korinekT3,
  ogCore: URLS.ogCore,
  ogUk: URLS.ogUk,
  repo: REPO,
};

// A readable page for a ukContext source: the ONS series page, not the CSV
// generator the data is fetched from.
export function readable(s) {
  if (!s?.url) return null;
  const m = s.url.match(/generator\?format=csv&uri=(\/[^&]+)/);
  return m ? `https://www.ons.gov.uk${m[1]}` : s.url;
}
export const UK_SRC = U.sources ?? {};

export function A({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

// The items behind a part 2 model figure's "Sources and notes" button: the
// model, the solves at their commit (each drawn solve's result file), and
// the Method section.
export function modelItems(files = [], method = 'm-model') {
  return [
    docItem('OG-UK, the model', SRC.ogUk, 'OG-UK'),
    fileItem(`Macro model solves at ${COMMIT}`, `${REPO}/tree/${COMMIT}/analysis/surprise/output`),
    ...files.filter(([, u]) => u).map(([t, u]) => fileItem(t, u)),
    docItem('PolicyEngine, uk-growth-with-ai', SRC.repo, 'PolicyEngine'),
    navItem('Method', 'method', method, 'how'),
  ];
}

// The output split's one "Sources and notes" button: its settings (the
// closure, then `where`: "UK central, main arm, common fiscal rule") and
// how it is counted, then the model's sources.
export function OutputSource({ closure, where }) {
  return (
    <ModelSourceButton
      method="m-measures"
      groups={[
        { title: 'Settings', notes: [{ icon: 'closure', text: closure }, ...String(where).split(', ').map((t) => ({ icon: 'scenario', text: t }))] },
        {
          title: 'How it’s counted',
          notes: [
            { icon: 'tax', text: 'Taxes not split out' },
            {
              icon: 'labourShare',
              text: (
                <>
                  Labour&rsquo;s share: <A href={OG_DEFAULTS}>OG-UK&rsquo;s calibration</A>, wider than the ONS measure
                </>
              ),
            },
            { icon: 'headline', text: 'The GDP bar ends at the headline figure' },
            { icon: 'caveat', text: 'Rounded: parts may not add up' },
          ],
        },
      ]}
    />
  );
}

// A part 2 model figure's one "Sources and notes" button.
export function ModelSourceButton({ files = [], method = 'm-model', notes, groups, items = [] }) {
  return <SourceLine items={[...items, ...modelItems(files, method)]} notes={notes} groups={groups} />;
}
