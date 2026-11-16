'use client';

import { Items } from '@/components/story/Items.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { METHOD } from '@/lib/labels.js';
import { SOURCES as LIT } from '@/data/literature.js';
import { ext } from '@/tabs/shared/ui.jsx';
import { REPO, RESULTS_SHA, OG_RESULT_URLS, ogOutput, ogScenarioFile, URLS, aiFile } from '@/tabs/ai/links.js';
import { SCEN_NAME } from '@/tabs/ai/surprise.js';

// The "Sources" section of an Explore card's "About this chart" fold: the
// OG-UK result files on GitHub at the commit the data file records, the
// script that assembles them, the scenario's input file, where each
// scenario input comes from, and the Method section that explains it. A
// reference list (data-reference): file names and citations, not prose.

const CLOSURE_DIR = { 'zk0.1': 'central closure', zk0: 'closed capital', 'zk0.5': 'half foreign-financed' };

export const methodLink = (key, text) => {
  const m = METHOD[key];
  return m ? (
    <NavLink tab="method" sub="how" anchor={m.id}>
      {text ?? m.label}
    </NavLink>
  ) : null;
};

// Where the scenario inputs come from: published documents, linked. The
// year-4 levels are derived from them (ramp arithmetic and mappings that no
// document prints); "The shock" on Method shows each step.
export function scenarioItems(sid) {
  const korinek = { key: 'src-korinek', icon: 'source', text: <>Korinek: {ext(URLS.korinekT3, 'Korinek et al. (2026), Table 3')}, the substantial scenario</> };
  const uk = {
    key: 'src-uk',
    icon: 'source',
    text: (
      <>
        UK paths: {ext(LIT.obrBp9.url, 'OBR Briefing paper No.9')}, {ext(LIT.obrFrs26.url, 'OBR FRS July 2026, Box 4.1')}, {ext(LIT.imfSip.url, 'IMF SIP/2026/072')}; year-4 levels <NavLink tab="method" sub="how" anchor="m-scenarios">derived from them</NavLink>
      </>
    ),
  };
  if (sid === 'korinek') return [korinek];
  if (sid) return [uk];
  return [uk, korinek];
}

export function ResultSources({ sid, closures = ['zk0.1', 'zk0'], scenario = true, extra = [] }) {
  const items = [
    {
      key: 'files',
      icon: 'source',
      text: (
        <>
          OG-UK result files at {ext(`${REPO}/tree/${RESULTS_SHA}`, `commit ${RESULTS_SHA}`)}:{' '}
          {closures.map((zk, i) => (
            <span key={zk}>
              {i ? ', ' : ''}
              {ext(ogOutput(zk), CLOSURE_DIR[zk] ?? zk)}
            </span>
          ))}
        </>
      ),
    },
    {
      key: 'code',
      icon: 'code',
      text: (
        <>
          Gaps assembled by {ext(OG_RESULT_URLS.assemble, 'surprise.py')}; run notes in {ext(OG_RESULT_URLS.doc, 'surprise_2028.md')}
        </>
      ),
    },
    sid ? { key: 'scen', icon: 'scenario', text: <>{SCEN_NAME[sid]} inputs: {ext(ogScenarioFile(sid), `scenarios_surprise2028_${sid}.json`)}</> } : null,
    ...(scenario ? scenarioItems(sid) : []),
    ...extra,
  ];
  return (
    <div data-reference="">
      <Items items={items} />
    </div>
  );
}

// A uk-ai-study result file name, linked to the file in PR #18 at its
// commit. Text after the path (": column", " (run central)") stays plain.
const AI_PATH = /(results\/[A-Za-z0-9_./-]+\.(?:json|csv))/;
export function linkAiFiles(text) {
  if (typeof text !== 'string') return text;
  const parts = text.split(AI_PATH);
  if (parts.length === 1) return text;
  return parts.map((p, i) => (i % 2 ? <a key={i} href={aiFile(p)} target="_blank" rel="noreferrer"><code>{p}</code></a> : p));
}
