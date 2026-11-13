'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { URLS } from '@/tabs/ai/links.js';
import { ext } from '../shared/ui.jsx';

// OG-Core's theory as one row: households -> firms -> government -> markets,
// connected. Each node opens its detail below the row (one open at a time),
// so the row stays scannable.
const NODES = [
  {
    id: 'households',
    icon: 'users',
    title: 'Households',
    line: 'Choose consumption, hours and saving over their lives.',
    detail: (
      <>
        <p>Eighty age cohorts, ages 20 to 99, and seven permanent ability types.</p>
        <p>Each values consumption, leisure and a bequest, and faces age-specific mortality.</p>
        <p>Work pays until the after-tax wage equals the cost of effort. Saving trades today against tomorrow&rsquo;s return.</p>
      </>
    ),
  },
  {
    id: 'firms',
    icon: 'factory',
    title: 'Firms',
    line: 'Combine capital and labour. AI moves the capital share and productivity.',
    detail: (
      <>
        <p>One competitive industry. At &epsilon; = 1 the labour share is 1 &minus; &gamma;.</p>
        <p>The wage equals the marginal product of labour. The rental rate equals capital&rsquo;s, after tax and depreciation.</p>
      </>
    ),
  },
  {
    id: 'government',
    icon: 'landmark',
    title: 'Government',
    line: 'Taxes, spends, pays pensions and transfers, and borrows.',
    detail: (
      <>
        <p>Six taxes: income, payroll, consumption, corporate, wealth and bequest.</p>
        <p>The income tax is a smooth function fitted to PolicyEngine-UK.</p>
        <p>Once the debt rule starts, spending moves debt/GDP towards its long-run target.</p>
      </>
    ),
  },
  {
    id: 'markets',
    icon: 'arrowLeftRight',
    title: 'Markets',
    line: 'Prices adjust until every market clears.',
    detail: (
      <>
        <p>Labour supply equals demand. Wealth plus foreign capital funds the capital stock and gilts held at home.</p>
        <p>Output equals consumption, investment and government purchases.</p>
        <p>An equilibrium is a set of prices where all of this holds at once.</p>
      </>
    ),
  },
];

export default function ModelFlow() {
  const [open, setOpen] = useState(null);
  const node = NODES.find((n) => n.id === open);
  return (
    <div className="info-card mx-card mx-flow">
      <h3 className="info-card-title">
        <Icon name="layers" size={18} />
        <span>The model in one row</span>
      </h3>
      <p className="mx-flow-sub">
        OG-UK calibrates {ext(URLS.ogCore, 'OG-Core')} to UK data. Choose a block for its detail.
      </p>
      <ol className="mx-flow-row">
        {NODES.map((n, i) => (
          <li key={n.id} className="mx-flow-item">
            <button
              type="button"
              className={`mx-flow-node${open === n.id ? ' is-open' : ''}`}
              aria-expanded={open === n.id}
              aria-controls="mx-flow-detail"
              onClick={() => setOpen(open === n.id ? null : n.id)}
            >
              <Icon name={n.icon} size={22} />
              <span className="mx-flow-title">{n.title}</span>
              <span className="mx-flow-line">{n.line}</span>
            </button>
            {i < NODES.length - 1 ? (
              <span className="mx-flow-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <div id="mx-flow-detail" className="mx-flow-detail" hidden={!node} aria-live="polite">
        {node ? (
          <>
            <h4>
              <Icon name={node.icon} size={16} />
              <span>{node.title}</span>
            </h4>
            {node.detail}
          </>
        ) : null}
      </div>
    </div>
  );
}
