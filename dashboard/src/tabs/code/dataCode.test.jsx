// Data and code reads its vintages, ledger and changelog from the data
// files; the JSON download carries the same data and context as the CSV.
// (The evidence map's tests are in tabs/literature/evidence.test.jsx.)
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { ledger, LAST_UPDATED, VINTAGES } from '@/tabs/code/ledger.js';
import { jsonOf } from '@/components/ui/DownloadMenu.jsx';
import UK from '@/data/ukContext.json';
import S from '@/data/surprise2028.json';

afterEach(cleanup);

describe('Data and code', () => {
  it('the ledger has a row per official figure and states each vintage', () => {
    const rows = ledger(null);
    expect(rows.filter((r) => r.group === 'Official UK data')).toHaveLength(Object.keys(UK.facts).length);
    expect(rows.find((r) => r.group === 'Our results').vintage).toContain(S.source_commit);
    // with the checks file, one row per printed figure, from that file
    const id = Object.keys(UK.facts)[0];
    const withChecks = ledger({ figures: [{ id, publisher: 'ONS', dataset: 'PN2', series_id: 'X', period: '2025', release_date: '2099-01-01', read_by: 'probe', url: 'u' }] });
    expect(withChecks.filter((r) => r.group === 'Official UK data')).toHaveLength(1);
    expect(withChecks[0].vintage).toContain('2099-01-01');
    expect(withChecks[0].how).toBe('probe');
    expect(withChecks[0].figure).toContain(UK.facts[id].label);
  });
  it('the last-updated stamp is the latest build date', () => {
    expect(LAST_UPDATED >= S.generated_utc.slice(0, 10)).toBe(true);
    expect(VINTAGES.map((v) => v.file)).toContain('surprise2028.json');
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
