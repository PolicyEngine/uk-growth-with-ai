// What the Data and code page lists about the data: each data file's
// vintage, a source ledger (figure, source, vintage, date checked) built
// from the files' own source fields, and the date of the latest data build.
// Nothing here is typed: every row is read from a data file.
import S from '@/data/surprise2028.json';
import CO from '@/data/cohorts2028.json';
import AI from '@/data/aiStudy2425.json';
import UK from '@/data/ukContext.json';
import REL from '@/data/relatedWork.json';
import EV from '@/data/site-evidence-map.json';
import V from '@/data/site-versions.json';
import { SOURCES } from '@/data/literature.js';
import CHECKS from './checksHook.js';

export const VERSIONS = V.entries;
export const version = (id) => V.entries.find((e) => e.id === id);

const day = (t) => (t ? String(t).slice(0, 10) : null);
const shortSha = (x) => String(x).slice(0, 7);

// The one vintages table: each data file or build, the model it belongs to
// (OG-UK, uk-ai-study, or neither), and when it was built or read. The
// household study's build rows were on Household method until November 2026.
const AIM = AI.method;
export const VINTAGES = [
  { model: 'OG-UK', file: 'surprise2028.json', what: 'OG-UK results: every Explore chart', vintage: `Built from ${S.source_commit}`, date: day(S.generated_utc) },
  { model: 'OG-UK', file: 'cohorts2028.json', what: 'Who gains', vintage: `${CO.generated_by}, ${CO.source}`, date: null },
  { model: 'uk-ai-study', file: 'aiStudy2425.json', what: 'Household study (provisional)', vintage: `${AI.source.repo} #${AI.source.pr} (open draft, branch ${AI.source.branch}) at ${shortSha(AI.source.commit)}, ${AI.source.dataset}`, date: AI.source.fetched, url: `https://github.com/${AI.source.repo}/pull/${AI.source.pr}` },
  { model: 'uk-ai-study', file: 'Results build', what: 'The study’s attested results', vintage: `Per the manifest at ${shortSha(AIM.manifest_commit)}`, date: day(AIM.manifest_finished) },
  { model: 'uk-ai-study', file: 'Data build', what: 'Microcosm UK 2024–25', vintage: AIM.data_build, date: null },
  { model: '—', file: 'ukContext.json', what: 'Official UK data (story, part 1)', vintage: `${Object.keys(UK.sources).length} releases, latest ${Object.values(UK.sources).map((s) => s.released).sort().at(-1)}`, date: Object.values(UK.sources).map((s) => s.fetched).sort().at(-1) },
  { model: '—', file: 'relatedWork.json', what: 'Related PolicyEngine work (Evidence)', vintage: 'Figures read off the published pages', date: REL.read },
];
// Whether the study's results were rebuilt from clean (the manifest's flag)
export const AI_FULL_RERUN = AIM.manifest_full_rerun;

// Software versions, by model. OG-UK's come from site-versions.json (no data
// file records them); uk-ai-study's from aiStudy2425.json's method block.
// The two PolicyEngine-UK versions belong to different pipelines.
export const MODEL_VERSIONS = [
  ...V.entries.map((e) => ({ model: 'OG-UK', ...e })),
  { model: 'uk-ai-study', id: 'ai_pe_uk', label: 'PolicyEngine-UK', value: AIM.policyengine_uk, where: 'aiStudy2425.json: the study’s build' },
  { model: 'uk-ai-study', id: 'ai_pe', label: 'policyengine', value: AIM.policyengine, where: 'aiStudy2425.json: release bundle' },
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
  // the UK evidence map: one row per published figure (its value is printed
  // on Evidence, its home, so the ledger names it without the value)
  for (const r of EV.rows) rows.push({ figure: `${r.institution}: ${r.measure}`, source: r.study, url: r.url, vintage: [r.horizon, r.loc].filter(Boolean).join('; '), checked: r.checked ?? null, how: r.how ?? null, group: 'UK evidence map' });
  return rows;
}

export const ledgerTable = () => ({
  columns: ['Group', 'Figure', 'Source', 'Vintage', 'Date checked', 'How checked', 'Link'],
  rows: ledger().map((r) => [r.group, r.figure, r.source, r.vintage, r.checked ?? '', r.how ?? '', r.url ?? '']),
});

// The date of the latest data build or read across the files
export const LAST_UPDATED = [day(S.generated_utc), AI.source.fetched, REL.read, ...Object.values(UK.sources).map((s) => s.fetched)].filter(Boolean).sort().at(-1);
export const HAS_CHECKS = Boolean(CHECKS);
