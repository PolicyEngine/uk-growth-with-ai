// Sensitivities on the macro model's page (Method redesign, 4.5; M10,
// M11): every cell equals fmt() of the value at its data path in the active
// set; every value is restated, so inside [data-axis]; the stress test's
// GDP reads "held"; a row whose record is not done is left out.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { NavProvider } from '@/lib/nav.jsx';
import S from '@/lib/activeData.js';
import { ARMS, HEADLINE_YEAR, YEARS, fmt } from '@/tabs/ai/surprise.js';
import SensitivityGrid, { SENS_ROWS } from './SensitivityGrid.jsx';
import MethodTab from './MethodTab.jsx';

afterEach(cleanup);

// a path is dot-joined with closure keys that contain a dot: rebuild them
const valueAtPath = (p) => {
  const parts = p.split('.');
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    if (/^zk\d$/.test(parts[i]) && /^\d+$/.test(parts[i + 1] ?? '')) {
      out.push(`${parts[i]}.${parts[i + 1]}`);
      i += 1;
    } else out.push(parts[i]);
  }
  const year = Number(out.pop());
  const series = out.reduce((o, k) => o?.[k], S);
  return series?.[YEARS.indexOf(year)];
};

const page = () =>
  render(
    <NavProvider>
      <SensitivityGrid />
    </NavProvider>,
  );

describe('Sensitivities', () => {
  it('every cell is fmt() of its data path in the active set, inside [data-axis]', () => {
    const { container } = page();
    // the sideways-scrolling wrap is reachable by keyboard and named (push E, D11)
    const wrap = container.querySelector('.mx-sens-wrap');
    expect(wrap.getAttribute('tabindex')).toBe('0');
    expect(wrap.getAttribute('role')).toBe('region');
    expect(wrap.getAttribute('aria-label')).toBe(container.querySelector('.mx-sens caption').textContent);
    const vals = [...container.querySelectorAll('.mx-sens-v')];
    expect(vals.length).toBeGreaterThan(0);
    for (const v of vals) {
      const p = v.getAttribute('data-path');
      expect(p, 'a data path').toMatch(new RegExp(`\\.gaps\\.(Y|NNI|GNI|w)\\.${HEADLINE_YEAR}$`));
      const x = valueAtPath(p);
      expect(typeof x, p).toBe('number');
      expect(v.textContent, p).toBe(fmt(x, 2));
      expect(v.closest('[data-axis]'), p).not.toBeNull();
    }
    // nothing figure-like outside [data-axis] in the table
    const flat = container.querySelector('.mx-sens').cloneNode(true);
    flat.querySelectorAll('[data-axis], .visually-hidden, caption').forEach((n) => n.remove());
    expect(flat.textContent).not.toMatch(/\d\.\d\d/);
  });

  it('the stress test’s GDP reads "held", with no figure', () => {
    const { container } = page();
    const ss = SENS_ROWS.find((r) => r.arm === 'ss');
    if (!ss) return;
    const tr = [...container.querySelectorAll('.mx-sens tbody tr')].find((t) => t.querySelector('th')?.textContent === ARMS[2].label);
    expect(tr.querySelectorAll('td')[0].textContent).toBe('held');
    expect(tr.querySelectorAll('td')[0].querySelector('[data-path]')).toBeNull();
  });

  it('prints exactly the rows whose records are done, in their groups', () => {
    const { container } = page();
    const shown = [...container.querySelectorAll('.mx-sens tbody tr:not(.mx-sens-group) th')].map((t) => t.textContent);
    expect(shown).toEqual([SENS_ROWS.find((r) => !r.group).label, ...SENS_ROWS.filter((r) => r.group).map((r) => r.label)]);
    for (const r of SENS_ROWS) expect(r.r.status).toBe('done');
    const groups = [...container.querySelectorAll('.mx-sens-group th')].map((t) => t.textContent);
    expect(groups).toEqual([...new Set(SENS_ROWS.filter((r) => r.group).map((r) => r.group))]);
    expect(container.querySelectorAll('.mx-sens thead th')).toHaveLength(5);
  });

  it('sits on the macro page as its own section, between Key settings and what it leaves out', () => {
    const { container } = render(<MethodTab />);
    const heads = [...container.querySelectorAll('.page-body > section > .section-heading h2')].map((h) => h.textContent);
    expect(heads).toEqual(['How it works', 'Key settings', 'Sensitivities', 'What the model leaves out', 'Sources']);
    expect(container.querySelector('#m-sens').compareDocumentPosition(container.querySelector('#sens-grid')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
