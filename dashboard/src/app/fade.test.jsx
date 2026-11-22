// The site's fade rule (pushE-rulings.md, "The Method fade"): no page, tab
// panel or sub-panel fades in on first show. A panel fades only after the
// reader changes tab or sub-tab (is-swap), the fade's end clears it, and
// two fades never nest.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

const stub = (name) => ({ default: () => <p>{name}</p> });
vi.mock('@/tabs/story/StoryTab.jsx', () => stub('story'));
vi.mock('@/tabs/method/MethodOverview.jsx', () => stub('overview'));
vi.mock('@/tabs/method/MethodTab.jsx', () => stub('how'));
vi.mock('@/tabs/method/InputsPage.jsx', () => stub('inputs'));
vi.mock('@/tabs/literature/LiteratureTab.jsx', () => stub('studies'));
vi.mock('@/tabs/code/CodeTab.jsx', () => stub('code'));
vi.mock('@/tabs/households/HouseholdsMethod.jsx', () => stub('households method'));
vi.mock('@/tabs/households/HouseholdsExplore.jsx', () => stub('households'));
vi.mock('@/tabs/ai/ResultsTab.jsx', () => stub('results'));
vi.mock('@/tabs/explore/AllScenarios.jsx', () => ({ default: () => null, AcrossDebt: () => null }));
vi.mock('@/tabs/cohorts/CohortsTab.jsx', () => ({ default: () => null, WhoFinding: () => null }));
vi.mock('@/components/ui/PageIntro.jsx', () => ({ default: () => null }));

const { default: HomePage } = await import('./page.jsx');

const at = (url) => window.history.replaceState(null, '', url);
const swapped = (c) => [...c.querySelectorAll('.tab-panel.is-swap, .sub-panel.is-swap')].map((el) => el.id);
const click = (c, id) => act(() => fireEvent.click(c.querySelector(`#${id}`)));
const end = (el) => act(() => fireEvent.animationEnd(el));

beforeEach(() => at('/'));
afterEach(cleanup);

describe('no entrance fade on first show', () => {
  for (const url of ['/', '/?tab=method', '/?tab=method&sub=inputs', '/?tab=explore', '/?tab=explore&sub=households'])
    it(`${url}: no tab panel and no sub-panel has is-swap`, () => {
      at(url);
      const { container } = render(<HomePage />);
      expect(container.querySelector('.tab-panel:not([hidden])')).not.toBeNull();
      expect(swapped(container)).toEqual([]);
    });
});

describe('a fade only after a change, one at a time', () => {
  it('a tab change fades the shown panel; its end clears it', () => {
    const { container } = render(<HomePage />);
    click(container, 'tabbtn-method');
    expect(swapped(container)).toEqual(['tab-method']);
    // an inner animation that bubbles up does not clear it
    end(container.querySelector('#method-sub-overview'));
    expect(swapped(container)).toEqual(['tab-method']);
    end(container.querySelector('#tab-method'));
    expect(swapped(container)).toEqual([]);
  });

  it('a sub-tab change fades the new sub-panel and no tab panel', () => {
    at('/?tab=method');
    const { container } = render(<HomePage />);
    click(container, 'method-subbtn-inputs');
    expect(swapped(container)).toEqual(['method-sub-inputs']);
    end(container.querySelector('#method-sub-inputs'));
    expect(swapped(container)).toEqual([]);
    at('/?tab=explore');
    cleanup();
    const ex = render(<HomePage />).container;
    click(ex, 'explore-subbtn-households');
    expect(swapped(ex)).toEqual(['explore-sub-households']);
    end(ex.querySelector('#explore-sub-households'));
    expect(swapped(ex)).toEqual([]);
  });

  it('back to a tab left on a sub-tab: the tab fades, its sub-panel does not', () => {
    at('/?tab=method&sub=inputs');
    const { container } = render(<HomePage />);
    click(container, 'tabbtn-explore');
    expect(swapped(container)).toEqual(['tab-explore']);
    end(container.querySelector('#tab-explore'));
    click(container, 'tabbtn-method');
    expect(container.querySelector('#method-sub-inputs')).not.toBeNull();
    expect(swapped(container)).toEqual(['tab-method']);
  });

  it('Back (popstate) to another tab fades it; the first read never does', () => {
    at('/?tab=method');
    const { container } = render(<HomePage />);
    expect(swapped(container)).toEqual([]);
    at('/?tab=explore');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(swapped(container)).toEqual(['tab-explore']);
  });
});

describe('the CSS: entrance fades only behind is-swap', () => {
  const css = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
  // each rule's selector and body, comments dropped
  const rules = (text) => [...text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2]]);
  for (const f of ['story.css', 'globals.css', 'v2.css'])
    it(`${f}: no .tab-panel or .sub-panel animation outside .is-swap`, () => {
      const bad = rules(css(f)).filter(([sel, body]) => /\.(tab|sub)-panel/.test(sel) && /animation\s*:/.test(body) && !/animation\s*:\s*none/.test(body) && !/\.is-swap/.test(sel));
      expect(bad.map(([sel]) => sel)).toEqual([]);
    });
  it('the panel fades sit inside a no-preference media query', () => {
    expect(css('story.css')).toMatch(/@media screen and \(prefers-reduced-motion: no-preference\) \{\s*\.tab-panel\.is-swap:not\(\[hidden\]\) \{\s*animation: panel-in 200ms/);
    expect(css('v2.css')).toMatch(/@media screen and \(prefers-reduced-motion: no-preference\) \{\s*\.sub-panel\.is-swap \{\s*animation: sub-in 180ms/);
  });
});
