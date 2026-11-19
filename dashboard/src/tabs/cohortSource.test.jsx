// Since the swap, every cohort link and label names the active cohort
// file's own source commit (its `source` stamp), never the push C pin
// (2558375, not an ancestor of the pushed head). The paper draft is linked
// on its own pushed branch. scripts/check_links.mjs checks that each linked
// commit is an ancestor of HEAD.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { NavProvider } from '@/lib/nav.jsx';
import { COHORTS, COHORT_SOURCE, COHORT_SOURCE_COMMIT, SET } from '@/lib/dataKeys.js';
import { OG_RESULT_URLS, COHORTS_SHA } from '@/tabs/ai/links.js';
import { VINTAGES, ledger } from '@/tabs/code/ledger.js';
import { COHORT_URL } from '@/tabs/story/part2/sources.jsx';
import ExploreTab from '@/tabs/explore/ExploreTab.jsx';

afterEach(cleanup);
const FILE_COMMIT = String(COHORTS.source).split('@')[1];

describe('the cohort source', () => {
  it('every built link and label names the cohort file’s own commit', () => {
    expect(FILE_COMMIT).toMatch(/^[0-9a-f]{7,}$/);
    expect(COHORT_SOURCE_COMMIT).toBe(FILE_COMMIT);
    expect(COHORTS_SHA).toBe(FILE_COMMIT);
    expect(COHORT_SOURCE).toBe(COHORTS.source);
    expect(OG_RESULT_URLS.cohortScript).toContain(`/${FILE_COMMIT}/`);
    expect(OG_RESULT_URLS.cohortsDir).toBe(`https://github.com/PolicyEngine/uk-growth-with-ai/tree/${FILE_COMMIT}/${SET.cohortsDir}`);
    const row = VINTAGES.find((r) => r.what === 'Who gains');
    expect(row.result.url).toContain(`/tree/${FILE_COMMIT}/${SET.cohortsDir}`);
    expect(row.code.url).toContain(`/${FILE_COMMIT}/`);
    expect(COHORT_URL).toContain(`/${FILE_COMMIT}/`);
    expect(row.vintage).toContain(`@${FILE_COMMIT}`);
    expect(ledger().find((r) => r.figure.startsWith('Who gains')).vintage).toBe(COHORT_SOURCE);
  });
  it('the rendered Who gains page links the cohort files at that commit, never the old pin', () => {
    window.history.replaceState(null, '', '/?tab=explore&sub=who');
    const { container } = render(
      <NavProvider>
        <ExploreTab />
      </NavProvider>,
    );
    for (const b of container.querySelectorAll('button.src-line-btn')) fireEvent.click(b);
    const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    const cohort = hrefs.filter((h) => /paper\/cohort_welfare\.py|\/cohorts$/.test(h));
    expect(cohort.length).toBeGreaterThan(0);
    for (const h of cohort) expect(h).toContain(`/${FILE_COMMIT}/`);
    expect(hrefs.some((h) => h.includes('/2558375/'))).toBe(false);
    expect(hrefs).toContain('https://github.com/PolicyEngine/uk-growth-with-ai/blob/paper/first-draft/paper/main.tex');
  });
});
