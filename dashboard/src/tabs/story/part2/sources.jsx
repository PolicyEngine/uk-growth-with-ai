'use client';

import S from '@/data/surprise2028.json';
import C from '@/data/cohorts2028.json';
import U from '@/data/ukContext.json';
import { NavLink } from '@/lib/nav.jsx';
import { REPO, URLS, efo, EFO_PAGE } from '@/tabs/ai/links.js';
import { SOURCES as LIT } from '@/data/literature.js';
import { result } from '@/tabs/ai/surprise.js';

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
const COHORT_COMMIT = String(C.source ?? '').split('@')[1] ?? COMMIT;
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

// "OG-UK result: result file · Method" at the foot of a card that states a
// model result. `files`: [[label, url]]; `method`: a Method anchor (m-…).
export function ResultLinks({ files = [], method, methodText = 'Method' }) {
  const fs = files.filter(([, u]) => u);
  return (
    <p className="p2-result-links">
      OG-UK result:{' '}
      {fs.map(([t, u], i) => (
        <span key={u}>
          {i ? ', ' : ''}
          <A href={u}>{t}</A>
        </span>
      ))}
      {method ? (
        <>
          {fs.length ? ' · ' : ''}
          <NavLink tab="method" sub="how" anchor={method}>
            {methodText}
          </NavLink>
        </>
      ) : null}
    </p>
  );
}

// The source line under a part 2 model figure: the model, the runs at their
// commit, the result files drawn, and the Method section.
export function ModelSource({ files = [], method = 'm-model', lead = 'Source' }) {
  const fs = files.filter(([, u]) => u);
  return (
    <>
      {lead}: <A href={SRC.ogUk}>OG-UK</A>, run by PolicyEngine (<A href={SRC.repo}>uk-growth-with-ai</A>), 2028-surprise solves at{' '}
      <A href={`${REPO}/tree/${COMMIT}/analysis/surprise/output`}>{COMMIT}</A>
      {fs.map(([t, u]) => (
        <span key={u}>
          {'; '}
          <A href={u}>{t}</A>
        </span>
      ))}
      {'. '}
      <NavLink tab="method" sub="how" anchor={method}>
        How OG-UK works
      </NavLink>
      .
    </>
  );
}
