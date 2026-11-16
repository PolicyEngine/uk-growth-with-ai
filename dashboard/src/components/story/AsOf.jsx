'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import UK from '@/data/ukContext.json';
import S from '@/data/surprise2028.json';

// The page's "As of" stamp, shown once in the shell: the latest ONS release
// and the latest OBR release the dashboard reads (data/ukContext.json, each
// linked to its source), and the commit the model results were built from
// (data/surprise2028.json source_commit, linked on GitHub). data-cite: a
// citation line (check_text exempts its length; it still leads with an icon).
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

// `inline`: a span inside the shell's one meta line (page.jsx), no icon.
export default function AsOf({ className = '', inline = false }) {
  const ons = latestRelease(UK.sources, 'Office for National Statistics');
  const obr = latestRelease(UK.sources, 'Office for Budget Responsibility');
  const commit = S.source_commit;
  const Tag = inline ? 'span' : 'p';
  return (
    <Tag className={`as-of${inline ? ' is-inline' : ''} ${className}`.trim()} data-cite={inline ? undefined : ''}>
      {inline ? null : <Icon name={iconFor('asOf')} size={14} className="as-of-icon" />}
      <span>
        As of:{' '}
        {ons ? (
          <>
            ONS{' '}
            <a href={readable(ons.url)} target="_blank" rel="noopener noreferrer">
              {fmtDay(ons.released)}
            </a>
          </>
        ) : null}
        {ons && obr ? ' · ' : null}
        {obr ? (
          <>
            OBR{' '}
            <a href={readable(obr.url)} target="_blank" rel="noopener noreferrer">
              {fmtDay(obr.released)}
            </a>
          </>
        ) : null}
        {commit ? (
          <>
            {' · '}model results{' '}
            <a href={`${REPO}/commit/${commit}`} target="_blank" rel="noopener noreferrer">
              <code>{commit}</code>
            </a>
          </>
        ) : null}
      </span>
    </Tag>
  );
}
