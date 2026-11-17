// No list item renders without text (an icon alone reads as an empty bullet
// when the page is copied or read aloud). Covers part 3 and the household
// pages, with every disclosure's content in the DOM, and story part 2.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import Part3 from './Part3.jsx';
import Part2 from './Part2.jsx';
import { NavProvider } from '@/lib/nav.jsx';
import HouseholdsExplore from '@/tabs/households/HouseholdsExplore.jsx';
import HouseholdsMethod from '@/tabs/households/HouseholdsMethod.jsx';

afterEach(cleanup);

const PART = { id: 'story-part-3', n: 3, icon: 'households', kicker: 'Part 3', title: 'Jobs, incomes and the public finances' };
const empties = (container) =>
  [...container.querySelectorAll('li')]
    .filter((li) => li.getAttribute('aria-hidden') !== 'true' && !li.closest('[aria-hidden="true"]'))
    .filter((li) => !li.textContent.trim())
    .map((li) => li.outerHTML.slice(0, 120));

describe('no empty list items', () => {
  it('in story part 2', () => {
    for (const q of ['tab=story', 'tab=story&s=korinek&closure=both', 'tab=story&closure=closed']) {
      window.history.replaceState(null, '', `/?${q}`);
      const { container, unmount } = render(
        <NavProvider>
          <Part2 part={{ id: 'story-part-2', n: 2, icon: 'trend', kicker: 'Part 2', title: 'What a model of the whole economy projects' }} />
        </NavProvider>,
      );
      expect(empties(container), q).toEqual([]);
      unmount();
    }
  });
  it('in story part 3', () => {
    expect(empties(render(<Part3 part={PART} />).container)).toEqual([]);
  });
  it('on Explore > Households', () => {
    expect(empties(render(<HouseholdsExplore />).container)).toEqual([]);
  });
  it('on Method > Household method', () => {
    expect(empties(render(<HouseholdsMethod />).container)).toEqual([]);
  });
});
