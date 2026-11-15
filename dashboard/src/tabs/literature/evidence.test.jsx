// Method and sources > Evidence: the UK evidence map holds every published
// figure once, with its source, baseline, country and checked date; the
// range charts draw its plotted rows; OG-UK's rows come from surprise2028.json
// and print no figure on the page; the growth check uses the October 2026 EFO.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import MAP from '@/data/site-evidence-map.json';
import { CHANNELS, OBR_GROWTH, RANGES, SOURCES } from '@/data/literature.js';
import EvidenceMap, { mapTable, ourRows, view } from '@/tabs/literature/EvidenceMap.jsx';
import { growthPairs } from '@/tabs/literature/GrowthCheck.jsx';
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
    for (const off of ['Klein Teeselink', 'Eloundou', '1.63', 'Chandar', 'Hartley', 'Goldman']) expect(text).not.toContain(off);
  });
  it('bodies with no AI-specific estimate say so and give their nearest output', () => {
    const none = MAP.rows.filter((r) => r.metric === 'none');
    expect(none.map((r) => r.institution).sort()).toEqual(['DWP', 'HM Treasury', 'HMRC', 'Resolution Foundation']);
    for (const r of none) {
      expect(r.value).toMatch(/^No quantified estimate/);
      expect(r.measure).toMatch(/^Nearest output/);
    }
  });
});

describe('Where our numbers sit reads the map', () => {
  it('joins rows into one bar and keeps the flags', () => {
    const ifs = RANGES.gdp.find((r) => r.ids.includes('ifs-gb26-capital'));
    expect([ifs.lo, ifs.hi]).toEqual([1.6, 2.5]);
    expect(ifs.ids).toEqual(['ifs-gb26-capital', 'ifs-gb26-tfp']);
    const obr = RANGES.wage.find((r) => r.ids.includes('obr-efo-mar26-wage'));
    expect(obr.none).toBe(true);
    expect(RANGES.wage.find((r) => r.ids.includes('acemoglu-wage')).unverified).toBe(true);
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
  it('renders every row plus OG-UK’s, and filters by measure and country', () => {
    const { container } = render(<EvidenceMap />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(MAP.rows.length + 2);
    fireEvent.click(screen.getByRole('radio', { name: 'No quantified estimate' }));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(4);
    fireEvent.click(screen.getByRole('radio', { name: 'GDP or output' }));
    const gdp = MAP.rows.filter((r) => r.metric === 'gdp').length;
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
    for (const r of MAP.rows) {
      const expected = MAP.rows.filter((x) => x.value.includes(r.value)).length;
      expect(text.split(r.value).length - 1, r.id).toBe(expected);
    }
  });
});
