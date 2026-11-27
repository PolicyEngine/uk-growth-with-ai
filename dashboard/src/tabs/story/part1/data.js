import U from '@/data/ukContext.json';
import { monthYear } from './format.js';

// Part 1's view of ukContext.json (built by scripts/build_uk_context.py):
// official published data only, no modelling of ours.

export const SERIES = U.series;
export const FACTS = U.facts;
export const SOURCES = U.sources;

// The OBR forecast's vintage, from its source entry's release date
// ("October 2026"), so the label follows the data file.
export const OBR = SERIES.obr_gdp_forecast;
export const OBR_SOURCE = SOURCES[OBR.source];
export const OBR_VINTAGE = monthYear(OBR_SOURCE.released);
export const OBR_LABEL = `OBR forecast, ${OBR_VINTAGE}`;

// The productivity index's base year ("2024 = 100"), from the data file:
// the ONS rebases the series, so no label types it.
export const OPH_BASE = SERIES.productivity_oph.base_year;

// The BICS wave the AI-use figures come from, from its source title.
export const BICS_WAVE = SOURCES[SERIES.business_ai_use.source].title.match(/Wave (\d+)/)[1];

// The OBR forecast that part 2's modelling starts from (one constant).
export const MODEL_BASE_VINTAGE = 'March 2026';

// The DSIT/AISI three-way split of UK workers (IMF estimates), in tile order.
export const EXPOSURE_GROUPS = [
  { id: 'workers_high_exposure_high_complementarity', name: 'High exposure, AI could help (high complementarity)', color: 'var(--rank-1)' },
  { id: 'workers_high_exposure_low_complementarity', name: 'High exposure, AI could replace tasks (low complementarity)', color: 'var(--rank-2)' },
  { id: 'workers_low_exposure', name: 'Low exposure', color: 'var(--rank-3)' },
].map((g) => ({ ...g, value: FACTS[g.id].value }));

// The DSIT text's rounded total for the two high-exposure groups ("around
// 70%"); the facts' notes record it beside the exact sum.
export const DSIT_AROUND = 70;

// Readable pages for the caveats part 1 attributes (ONS methodology and
// bulletins, the IMF papers DSIT cites), from the data file.
export const LINKS = U.links;

// The source a printed figure comes from, from its data-path: a fact's or a
// series' own source (a sum of two facts takes the first one's).
export function sourceOfPath(path) {
  const [kind, key] = path.split(/[.\s]/);
  return (kind === 'series' ? SERIES[key] : FACTS[key])?.source;
}

// A source's readable page (an ONS time-series page, a bulletin, a report),
// never a CSV or spreadsheet download; the download is its secondary link.
export const pageOf = (id) => SOURCES[id]?.page ?? SOURCES[id]?.url;

// The OBR's March 2026 Economic and fiscal outlook (the PDF on GOV.UK),
// whose central productivity growth part 2's no-shock path uses.
export const OBR_MARCH_2026 = 'https://assets.publishing.service.gov.uk/media/69a6d7b62e1f4fbda4252208/economic-and-fiscal-outlook-march-2026-web-accessible.pdf';
