'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { AI_STUDY } from '@/tabs/code/ledger.js';
import { REPLICATE as OGUK_REPLICATE } from './sources.js';

// Replication: the code and the result file behind each section. OG-UK's at
// the commit the results were built from; the household study's at the
// study's commit (read from aiStudy2425.json).
const study = AI_STUDY.blob;
export const REPLICATE = {
  ...OGUK_REPLICATE,
  'hm-data': [{ label: 'data.py', url: study('uk_ai_study/data.py') }, { label: 'BUILD_MANIFEST.json', url: study('results/BUILD_MANIFEST.json') }],
  'hm-exposure': [{ label: 'exposure.py', url: study('uk_ai_study/exposure.py') }],
  'hm-shock': [{ label: 'shocks.py', url: study('uk_ai_study/shocks.py') }, { label: 'central.json', url: study('results/central.json') }],
  'hm-rules': [{ label: 'incidence_scenarios.py', url: study('analysis/incidence_scenarios.py') }, { label: 'incidence results', url: study('results/incidence/summary_five.csv') }],
  'hm-takeup': [{ label: 'displaced_takeup_runs.py', url: study('analysis/displaced_takeup_runs.py') }, { label: 'takeup_runs.json', url: study('results/takeup/takeup_runs.json') }],
  'hm-draws': [{ label: 'runner.py', url: study('uk_ai_study/runner.py') }, { label: 'central.json', url: study('results/central.json') }],
};

// One small row under each Method section heading, always in that place:
// a code icon, then the code and result files to replicate it (push D,
// Q9.4: "one consistent link row per section"). `id` may list several
// keys, for a section that holds several old ones (What AI changes: the
// shock and the scenarios); their links are joined, duplicates once.
// (The "Used by" links back to the charts were cut in round 2, review item
// E9: one row of links per section at most.)
export default function UsedBy({ id }) {
  const ids = [id].flat();
  const code = ids.flatMap((k) => REPLICATE[k] ?? []).filter((r, i, xs) => xs.findIndex((x) => x.url === r.url) === i);
  if (!code.length) return null;
  return (
    <p className="mx-uses" data-replicate={ids.join(' ')}>
      <Icon name={iconFor('replication')} size={14} className="mx-uses-icon" />
      <span className="mx-uses-label">Replicate</span>
      {code.map((r, i) => (
        <span key={r.url}>
          {i ? ' · ' : ' '}
          <a href={r.url} target="_blank" rel="noreferrer">
            {r.label}
          </a>
        </span>
      ))}
    </p>
  );
}
