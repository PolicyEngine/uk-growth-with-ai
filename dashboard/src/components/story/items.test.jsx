// Recap: "What you just learned", a chip row of links to each fact's home.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Recap } from './Items.jsx';

afterEach(cleanup);

describe('Recap', () => {
  it('renders a titled nav of icon chips linking to each home', () => {
    const { container } = render(
      <Recap
        items={[
          { icon: 'gdp', text: 'Growth slowed after 2008', to: 'p1-output' },
          { icon: 'labour', text: 'Pay tracks productivity', to: { tab: 'explore', sub: 'who', anchor: 'who-wall' } },
          null,
        ]}
      />,
    );
    const nav = container.querySelector('nav.story-recap');
    expect(nav.getAttribute('aria-label')).toBe('What you just learned');
    expect(nav.querySelector('.story-recap-title svg')).not.toBeNull();
    const links = [...nav.querySelectorAll('li a.story-recap-chip')];
    expect(links).toHaveLength(2);
    expect(links.every((a) => a.querySelector('svg'))).toBe(true);
    expect(links[0].getAttribute('href')).toContain('p1-output');
    expect(links[1].getAttribute('href')).toContain('tab=explore');
    expect(links[1].getAttribute('href')).toContain('who-wall');
  });
  it('renders nothing without items', () => {
    const { container } = render(<Recap items={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
