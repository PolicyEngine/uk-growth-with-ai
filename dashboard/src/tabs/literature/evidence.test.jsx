// Method and sources > Evidence: the UK evidence map holds every published
// figure once, with its source, baseline, country and checked date; the
// range charts draw its plotted rows; OG-UK's rows come from surprise2028.json
// and print no figure on the page; the growth check uses the October 2026 EFO.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { pickInPill } from '@/components/ui/pillTestUtils.js';
import MAP from '@/data/site-evidence-map.json';
import { CHANNELS, OBR_GROWTH, RANGES, SOURCES } from '@/data/literature.js';
import EvidenceMap, { mapTable, ourRows, view, hasFigure } from '@/tabs/literature/EvidenceMap.jsx';
import { growthPairs } from '@/tabs/literature/GrowthCheck.jsx';
import RelatedWork from '@/tabs/literature/RelatedWork.jsx';
import EvidenceLanes from '@/tabs/literature/EvidenceLanes.jsx';
import REL from '@/data/relatedWork.json';
import { SCENARIOS, gap, fmt, CENTRAL, BOUND } from '@/tabs/ai/surprise.js';

afterEach(cleanup);

const num = (x) => String(Math.abs(x));

describe('UK evidence map data', () => {
  it('every row names its study, link, metric, value, horizon, baseline, country and checked date', () => {
    const metrics = new Set(MAP.metrics.map((m) => m.id));
    const ids = new Set();
    for (const r of MAP.rows) {
      expect(ids.has(r.id), r.id).toBe(false);
      ids.add(r.id);
      for (const k of ['institution', 'study', 'value', 'horizon', 'baseline', 'country', 'loc', 'measure']) expect(r[k], `${r.id}.${k}`).toBeTruthy();
      expect(r.url, r.id).toMatch(/^https:\/\//);
      expect(metrics.has(r.metric), r.id).toBe(true);
      expect(r.checked, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['read', 'review'], r.id).toContain(r.how);
      expect(Number.isInteger(r.year), r.id).toBe(true);
    }
  });
  it('a plotted row prints the same figure it draws', () => {
    for (const r of MAP.rows.filter((x) => x.plot && !x.none)) {
      expect(r.value, r.id).toContain(num(r.lo));
      expect(r.value, r.id).toContain(num(r.hi));
    }
  });
  it('labels studies of other economies and keeps unchecked figures off', () => {
    for (const id of ['korinek-gdp', 'acemoglu-gdp', 'mrr-2020']) expect(MAP.rows.find((r) => r.id === id).country).toBe('US');
    const text = JSON.stringify(MAP.rows);
    for (const off of ['Eloundou', '1.63', 'Chandar', 'Hartley', 'Goldman']) expect(text).not.toContain(off);
  });
  it('bodies with no AI-specific estimate say so and give their nearest output', () => {
    const none = MAP.rows.filter((r) => r.metric === 'none');
    expect(none.map((r) => r.institution).sort()).toEqual(['DWP', 'HM Treasury', 'HMRC', 'Imas and Schaal', 'Jacob Schaal (King’s College London)', 'ONS', 'Resolution Foundation']);
    for (const r of none) {
      expect(r.value).toMatch(/^No quantified estimate/);
      expect(r.measure).toMatch(/^Nearest output/);
    }
  });
});

describe('Where OG-UK’s results sit reads the map', () => {
  it('joins rows into one bar and keeps the flags', () => {
    const ifs = RANGES.gdp.find((r) => r.ids.includes('ifs-gb26-capital'));
    expect([ifs.lo, ifs.hi]).toEqual([1.6, 2.5]);
    expect(ifs.ids).toEqual(['ifs-gb26-capital', 'ifs-gb26-tfp']);
    const obr = RANGES.wage.find((r) => r.ids.includes('obr-efo-mar26-wage'));
    expect(obr.none).toBe(true);
    // confirmed in NBER w32487 Table 1 (claim audit, 16 Nov 2026): plotted, not flagged
    const ace = RANGES.wage.find((r) => r.ids.includes('acemoglu-wage'));
    expect(ace.unverified).toBe(false);
    expect([ace.lo, ace.hi]).toEqual([0.77, 1.01]);
    const rock = RANGES.wage.find((r) => r.ids.includes('rockall-wage'));
    expect([rock.lo, rock.hi]).toEqual([-0.5, 1.6]);
    for (const r of [...RANGES.gdp, ...RANGES.wage]) {
      expect(r.label).toBeTruthy();
      expect(r.horizon).toBeTruthy();
    }
  });
});

describe('Sources and coverage', () => {
  it('links the OBR documents directly and drops the stale caveats', () => {
    expect(SOURCES.obrBp9.url).toMatch(/Briefing_paper_No\.9/);
    expect(SOURCES.obrEfoOct26.url).toMatch(/assets\.publishing\.service\.gov\.uk/);
    expect(SOURCES.ippr.url).toMatch(/files\.ippr\.org/);
    expect(SOURCES.obrBp9.read).toBeUndefined();
    expect(SOURCES.ippr.read).toBeUndefined();
    expect(SOURCES.acemoglu.title).toContain('10.1093/epolic/eiae042');
  });
  it('the IMF column has no “not stated” cell', () => {
    for (const ch of CHANNELS) expect(ch.cells.imf[0], ch.id).not.toBe('na');
  });
});

describe('Growth check', () => {
  it('compares each year with the October 2026 EFO', () => {
    expect(OBR_GROWTH.growth_pct).toEqual([1.0, 1.6, 1.8, 1.7, 1.6]);
    expect(OBR_GROWTH.src).toBe('obrEfoOct26');
    const p = growthPairs();
    expect(p.map((x) => x.yr)).toEqual([2027, 2028, 2029, 2030]);
    expect(p.map((x) => x.obr)).toEqual([1.0, 1.6, 1.8, 1.7]);
  });
});

describe('Evidence map table', () => {
  it('renders every confirmed row plus OG-UK’s, and filters by measure and country', () => {
    const { container } = render(<EvidenceMap />);
    const confirmed = MAP.rows.filter((r) => !r.unverified);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(confirmed.length + 2);
    pickInPill(container.querySelector('#uk-evidence-map'), 'Measure', 'No quantified estimate');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(MAP.rows.filter((r) => r.metric === 'none').length);
    pickInPill(container.querySelector('#uk-evidence-map'), 'Measure', 'GDP or output');
    const gdp = confirmed.filter((r) => r.metric === 'gdp').length;
    expect(container.querySelectorAll('tbody tr')).toHaveLength(gdp + 1);
    expect(container.querySelector('tbody tr').dataset.row).toBe('oguk-gdp');
  });
  it('OG-UK rows link to Explore and print no figure; the download carries them', () => {
    const { container } = render(<EvidenceMap />);
    const row = container.querySelector('tr[data-row="oguk-gdp"]');
    expect(row.querySelector('a').getAttribute('href')).toContain('explore');
    expect(row.textContent).not.toMatch(/[+−]\d+\.\d\d%/);
    const csv = mapTable(view(ourRows()));
    for (const s of SCENARIOS) {
      expect(csv.rows[0][5]).toContain(fmt(gap(s.id, 'tfp', CENTRAL, 'Y')));
      expect(csv.rows[0][5]).toContain(fmt(gap(s.id, 'tfp', BOUND, 'Y')));
    }
    expect(csv.columns).toContain('Checked');
  });
  it('each published value is printed once in the table', () => {
    const { container } = render(<EvidenceMap />);
    const text = [...container.querySelectorAll('td.ev-value')].map((td) => td.textContent).join('\n');
    const confirmed = MAP.rows.filter((r) => !r.unverified);
    for (const r of confirmed) {
      const expected = confirmed.filter((x) => x.value.includes(r.value)).length;
      expect(text.split(r.value).length - 1, r.id).toBe(expected);
    }
    // a figure not confirmed in a primary text is not printed
    for (const r of MAP.rows.filter((x) => x.unverified)) expect(text, r.id).not.toContain(r.value);
  });
  it('the count of published figures is computed from rows that print a number', () => {
    const { container } = render(<EvidenceMap />);
    const n = MAP.rows.filter((r) => !r.unverified && hasFigure(r)).length;
    expect(n).toBeLessThan(MAP.rows.length);
    expect(container.textContent).toContain(`${n} published figures`);
  });
});

describe('Related PolicyEngine work', () => {
  it('prints its provenance line and each figure, labelled as those pages’ figures', () => {
    const { container } = render(<RelatedWork />);
    const t = container.textContent;
    expect(t).toContain('Figures read off these pages on 15 November 2026');
    expect(t).toContain('not this dashboard’s');
    const s = REL.items.find((x) => x.id === 'income_shift');
    const b = REL.items.find((x) => x.id === 'budget_lab');
    const figs = [s.gini_base, s.gini_full, `−£${s.revenue_min_bn}bn`, `${s.revenue_min_shift_pct}%`, `$${b.rapid_revenue_bn}bn`, `${b.rapid_poverty_pp}pp`];
    for (const fig of figs) expect(t).toContain(fig);
    // R1-16: the package with its version, by its package name
    expect(t).not.toMatch(/PolicyEngine-UK \d/);
    expect(t).toContain('policyengine-uk 4.4.4');
    // R2-28: £bn, and the Gini's scale
    expect(t).toContain('Net-income Gini (0 to 1):');
    for (const it of REL.items) expect(container.querySelector(`a[href="${it.url}"]`)).not.toBeNull();
    expect(container.querySelectorAll('[data-path^="relatedWork.items."]')).toHaveLength(6);
  });
});

describe('Evidence lanes', () => {
  it('give each plotted measure, and the new adoption, exposure and distribution measures, a lane', () => {
    const { container } = render(<EvidenceLanes />);
    for (const k of ['gdp', 'wage', 'adoption', 'exposure', 'distribution']) expect(container.querySelector(`#ranges-${k}`), k).not.toBeNull();
    // OG-UK's rows only where comparable (GDP and wages)
    expect(container.querySelector('#ranges-adoption .is-ours')).toBeNull();
    expect(container.querySelectorAll('#ranges-gdp .is-ours').length).toBeGreaterThan(0);
    // the exposure bar's parts are the row's printed shares
    const row = MAP.rows.find((r) => r.shares);
    for (const x of row.shares) expect(row.value).toContain(`${x.pct}%`);
    expect(container.querySelectorAll('#ranges-exposure .mx-share-part')).toHaveLength(row.shares.length);
  });
});

// Benchmarks review B6: the near-2030 card prints published figures only from
// the map's flagged rows (the map stays their one home in the data), the two
// derived ones from their own homes, and the macro model's from the data.
describe('GDP around the headline year', () => {
  it('reads every published figure from the map and says which are derived', async () => {
    const { default: Near2030, NEAR_ROWS, ourValue } = await import('@/tabs/literature/Near2030.jsx');
    const { container } = render(<Near2030 />);
    const flagged = MAP.rows.filter((r) => r.near2030);
    expect(NEAR_ROWS.map((r) => r.id)).toEqual([...flagged].sort((a, b) => a.near2030.order - b.near2030.order).map((r) => r.id));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(flagged.length + 1);
    const cell = (id) => container.querySelector(`tr[data-row="${id}"] .ev-value`).textContent;
    for (const r of flagged) {
      // a printed row shows the map's own value, or a joined value that
      // contains each joined row's figure
      if (!r.near2030.kind.startsWith('Derived') && !r.near2030.kind.startsWith('Year 4 derived')) {
        if (r.near2030.with) for (const id of [r.id, ...r.near2030.with]) expect(cell(r.id)).toContain(MAP.rows.find((x) => x.id === id).value);
        else if (r.near2030.value) expect(r.near2030.value).toContain(num(r.lo));
        else expect(cell(r.id)).toBe(r.value);
      }
      if (r.near2030.lo != null) {
        expect(cell(r.id)).toContain(`+${r.near2030.lo}%`);
        expect(cell(r.id)).toContain(`+${r.near2030.hi}%`);
      }
    }
    expect(cell('imf-sip-y5')).toContain(MAP.rows.find((r) => r.id === 'imf-sip-y5').value);
    // the three derived figures say so
    expect(flagged.filter((r) => /derived/i.test(r.near2030.kind))).toHaveLength(3);
    // the macro model's figures are the data's
    expect(cell('oguk-near')).toBe(ourValue());
    for (const s of SCENARIOS) expect(ourValue()).toContain(`${gap(s.id, 'tfp', CENTRAL, 'Y') < 0 ? '−' : '+'}${Math.abs(gap(s.id, 'tfp', CENTRAL, 'Y')).toFixed(1)}%`);
  });
});

// María re-review M3, M4, M5, M8: every figure read from its home
describe('María re-review: Evidence', () => {
  it('M4: the IMF note’s multiple and inputs are the data’s; each row has an input cell', async () => {
    const { default: Near2030, imfNote, NEAR_ROWS } = await import('@/tabs/literature/Near2030.jsx');
    const IMF = (await import('@/tabs/literature/imfGap.json')).default;
    const y = gap('uk_central', 'tfp', CENTRAL, 'Y');
    expect(imfNote()).toContain(`about ${(IMF.imf_y4_output_pct / y).toFixed(1)} times`);
    expect(imfNote()).toContain(`(+${IMF.imf_y4_tfp_pct.toFixed(2)}%)`);
    const { container } = render(<Near2030 />);
    for (const sentence of imfNote().split(/(?<=\.) (?=[A-Z])/)) expect(container.querySelector('[data-claim="imf-note"]').textContent).toContain(sentence);
    for (const r of NEAR_ROWS) expect(r.input, r.id).toBeTruthy();
    expect(NEAR_ROWS.find((r) => r.id === 'imf-sip-y5').input).toBe(`TFP +${IMF.imf_y4_tfp_pct.toFixed(2)}% (year 4)`);
    // M7: GO-Science is growth from the 2023 level: out of the table, in Left out
    expect(NEAR_ROWS.some((r) => r.id === 'goscience-2030')).toBe(false);
  });
  it('M5: the OBR row leads with the assumed clock, both sizes from lib/obrOverlap.js', async () => {
    const { NEAR_ROWS } = await import('@/tabs/literature/Near2030.jsx');
    const { ADOPTION, CALENDAR, OBR_YEAR_ONE } = await import('@/lib/obrOverlap.js');
    const v = NEAR_ROWS.find((r) => r.id === 'obr-bp9').value;
    expect(v).toContain(`+${CALENDAR.lo.toFixed(2)}% to +${CALENDAR.hi.toFixed(2)}%`);
    expect(v).toContain(`start in ${OBR_YEAR_ONE}`);
    expect(v).toContain(`+${ADOPTION.lo.toFixed(2)}% to +${ADOPTION.hi.toFixed(2)}%`);
  });
  it('M3: the Korinek tie reads their ranges from the map and ours from the data', async () => {
    const { korinekTie } = await import('@/tabs/literature/EvidenceLanes.jsx');
    const g = MAP.rows.find((r) => r.id === 'korinek-gdp');
    const w = MAP.rows.find((r) => r.id === 'korinek-wage');
    const y = gap('korinek', 'tfp', CENTRAL, 'Y');
    const p = gap('korinek', 'tfp', CENTRAL, 'w');
    const t = korinekTie();
    const f = (x) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(1)}%`;
    expect(t).toContain(`GDP is ${f(y)}`);
    expect(t).toContain(`${y < g.lo ? 'below' : y > g.hi ? 'above' : 'inside'} their range of ${f(g.lo)} to ${f(g.hi)}`);
    expect(t).toContain(`pay rate is ${f(p)}, ${p < w.lo ? 'below' : p > w.hi ? 'above' : 'inside'} their range of ${f(w.lo)} to ${f(w.hi)}`);
    expect(t).not.toContain('same inputs');
  });
  it('M8: the GDP lane is grouped by horizon, the 2030 group first, with a divider for each', () => {
    const { container } = render(<EvidenceLanes />);
    const bands = [...container.querySelectorAll('#ranges-gdp .mx-rb-band')].map((b) => b.dataset.band);
    expect(bands[0]).toBe('near');
    expect(new Set(bands).size).toBe(bands.length);
    const order = { near: 0, decade: 1, long: 2, unstated: 3 };
    const seq = RANGES.gdp.map((r) => order[r.band]);
    expect(seq).toEqual([...seq].sort((a, b) => a - b));
    expect(container.querySelector('#ranges-gdp').textContent).toContain('Only the first group is at the macro model’s horizon.');
  });
});
