'use client';

import { NavLink } from '@/lib/nav.jsx';
import { METHOD } from '@/lib/labels.js';
import SourceLine from '@/components/ui/SourceLine.jsx';
import { fileItem, navItem } from '@/lib/sourceItems.js';
import { RESULTS_SHA, OG_RESULT_URLS, ogOutput, ogScenarioFile, aiFile } from '@/tabs/ai/links.js';
import { SCEN_NAME } from '@/tabs/ai/surprise.js';

// Sources for Explore cards, behind each card's one "Sources and notes"
// button (Card `sources`, components/ui/SourceLine.jsx): the OG-UK result
// files on GitHub at the commit the data file records, the script that
// assembles them, the scenario's input file, any extra documents and the
// Method section that explains the chart.

const CLOSURE_DIR = { 'zk0.1': 'some foreign capital', zk0: 'no foreign capital', 'zk0.5': 'half foreign-financed' };

export const methodLink = (key, text) => {
  const m = METHOD[key];
  return m ? (
    <NavLink tab="method" sub="how" anchor={m.id}>
      {text ?? m.label}
    </NavLink>
  ) : null;
};

// The Method section a chart is explained in, as a sources item.
export const methodItem = (key) => (METHOD[key] ? navItem(`Method: ${METHOD[key].label}`, 'method', METHOD[key].id, 'how') : null);

// One card's sources, as items. `extra`: more items (docItem, fileItem,
// navItem from lib/sourceItems.js).
export function sourcesItems({ sid, closures = ['zk0.1', 'zk0'], method, extra = [], code = true } = {}) {
  return [
    ...closures.map((zk) => fileItem(`OG-UK results, ${CLOSURE_DIR[zk] ?? zk}`, ogOutput(zk), 'OG-UK', `commit ${RESULTS_SHA}`)),
    code ? fileItem('surprise.py, the script that assembles the results', OG_RESULT_URLS.assemble, 'PolicyEngine') : null,
    sid ? fileItem(`${SCEN_NAME[sid]} inputs`, ogScenarioFile(sid), 'OG-UK') : null,
    ...extra,
    method ? methodItem(method) : null,
  ].filter(Boolean);
}

// The same, as its own "Sources and notes" button (outside a Card).
export function SourcesLine(props) {
  return <SourceLine items={sourcesItems(props)} />;
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
