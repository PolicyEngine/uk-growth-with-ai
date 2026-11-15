// What the Data and code page lists about the data: each data file's
// vintage, a source ledger (figure, source, vintage, date checked) built
// from the files' own source fields, and the date of the latest data build.
// Nothing here is typed: every row is read from a data file.
import S from '@/data/surprise2028.json';
import CO from '@/data/cohorts2028.json';
import AI from '@/data/aiStudy2425.json';
import UK from '@/data/ukContext.json';
import REL from '@/data/relatedWork.json';
import V from '@/data/site-versions.json';
import { SOURCES } from '@/data/literature.js';
import CHECKS from './checksHook.js';

export const VERSIONS = V.entries;
export const version = (id) => V.entries.find((e) => e.id === id);

const day = (t) => (t ? String(t).slice(0, 10) : null);
const shortSha = (x) => String(x).slice(0, 7);

// Each data file and when it was built or read
export const VINTAGES = [
  { file: 'surprise2028.json', what: 'OG-UK results: every Explore chart', vintage: `Built from ${S.source_commit}`, date: day(S.generated_utc) },
  { file: 'cohorts2028.json', what: 'Who gains', vintage: `${CO.generated_by}, ${CO.source}`, date: null },
  { file: 'aiStudy2425.json', what: 'Household study (provisional)', vintage: `${AI.source.repo} #${AI.source.pr} at ${shortSha(AI.source.commit)}, ${AI.source.dataset}`, date: AI.source.fetched },
  { file: 'ukContext.json', what: 'Official UK data (story, part 1)', vintage: `${Object.keys(UK.sources).length} releases, latest ${Object.values(UK.sources).map((s) => s.released).sort().at(-1)}`, date: Object.values(UK.sources).map((s) => s.fetched).sort().at(-1) },
  { file: 'relatedWork.json', what: 'Related PolicyEngine work (story close)', vintage: 'Figures read off the published pages', date: REL.read },
];

// The official releases themselves (ONS, OBR, DSIT), with release dates
export const RELEASES = Object.entries(UK.sources).map(([id, s]) => ({ id, publisher: s.publisher, title: s.title, series: s.series ?? null, released: s.released, fetched: s.fetched, url: s.url }));

// The ledger: one row per figure or group of figures
// Official rows: with ukContextChecks.json, one per figure the story prints
// (each read from its primary file a second way); without it, one per fact
// in ukContext.json, from that file's own source fields.
const FETCHED = Object.values(UK.sources).map((s) => s.fetched).sort().at(-1);
function officialRows(checks) {
  if (checks?.figures?.length)
    return checks.figures.map((c) => ({
      figure: UK.facts[c.id]?.label ? `${UK.facts[c.id].label}, ${c.period}` : `${c.series_id}, ${c.period}`,
      source: `${c.publisher}, ${c.dataset}`,
      url: c.url,
      vintage: `${c.period}; released ${c.release_date}`,
      checked: FETCHED,
      how: c.read_by,
      group: 'Official UK data',
    }));
  return Object.values(UK.facts).map((f) => {
    const src = UK.sources[f.source];
    return { figure: f.label, source: `${src.publisher}, ${src.series ?? src.title}`, url: src.url, vintage: `${f.period}; released ${src.released}`, checked: src.fetched, group: 'Official UK data' };
  });
}

export function ledger(checks = CHECKS) {
  const rows = officialRows(checks);
  rows.push({ figure: 'Every OG-UK result in Explore (gaps against the OBR-central path)', source: 'OG-UK solves, 2028 surprise', vintage: `Solves ${version('solves').value}; data built from ${S.source_commit}`, checked: day(S.generated_utc), group: 'Our results' });
  rows.push({ figure: 'Who gains: welfare by birth year and earnings group', source: CO.generated_by, vintage: CO.source, checked: null, group: 'Our results' });
  rows.push({ figure: 'Household study results (provisional)', source: `${AI.source.repo} #${AI.source.pr}`, vintage: `${shortSha(AI.source.commit)}, ${AI.source.dataset}`, checked: AI.source.fetched, group: 'Our results' });
  for (const s of Object.values(SOURCES)) rows.push({ figure: s.title, source: s.short, url: s.url, vintage: s.loc, checked: null, note: s.read ?? null, group: 'Published studies' });
  for (const it of REL.items) rows.push({ figure: it.title, source: `PolicyEngine, ${it.model}`, url: it.url, vintage: it.country, checked: REL.read, group: 'Related PolicyEngine work' });
  return rows;
}

export const ledgerTable = () => ({
  columns: ['Group', 'Figure', 'Source', 'Vintage', 'Date checked', 'How checked', 'Link'],
  rows: ledger().map((r) => [r.group, r.figure, r.source, r.vintage, r.checked ?? '', r.how ?? '', r.url ?? '']),
});

// The date of the latest data build or read across the files
export const LAST_UPDATED = [day(S.generated_utc), AI.source.fetched, REL.read, ...Object.values(UK.sources).map((s) => s.fetched)].filter(Boolean).sort().at(-1);
export const HAS_CHECKS = Boolean(CHECKS);
