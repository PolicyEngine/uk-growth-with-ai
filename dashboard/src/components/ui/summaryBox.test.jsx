// The summary box that opens an Explore page (push D, Q6a): one card
// holding the scope line, the label, the direction chips, the why and the
// caveat, each row led by one icon. Public finances reuses it (Q6e).
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { PAGES, renderPage } from '@/lib/probeTestUtils.jsx';
import SummaryBox, { SummaryLink, SummaryRow } from '@/components/ui/SummaryBox.jsx';
import { NavProvider } from '@/lib/nav.jsx';
import S from '@/lib/activeData.js';

afterEach(cleanup);

const page = (name) => PAGES.find((p) => p[0] === name);

describe('SummaryBox', () => {
  it('draws the scope line, the label and each row with one leading icon, and a link row with an arrow', () => {
    const { container } = render(
      <NavProvider>
        <SummaryBox scope="Macro model · gaps" label="Automation + productivity">
          <SummaryRow icon="why">Why</SummaryRow>
          <SummaryLink tab="explore" sub="finances" anchor="tax-gap">
            Link
          </SummaryLink>
        </SummaryBox>
      </NavProvider>,
    );
    const box = container.querySelector('section.summary-box');
    expect(box.querySelector('.summary-scope').textContent).toBe('Macro model · gaps');
    expect(box.querySelector('.summary-label').textContent).toBe('Automation + productivity');
    expect(box.querySelectorAll('.summary-label svg, .summary-row:not(.summary-link) > :first-child svg')).toHaveLength(2);
    const a = box.querySelector('.summary-link a');
    expect(a.textContent).toBe('Link');
    expect(a.querySelectorAll('svg')).toHaveLength(1);
    expect(a.getAttribute('href')).toContain('tax-gap');
  });
});

describe('Explore › Economy opens with one summary box', () => {
  it('holds the scope, the label, the chips, the why and the note; the model row keeps only the pill', () => {
    const { container } = renderPage(page('explore economy'));
    const intro = container.querySelector('.page-intro');
    const boxes = intro.querySelectorAll('.page-a .summary-box');
    expect(boxes).toHaveLength(1);
    const box = boxes[0];
    expect(box.querySelector('.summary-scope').textContent).toBe('Macro model · gaps against the OBR’s central forecast path');
    expect(box.querySelector('.summary-scope .tip-target')).not.toBeNull();
    expect(box.querySelector('.summary-label').textContent).toBe(`Automation + productivity, ${S.headline_year}`);
    expect(box.querySelectorAll('.ex-chips.is-row .ex-chip')).toHaveLength(3);
    // each row leads with one icon
    for (const row of box.querySelectorAll('.summary-row, .summary-label')) {
      expect(row.firstElementChild.querySelector('svg') ?? (row.firstElementChild.matches('svg') ? row.firstElementChild : null), row.textContent).not.toBeNull();
    }
    expect(box.querySelector('.ex-why-line').textContent).toMatch(/^Why:/);
    // the scope is in the box, not beside the pill
    expect(intro.querySelector('.model-row .model-scope')).toBeNull();
  });
});

describe('Explore › Public finances reuses the summary box (Q6e)', () => {
  it('holds the scope, the finding and its note, each led by an icon, and the tax-gap link row', async () => {
    const { financesFinding } = await import('@/tabs/ai/financesInfo.js');
    const { taxTitleFor } = await import('@/tabs/ai/FinancesSection.jsx');
    const { container } = renderPage(page('explore finances'));
    const intro = container.querySelector('.page-intro');
    const box = intro.querySelector('.page-a #fin-finding.summary-box');
    expect(box).not.toBeNull();
    expect(box.querySelector('.summary-scope').textContent).toBe('Macro model · gaps against the OBR’s central forecast path');
    expect(intro.querySelector('.model-row .model-scope')).toBeNull();
    const f = financesFinding('uk_central', 'central', 'common');
    const lead = box.querySelector('[data-claim="fin-lead"]');
    expect(lead.classList.contains('is-strong')).toBe(true);
    expect(lead.textContent).toBe(f.lead);
    expect(lead.querySelector('.summary-icon')).not.toBeNull();
    const note = box.querySelector('.fin-note');
    expect(note?.textContent ?? null).toBe(f.note);
    if (note) expect(note.querySelector('.summary-icon')).not.toBeNull();
    const link = box.querySelector('.summary-link a');
    expect(link.textContent).toBe(taxTitleFor('uk_central', 'common'));
    expect(link.querySelectorAll('svg')).toHaveLength(1);
    expect(link.getAttribute('href')).toContain('tax-gap');
  });
});
