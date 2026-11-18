// Chart actions: "Copy link to this chart" and the About fold's replication line.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import DownloadMenu, { chartLink, studyCaption } from './DownloadMenu.jsx';
import { AboutFold } from './Card.jsx';

afterEach(cleanup);

describe('chart actions', () => {
  it('chartLink keeps the current choices and adds the anchor', () => {
    const href = (tab, { sub, anchor }) => `/?tab=${tab}${sub ? `&sub=${sub}` : ''}&s=uk_high#${anchor}`;
    expect(chartLink(href, { tab: 'explore', sub: 'finances' }, 'debt-gdp', 'http://x.test/?tab=story')).toBe('http://x.test/?tab=explore&sub=finances&s=uk_high#debt-gdp');
  });
  it('the menu offers copy link next to the downloads, and copies on click', async () => {
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => (copied = t) } });
    const ref = { current: null };
    const { container, findByText } = render(
      <div id="debt-gdp" ref={ref}>
        <DownloadMenu title="Debt" table={{ columns: ['a'], rows: [[1]] }} cardRef={ref} />
      </div>,
    );
    fireEvent.click(container.querySelector('.icon-button'));
    const items = [...container.querySelectorAll('.download-item')].map((b) => b.textContent);
    expect(items).toContain('Copy link to this chartWith your settings');
    expect(items).not.toContain('Copy chart imagePNG');
    fireEvent.click([...container.querySelectorAll('.download-item')].find((b) => b.textContent.startsWith('Copy link')));
    await findByText('Link copied');
    expect(copied).toContain('debt-gdp');
  });
  it('the study caption names the model year and drops provisional once merged', () => {
    expect(studyCaption({ model_year_label: 'FY 2027–28', status: 'merged', provisional: false })).toBe('Model: the household study (PolicyEngine UK microsimulation), FY 2027–28');
    expect(studyCaption({ provisional: true })).toContain('provisional');
  });
  it('AboutFold prints a replication line with code and result file links', () => {
    const { container } = render(<AboutFold replication={{ code: 'https://github.com/x/run.py', result: 'https://github.com/x/out.json' }} />);
    const p = container.querySelector('.replication-link');
    expect(p.querySelector('svg')).not.toBeNull();
    expect([...p.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['https://github.com/x/run.py', 'https://github.com/x/out.json']);
  });
});
