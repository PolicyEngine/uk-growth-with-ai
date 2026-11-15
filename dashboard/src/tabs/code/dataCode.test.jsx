// Data and code reads its vintages, ledger and changelog from the data
// files; the evidence map renders whatever rows its file holds; the JSON
// download carries the same data and context as the CSV.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ledger, LAST_UPDATED, VINTAGES } from '@/tabs/code/ledger.js';
import EvidenceMap from '@/tabs/literature/EvidenceMap.jsx';
import { jsonOf } from '@/components/ui/DownloadMenu.jsx';
import MAP from '@/data/site-evidence-map.json';
import UK from '@/data/ukContext.json';
import S from '@/data/surprise2028.json';

afterEach(cleanup);

describe('Data and code', () => {
  it('the ledger has a row per official figure and states each vintage', () => {
    const rows = ledger(null);
    expect(rows.filter((r) => r.group === 'Official UK data')).toHaveLength(Object.keys(UK.facts).length);
    expect(rows.find((r) => r.group === 'Our results').vintage).toContain(S.source_commit);
    // with checks, the release date and check come from the checks file
    const id = Object.keys(UK.facts)[0];
    const withChecks = ledger({ figures: [{ id, release_date: '2099-01-01', read_by: 'probe' }] });
    expect(withChecks[0].vintage).toContain('2099-01-01');
    expect(withChecks[0].checked).toContain('probe');
  });
  it('the last-updated stamp is the latest build date', () => {
    expect(LAST_UPDATED >= S.generated_utc.slice(0, 10)).toBe(true);
    expect(VINTAGES.map((v) => v.file)).toContain('surprise2028.json');
  });
});

describe('UK evidence map', () => {
  it('says it is being compiled while empty', () => {
    const { container } = render(<EvidenceMap />);
    expect(MAP.rows).toHaveLength(0);
    expect(container.textContent).toContain('being compiled');
    expect(container.textContent).toContain('Bank of England');
  });
  it('renders rows when the file has them', () => {
    const map = { ...MAP, rows: [{ organisation: 'OBR', title: 'A study', url: 'https://example.org', date: '2026', measure: 'GDP', horizon: '2030', finding: 'x', method: 'y' }] };
    const { container } = render(<EvidenceMap map={map} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(container.querySelector('a[href="https://example.org"]').textContent).toBe('A study');
  });
});

describe('JSON download', () => {
  it('keys each row by column and keeps the context', () => {
    const j = jsonOf({ title: 'T', context: 'C', table: { columns: ['Year', 'Gap (%)'], rows: [[2031, 0.5], [2032, null]] } });
    expect(j.rows).toEqual([{ Year: 2031, 'Gap (%)': 0.5 }, { Year: 2032, 'Gap (%)': null }]);
    expect(j.context).toBe('C');
    expect(j.source).toContain('PolicyEngine');
  });
});
