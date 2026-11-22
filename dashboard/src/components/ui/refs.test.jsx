// One reference list, one citation format (Method redesign, section 7):
// the registry holds every id a model page cites; Evidence lists every
// source with its anchor; Ahmadi (2026) has one URL on every Method page;
// the external mark is CSS only.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { NavProvider } from '@/lib/nav.jsx';
import { PAGES, renderPage } from '@/lib/probeTestUtils.jsx';
import { SOURCES } from '@/data/literature.js';
import { AHMADI_URL, HOUSEHOLD_REFS, MACRO_REFS, REF_GROUPS, REFERENCES } from '@/data/references.js';
import RefList from '@/components/ui/RefList.jsx';
import CiteFoot from '@/components/ui/CiteFoot.jsx';
import StudiesTab from '@/tabs/literature/LiteratureTab.jsx';
import HouseholdsMethod from '@/tabs/households/HouseholdsMethod.jsx';
import { CITE_TEXT } from '@/tabs/code/cite.js';

afterEach(cleanup);

const METHOD_PAGES = [...PAGES.filter(([name]) => /^(method|evidence|data and code)/.test(name)), ['method households', 'tab=method&sub=households', HouseholdsMethod]];

describe('one reference list', () => {
  it('every reference a model page cites is in the registry, with a key and a URL', () => {
    for (const id of [...MACRO_REFS, ...HOUSEHOLD_REFS]) {
      expect(REFERENCES[id], id).toBeTruthy();
      expect(REFERENCES[id].key, id).toBeTruthy();
      expect(REFERENCES[id].url, id).toMatch(/^https:\/\//);
      expect(REF_GROUPS.map((g) => g.id), id).toContain(REFERENCES[id].group);
    }
  });

  it('author-year keys carry their year in brackets', () => {
    for (const [id, r] of Object.entries(REFERENCES)) if (/\b(19|20)\d\d\b/.test(r.key) && !/^(OBR|IMF|ONS|BoE|DSIT|PwC|IPPR|Bank|Government)/.test(r.key) && /[A-Z][a-z]+ (et al\.|and [A-Z])|^[A-Z][a-z]+ \(/.test(r.key)) expect(r.key, id).toMatch(/\((19|20)\d\d\)$/);
  });

  it('Evidence lists every source under #sources with its anchor, in four groups', () => {
    window.history.replaceState(null, '', '/?tab=method&sub=studies');
    const { container } = render(
      <NavProvider>
        <StudiesTab />
      </NavProvider>,
    );
    expect(container.querySelector('#sources h2').textContent).toBe('Sources');
    for (const id of ['src-uk', 'src-model', 'src-household', 'src-software']) expect(container.querySelector(`#${id}`), id).not.toBeNull();
    for (const id of Object.keys(SOURCES)) expect(container.querySelector(`#src-${id}`), id).not.toBeNull();
    for (const id of Object.keys(REFERENCES)) expect(container.querySelectorAll(`#src-${id}`), id).toHaveLength(1);
  });

  it('on every Method page, a link that reads "Ahmadi (2026)" goes to the paper', () => {
    let n = 0;
    for (const p of METHOD_PAGES) {
      const { container, unmount } = renderPage(p);
      for (const a of container.querySelectorAll('a')) {
        if (!a.textContent.trim().startsWith('Ahmadi (2026)')) continue;
        n += 1;
        expect(a.getAttribute('href'), p[0]).toBe(AHMADI_URL);
      }
      unmount();
    }
    expect(n).toBeGreaterThan(0);
  }, 60000);

  it('every reference link opens safely, and its text is the reference only (the mark is CSS)', () => {
    const { container } = render(<RefList />);
    const links = container.querySelectorAll('.ref-list a');
    expect(links.length).toBe(Object.keys(REFERENCES).length);
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
      const id = a.closest('li').id.replace(/^src-/, '');
      const r = REFERENCES[id];
      const words = [r.key, r.title, r.loc, r.use, r.read].filter(Boolean).join(' ');
      expect(a.textContent, id).toBe(words);
    }
    const compact = render(<RefList ids={MACRO_REFS} compact />).container;
    expect(compact.querySelectorAll('li[id]')).toHaveLength(0);
    expect(compact.querySelectorAll('li')).toHaveLength(MACRO_REFS.length);
  });

  it('Cite this page: the one-line citation, a copy button and the BibTeX link', () => {
    const { container } = render(<CiteFoot />);
    expect(container.querySelector('h3').textContent).toBe('Cite this page');
    expect(container.querySelector('p.page-cite[data-cite]').textContent).toBe(CITE_TEXT);
    expect(container.querySelector('button[aria-label="Copy the text"]')).not.toBeNull();
    const a = [...container.querySelectorAll('a')].find((x) => x.textContent.startsWith('BibTeX: Data and code, Cite this work'));
    expect(a.getAttribute('href')).toMatch(/tab=method&sub=code#cite$/);
  });
});
