import U from '@/data/ukContext.json';

// Items for <SourceLine> (components/ui/SourceLine.jsx): one per series,
// file or document, in the shape { publisher, label, id, date, url, nav,
// kind }. Shared by every figure so the lists read alike.

const UK = U.sources ?? {};

// a readable page for a ukContext source: the ONS series page, not the CSV
// generator the data is fetched from
const readable = (s) => {
  if (s?.page) return s.page;
  const m = String(s?.url ?? '').match(/generator\?format=csv&uri=(\/[^&]+)/);
  return m ? `https://www.ons.gov.uk${m[1]}` : s?.url;
};

// A series or document from data/ukContext.json `sources`, by its key.
// `label` names it as the figure does (else the source's own title);
// `detail` (e.g. "Table A.1") follows the name.
export function ukItem(key, label, detail) {
  const s = UK[key];
  if (!s) return null;
  const name = label ?? s.title;
  return {
    publisher: s.publisher,
    label: detail ? `${name}, ${detail}` : name,
    id: s.series ? String(s.series) : undefined,
    date: s.released,
    url: readable(s),
    kind: s.series ? 'series' : 'document',
  };
}

// A document outside the dashboard.
export const docItem = (label, url, publisher, extra) => (url ? { publisher, label, url, extra, kind: 'document' } : null);

// A result or code file on GitHub.
export const fileItem = (label, url, publisher = 'PolicyEngine', extra) => (url ? { publisher, label, url, extra, kind: 'file' } : null);

// A section of the dashboard (Method, Explore), opened in place.
export const navItem = (label, tab, anchor, sub) => ({ label, nav: { tab, sub, anchor } });
