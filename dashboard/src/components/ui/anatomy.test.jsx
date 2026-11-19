// The card shell's own test (consolidated-design-fable.md §2 and §6; push C,
// lane C0): every chart card on Explore and Method is the one Card, its
// slots in order, with one title icon, a title with no full stop, at most
// one unit line, at most one legend, one closed "More info" and a short
// unit (item-36-fable.md: 60 characters or fewer). A Finding lead takes no
// full stop. The joins rule: a label and its figure never run together in
// a card's text.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { NavProvider } from '@/lib/nav.jsx';
import Card from '@/components/ui/Card.jsx';
import Finding from '@/components/ui/Finding.jsx';
import Legend from '@/components/ui/Legend.jsx';
import ModelLine from '@/components/ui/ModelLine.jsx';
import ResultsTab from '@/tabs/ai/ResultsTab.jsx';
import AllScenarios, { AcrossDebt } from '@/tabs/explore/AllScenarios.jsx';
import WhoGainsTab from '@/tabs/cohorts/CohortsTab.jsx';
import MethodTab from '@/tabs/method/MethodTab.jsx';
import StudiesTab from '@/tabs/literature/LiteratureTab.jsx';
import HouseholdsExplore from '@/tabs/households/HouseholdsExplore.jsx';
import CodeTab from '@/tabs/code/CodeTab.jsx';

afterEach(cleanup);

// the slot a direct child of a card fills (null: not a slot, e.g. a
// Households flag kept in `foot` until item 24)
const SLOT = [
  ['card-head', 1],
  ['card-model-row', 2],
  ['card-finding', 3],
  ['card-unit', 4],
  ['card-legend', 5],
  ['chart-plot', 6],
  ['more-info', 8],
  ['story-link', 9],
];
const slotOf = (el) => SLOT.find(([c]) => el.classList.contains(c))?.[1] ?? null;
const outsideFold = (card, sel) => [...card.querySelectorAll(sel)].filter((e) => !e.closest('[data-more-info]'));
const flat = (el) => el.textContent.replace(/\s+/g, ' ').trim();

// every card on a page, with what breaks the anatomy
function audit(container) {
  const out = [];
  for (const card of container.querySelectorAll('article.card:not(.info)')) {
    const id = card.id || flat(card.querySelector('.card-head h3') ?? card).slice(0, 30);
    const why = [];
    const slots = [...card.children].map(slotOf).filter((x) => x != null);
    if (slots.some((x, i) => i && x < slots[i - 1])) why.push(`slots out of order: ${slots.join(',')}`);
    const head = card.querySelector('.card-head h3');
    if (head && head.querySelectorAll('.card-icon').length > 1) why.push('more than one title icon');
    const title = head ? [...head.children].find((c) => c.tagName === 'SPAN' && !c.matches('.card-icon, [aria-hidden="true"], [data-source-line]')) : null;
    if (title && /\.$/.test(flat(title))) why.push('title ends in a full stop');
    if (card.querySelectorAll(':scope > .card-unit').length > 1) why.push('two unit lines');
    const legends = outsideFold(card, '.ch-legend, .line-key, .ex-wall-legend');
    if (legends.length > 1) why.push(`${legends.length} legends`);
    const folds = [...card.querySelectorAll('.disclosure')];
    if (folds.length > 1) why.push(`${folds.length} folds`);
    for (const f of folds) {
      const t = f.querySelector('.disclosure-title > span');
      if (flat(t) !== 'More info') why.push(`fold titled "${flat(t)}"`);
      if (f.querySelector('.disclosure-toggle').getAttribute('aria-expanded') !== 'false') why.push('fold open on load');
    }
    const unit = card.querySelector(':scope > .card-unit');
    if (unit && flat(unit).length > 60) why.push(`unit ${flat(unit).length} characters: ${flat(unit)}`);
    // check_sources.mjs: a chart card has one Sources and notes button
    // (links only now: a card with no links would lose it)
    if (card.querySelector(':scope > .chart-plot') && card.querySelectorAll('[data-source-line]').length !== 1) why.push(`${card.querySelectorAll('[data-source-line]').length} sources buttons`);
    const link = card.querySelector(':scope > .story-link');
    if (link && slotOf([...card.children].filter((c) => slotOf(c) != null).at(-1)) !== 9) why.push('story link not last');
    if (why.length) out.push(`${id}: ${why.join('; ')}`);
  }
  return out;
}

const page = (el, query = '') => {
  window.history.replaceState(null, '', `/?${query}`);
  return render(<NavProvider>{el}</NavProvider>);
};

describe('the card shell', () => {
  it('draws the slots in order, the unit line and legend above the chart', () => {
    const { container } = page(
      <Card
        id="x"
        icon="gdp"
        title="GDP is above the path"
        model="oguk"
        controls={<button type="button">pill</button>}
        lead="One sentence."
        unit="% gap vs forecast path"
        legend={<Legend items={[{ key: 'a', label: 'A', color: 'red' }]} />}
        about={{ caveats: 'A caveat.' }}
        notes={[{ icon: 'caveat', text: 'A note with 1.2%.' }]}
        more={[{ label: 'Compared with', text: 'The path.' }]}
        sources={[{ label: 'Method', nav: { tab: 'method', anchor: 'm-model' } }]}
        story={{ anchor: 'p2-shock', name: 'the shock' }}
      >
        <svg />
      </Card>,
    );
    const card = container.querySelector('#x');
    expect([...card.children].map(slotOf)).toEqual([1, 2, 3, 4, 5, 6, 8, 9]);
    expect(card.querySelector('.card-model-row .model-line').textContent).toContain('OG-UK');
    expect(audit(container)).toEqual([]);
  });

  it('routes every word into one closed More info, in the fixed sub-head order; the book icon keeps the sources', () => {
    const { container } = page(
      <Card
        id="y"
        title="T"
        about={{ how: 'How.', caveats: 'Caveat.', read: 'Read.', sources: 'Source words.' }}
        notes={[{ icon: 'caveat', text: 'Note.' }]}
        essential="Essential."
        more={[{ label: 'Measure', text: 'M.' }]}
        sources={[{ label: 'Method', nav: { tab: 'method', anchor: 'm-model' } }]}
      >
        <svg />
      </Card>,
    );
    const fold = container.querySelector('#y-more');
    expect(fold.querySelector('.disclosure-toggle').textContent.trim()).toBe('More info');
    expect(fold.querySelector('.disclosure-content').hidden).toBe(true);
    const more = fold.querySelector('[data-more-info]');
    expect([...more.querySelectorAll('.ex-fin-more-head')].map(flat)).toEqual(['How to read', 'How it’s calculated', 'Caveats']);
    // item 36's rows first under How to read, each head and text with a space
    expect(flat(more.querySelector('[data-group="read"] .ex-fin-more-line'))).toBe('Measure M.');
    for (const t of ['Read.', 'How.', 'Caveat.', 'Note.', 'Essential.']) expect(more.textContent).toContain(t);
    // source words stay with the links, behind the book icon
    expect(more.textContent).not.toContain('Source words.');
    // no hidden duplicate record, no essential line outside the fold
    expect(container.querySelectorAll('[data-source-notes], .src-essential')).toHaveLength(0);
    expect(container.querySelector('.src-line-btn')).not.toBeNull();
  });

  it('the audit catches a broken card', () => {
    const { container } = page(
      <article className="card" id="bad">
        <header className="card-head">
          <h3>
            <span className="card-icon" />
            <span className="card-icon" />
            <span>A title.</span>
          </h3>
        </header>
        <div className="chart-plot" />
        <p className="card-unit">A unit line that is far too long to stay outside More info, so it fails</p>
        <p className="card-unit">Two</p>
        <div className="card-legend">
          <Legend items={[{ key: 'a', label: 'A' }]} />
          <Legend items={[{ key: 'b', label: 'B' }]} />
        </div>
      </article>,
    );
    const [line] = audit(container);
    for (const w of ['slots out of order', 'more than one title icon', 'title ends in a full stop', 'two unit lines', '2 legends', 'unit 7']) expect(line).toContain(w);
  });

  it('a card with nothing to say has no fold, and no model row without a model or a pill', () => {
    const { container } = page(
      <Card id="z" title="T">
        <svg />
      </Card>,
    );
    expect(container.querySelector('.disclosure')).toBeNull();
    expect(container.querySelector('.card-model-row')).toBeNull();
  });

  it('a Finding lead has no full stop; its lines keep theirs', () => {
    const { container } = render(<Finding lead="Pay falls." lines={['A line.']} />);
    expect(container.querySelector('.finding-lead').textContent).toBe('Pay falls');
    expect(container.querySelector('.finding-lines li').textContent).toBe('A line.');
    const { container: c2 } = render(<Finding lead={<span data-claim="lead">Pay rises.</span>} />);
    expect(c2.querySelector('[data-claim="lead"]').textContent).toBe('Pay rises');
  });

  it('the model line keeps a space between its segments', () => {
    const { container } = page(<ModelLine />);
    expect(flat(container.querySelector('.model-line'))).toMatch(/^Household study PolicyEngine UK \S/);
  });

  it('the legend draws one swatch and one name per entry, the current one marked', () => {
    const { container } = render(<Legend label="Versions" items={[{ key: 'a', label: 'A', color: 'red', current: true }, { key: 'b', label: 'B', kind: 'dashed' }, null]} />);
    const lis = container.querySelectorAll('li');
    expect(lis).toHaveLength(2);
    expect(lis[0].getAttribute('aria-current')).toBe('true');
    expect(lis[1].querySelector('.ch-swatch.is-dashed')).not.toBeNull();
  });
});

// Every Explore and Method page, default settings and the states that add
// lines (closure "both", the other budget assumptions)
const PAGES = [
  ['Explore, income and economy', <ResultsTab key="i" sub="income" />, 'tab=explore&sub=economy'],
  ['Explore, economy wall', <ResultsTab key="e" sub="economy" />, 'tab=explore&sub=economy'],
  ['Explore, economy, both', <ResultsTab key="ib" sub="income" />, 'tab=explore&sub=economy&closure=both'],
  ['Explore, public finances', <ResultsTab key="f" sub="finances" />, 'tab=explore&sub=finances'],
  ['Explore, public finances, both, fixed', <ResultsTab key="ff" sub="finances" />, 'tab=explore&sub=finances&closure=both&rule=fixed'],
  ['Explore, across scenarios', <AllScenarios key="a" />, 'tab=explore&sub=economy'],
  ['Explore, debt across scenarios', <AcrossDebt key="d" />, 'tab=explore&sub=finances'],
  ['Explore, who gains', <WhoGainsTab key="w" />, 'tab=explore&sub=who'],
  ['Explore, who gains, both', <WhoGainsTab key="wb" />, 'tab=explore&sub=who&closure=both'],
  ['Explore, households', <HouseholdsExplore key="h" />, 'tab=explore&sub=households'],
  ['Method, OG-UK', <MethodTab key="m" />, 'tab=method&sub=how'],
  ['Method, evidence', <StudiesTab key="s" />, 'tab=method&sub=studies'],
  ['Method, data and code', <CodeTab key="c" />, 'tab=method&sub=code'],
];

describe('every Explore and Method card meets the anatomy', () => {
  for (const [name, el, query] of PAGES) {
    it(name, () => {
      const { container } = page(el, query);
      expect(container.querySelectorAll('article.card').length, name).toBeGreaterThan(0);
      expect(audit(container)).toEqual([]);
    });
  }
});
