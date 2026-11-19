'use client';

import SourceLine from '@/components/ui/SourceLine.jsx';
import UK from '@/data/ukContext.json';
import S from '@/lib/activeData.js';

// The page's "As of" stamp, shown once in the shell: a quiet icon button
// (components/ui/SourceLine.jsx, "As of: data releases") that opens the
// latest ONS release and the latest OBR release the dashboard reads
// (data/ukContext.json, each linked to its source), and the commit the
// model results were built from (data/surprise2028.json source_commit,
// linked on GitHub). Nothing of it shows at rest.
//
//   <AsOf />            (className to place it, e.g. in the scope strip)
const REPO = 'https://github.com/PolicyEngine/uk-growth-with-ai';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDay = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

// a readable page, not a CSV download: ONS generator links become the
// series page they export
export const readable = (url) => String(url ?? '').replace(/^https:\/\/www\.ons\.gov\.uk\/generator\?format=csv&uri=/, 'https://www.ons.gov.uk');

// the source with the latest release date among those whose publisher matches
export function latestRelease(sources, publisher) {
  return Object.values(sources)
    .filter((s) => s.publisher === publisher && s.released)
    .reduce((best, s) => (!best || s.released > best.released ? s : best), null);
}

// The stamp's items: each release (publisher, title, date, link) and the
// model commit.
export function asOfItems() {
  const ons = latestRelease(UK.sources, 'Office for National Statistics');
  const obr = latestRelease(UK.sources, 'Office for Budget Responsibility');
  const commit = S.source_commit;
  const rel = (x) => x && { publisher: x.publisher, label: `Latest release read: ${x.title}`, id: x.series ? String(x.series) : undefined, date: x.released, url: readable(x.url), kind: 'release' };
  return [rel(ons), rel(obr), commit ? { publisher: 'PolicyEngine', label: 'Model results', id: `commit ${commit}`, url: `${REPO}/commit/${commit}`, kind: 'release' } : null].filter(Boolean);
}

// `inline`: a span inside the shell's one meta line (page.jsx).
export default function AsOf({ className = '', inline = false }) {
  return (
    <span className={`as-of${inline ? ' is-inline' : ''} ${className}`.trim()}>
      <SourceLine items={asOfItems()} label="As of: data releases and model results" />
    </span>
  );
}
