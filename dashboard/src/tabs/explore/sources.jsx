'use client';

import { NavLink } from '@/lib/nav.jsx';
import { METHOD } from '@/lib/labels.js';
import { ext } from '@/tabs/shared/ui.jsx';
import { REPO, RESULTS_SHA, OG_RESULT_URLS, ogOutput, ogScenarioFile, aiFile } from '@/tabs/ai/links.js';
import { SCEN_NAME } from '@/tabs/ai/surprise.js';

// Sources for Explore cards: one line per card (SourcesLine), linking the
// OG-UK result files on GitHub at the commit the data file records, the
// script that assembles them, the scenario's input file and the Method
// section that explains the chart (data-reference: file names, not prose).

const CLOSURE_DIR = { 'zk0.1': 'central closure', zk0: 'closed capital', 'zk0.5': 'half foreign-financed' };

export const methodLink = (key, text) => {
  const m = METHOD[key];
  return m ? (
    <NavLink tab="method" sub="how" anchor={m.id}>
      {text ?? m.label}
    </NavLink>
  ) : null;
};

// One sources line under an Explore card, in place of the "Sources" part of
// an "About this chart" fold: the OG-UK result files at their commit, the
// script that assembles them, the scenario's input file, any extra links,
// and the Method section that explains the chart. Plain links, no icons.
export function SourcesLine({ sid, closures = ['zk0.1', 'zk0'], method, extra = [], code = true }) {
  const parts = [
    closures.length ? (
      <>
        OG-UK results at {ext(`${REPO}/tree/${RESULTS_SHA}`, `commit ${RESULTS_SHA}`)} (
        {closures.map((zk, i) => (
          <span key={zk}>
            {i ? ', ' : ''}
            {ext(ogOutput(zk), CLOSURE_DIR[zk] ?? zk)}
          </span>
        ))}
        )
      </>
    ) : null,
    code ? ext(OG_RESULT_URLS.assemble, 'surprise.py') : null,
    sid ? ext(ogScenarioFile(sid), `${SCEN_NAME[sid]} inputs`) : null,
    ...extra,
    method && METHOD[method] ? <>Method: {methodLink(method)}</> : null,
  ].filter(Boolean);
  return (
    <p className="ex-src" data-reference="">
      <span className="ex-src-label">Sources:</span>{' '}
      {parts.map((p, i) => (
        <span key={i}>
          {i ? ' · ' : ''}
          {p}
        </span>
      ))}
    </p>
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
