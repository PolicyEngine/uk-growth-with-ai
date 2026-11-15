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

// The OBR forecast that part 2's modelling starts from (one constant).
export const MODEL_BASE_VINTAGE = 'March 2026';

// The DSIT/AISI three-way split of UK workers (IMF estimates), in tile order.
export const EXPOSURE_GROUPS = [
  { id: 'workers_high_exposure_high_complementarity', name: 'High exposure, high complementarity', color: 'var(--series-2)' },
  { id: 'workers_high_exposure_low_complementarity', name: 'High exposure, low complementarity', color: 'var(--series-3)' },
  { id: 'workers_low_exposure', name: 'Low exposure', color: 'var(--series-5)' },
].map((g) => ({ ...g, value: FACTS[g.id].value }));

// The DSIT text's rounded total for the two high-exposure groups ("around
// 70%"); the facts' notes record it beside the exact sum.
export const DSIT_AROUND = 70;
