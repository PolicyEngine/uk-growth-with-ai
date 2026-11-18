// Data and code reads its vintages, ledger and changelog from the data
// files; the JSON download carries the same data and context as the CSV.
// (The evidence map's tests are in tabs/literature/evidence.test.jsx.)
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { ledger, LAST_UPDATED, VINTAGES, MODEL_VERSIONS } from '@/tabs/code/ledger.js';
import AI from '@/data/aiStudy2425.json';
import { jsonOf } from '@/components/ui/DownloadMenu.jsx';
import UK from '@/data/ukContext.json';
import S from '@/data/surprise2028.json';

afterEach(cleanup);

describe('Data and code', () => {
  it('the ledger has a row per official figure and states each vintage', () => {
    const rows = ledger(null);
    expect(rows.filter((r) => r.group === 'Official UK data')).toHaveLength(Object.keys(UK.facts).length);
    expect(rows.find((r) => r.group === 'OG-UK results').vintage).toContain(S.source_commit);
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
  it('one vintages table carries both models, each row labelled', () => {
    for (const v of VINTAGES) expect(['OG-UK', 'Household study', '—']).toContain(v.model);
    const text = JSON.stringify(VINTAGES.filter((v) => v.model === 'Household study'));
    // the household study's vintages, which were on Household method
    expect(text).toContain(AI.source.commit.slice(0, 7));
    expect(text).toContain(AI.method.data_build);
    expect(text).toContain(AI.method.manifest_commit.slice(0, 7));
  });
  it('each PolicyEngine-UK version names its model', () => {
    const pe = MODEL_VERSIONS.filter((e) => e.label === 'PolicyEngine-UK');
    expect(pe.map((e) => [e.model, e.value])).toEqual([
      ['OG-UK', '2.90.2'],
      ['Household study', AI.method.policyengine_uk],
    ]);
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

// Item 26 (checks-words2.md): every code block is light, with a plain copy
// icon (aria-label, no visible word); the BibTeX note reads its data date
// and solves commit from the build constants.
describe('code blocks', () => {
  it('the copy control is an icon with an aria-label; the BibTeX note is from the constants', async () => {
    const { render } = await import('@testing-library/react');
    const { NavProvider } = await import('@/lib/nav.jsx');
    const { default: CodeTab } = await import('@/tabs/code/CodeTab.jsx');
    const { version } = await import('@/tabs/code/ledger.js');
    window.history.replaceState(null, '', '/?tab=method&sub=code');
    const { container } = render(
      <NavProvider>
        <CodeTab />
      </NavProvider>,
    );
    const blocks = [...container.querySelectorAll('.copy-block')];
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      const btn = b.querySelector('button.copy-button');
      expect(btn.getAttribute('aria-label')).toMatch(/^Copy the (commands|text)$/);
      expect(btn.textContent.trim()).toBe('');
      expect(btn.querySelector('svg')).not.toBeNull();
    }
    const bib = blocks.find((b) => b.textContent.includes('@misc{'));
    expect(bib.textContent).toContain(`note         = {Data updated ${LAST_UPDATED}; OG-UK solves ${version('solves').value};`);
    expect(bib.querySelector('button').getAttribute('aria-label')).toBe('Copy the text');
  });
});
