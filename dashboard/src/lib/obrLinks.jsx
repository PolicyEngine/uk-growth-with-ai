// Every OBR citation ("¶6.18", "Box 2.2") links to its page in the March 2026
// Economic and fiscal outlook. Page numbers are PDF pages, checked against the
// document's text.
export const EFO_URL =
  'https://assets.publishing.service.gov.uk/media/69a6d7b62e1f4fbda4252208/economic-and-fiscal-outlook-march-2026-web-accessible.pdf';

const PAGES = {
  '1.2': 10,
  '1.3': 10,
  '1.9': 12,
  '1.10': 12,
  '2.10': 25,
  '5.20': 88,
  '6.18': 105,
  'Box 2.2': 35,
};

export const efoPage = (ref) => `${EFO_URL}#page=${PAGES[ref]}`;

const PATTERN = /(¶\s?(\d+\.\d+)|Box 2\.2)/g;

// Split a plain string into text and links for every citation it contains.
export function linkObr(text) {
  if (typeof text !== 'string') return text;
  const out = [];
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const ref = m[2] || m[1];
    if (!PAGES[ref]) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <a key={m.index} href={efoPage(ref)} target="_blank" rel="noreferrer">
        {m[1]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return out;
}
