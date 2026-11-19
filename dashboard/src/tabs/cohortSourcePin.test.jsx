// Push C keeps every cohort link and label at the published commit 2558375
// (lib/dataKeys.js COHORT_SOURCE_COMMIT), not the file's own source
// (79c006d, not on GitHub). The swap removes the pin and this test.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { NavProvider } from '@/lib/nav.jsx';
import { COHORTS, COHORT_SOURCE, COHORT_SOURCE_COMMIT } from '@/lib/dataKeys.js';
import { OG_RESULT_URLS, COHORTS_SHA } from '@/tabs/ai/links.js';
import { VINTAGES, ledger } from '@/tabs/code/ledger.js';
import { COHORT_URL } from '@/tabs/story/part2/sources.jsx';
import ExploreTab from '@/tabs/explore/ExploreTab.jsx';

afterEach(cleanup);
const FILE_COMMIT = String(COHORTS.source).split('@')[1];

describe('the cohort source pin', () => {
  it('every built link and label names 2558375', () => {
    expect(COHORT_SOURCE_COMMIT).toBe('2558375');
    expect(COHORTS_SHA).toBe('2558375');
    expect(OG_RESULT_URLS.cohortScript).toContain('/2558375/');
    expect(COHORT_URL).toContain('/2558375/');
    expect(COHORT_SOURCE).toBe('uk-growth-with-ai@2558375');
    const v = VINTAGES.find((r) => r.what === 'Who gains');
    expect(v.vintage).toContain('@2558375');
    expect(ledger().find((r) => r.figure.startsWith('Who gains')).vintage).toBe(COHORT_SOURCE);
  });
  it('the rendered Who gains page links the cohort script at the pin, never the file’s own commit', () => {
    window.history.replaceState(null, '', '/?tab=explore&sub=who');
    const { container } = render(
      <NavProvider>
        <ExploreTab />
      </NavProvider>,
    );
    // open every sources popover so their links render
    for (const b of container.querySelectorAll('button.src-line-btn')) fireEvent.click(b);
    const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    const script = hrefs.filter((h) => h.includes('paper/cohort_welfare.py') || h.includes('paper/main.tex'));
    expect(script.length).toBeGreaterThan(0);
    for (const h of script) expect(h).toContain('/2558375/');
    if (FILE_COMMIT !== COHORT_SOURCE_COMMIT) expect(hrefs.some((h) => h.includes(FILE_COMMIT))).toBe(false);
    expect(document.body.textContent).not.toContain(FILE_COMMIT === COHORT_SOURCE_COMMIT ? '\u0000' : FILE_COMMIT);
  });
});
