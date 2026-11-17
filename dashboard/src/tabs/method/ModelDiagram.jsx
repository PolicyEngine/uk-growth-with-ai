'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { esc } from '@/lib/download.js';
import IconText from './IconText.jsx';

// OG-UK as four blocks and the flows between them: households by age and
// lifetime earnings, firms, the government and the rest of the world, in a
// loop (households - firms - rest of the world - government - households).
// Drawn in HTML so it stays readable on a phone, where the loop becomes one
// column; the PNG/SVG download draws the same blocks from NODES and EDGES.
// Choosing a block opens its detail below the diagram.

export const NODES = [
  {
    id: 'households',
    icon: 'households',
    title: 'Households',
    tag: 'By age and lifetime earnings',
    line: 'Eighty ages (20 to 99), seven earnings groups; each plans work and saving.',
    detail: [
      ['why', 'Each values consumption, leisure and a bequest, and faces age-specific mortality.'],
      ['labour', 'Work pays until the after-tax wage equals the cost of effort.'],
      ['interest', 'Saving trades today against tomorrow’s return.'],
      ['generations', 'Many generations live at once: a change reaches young and old differently.'],
    ],
  },
  {
    id: 'firms',
    icon: 'capital',
    title: 'Firms',
    tag: 'Where AI enters',
    line: 'One competitive industry. AI raises the capital share γ and productivity Z.',
    detail: [
      ['equation', 'Elasticity of substitution one: the labour share is exactly 1 − γ.'],
      ['pay', 'The wage equals the marginal product of labour.'],
      ['capital', 'The rental rate equals capital’s, after tax and depreciation.'],
    ],
  },
  {
    id: 'world',
    icon: 'foreign',
    title: 'Rest of the world',
    tag: 'Foreign capital and gilts',
    line: 'Supplies part of any new capital and holds part of new gilts.',
    detail: [
      ['closure', 'How large each part is: the closures, below.'],
      ['gni', 'Foreign-owned capital’s earnings go abroad, so GNI rises less than GDP.'],
    ],
  },
  {
    id: 'government',
    icon: 'finances',
    title: 'Government',
    tag: 'Taxes, spending, debt',
    line: 'Six taxes, pensions, transfers and its own consumption; it borrows.',
    detail: [
      ['tax', 'Taxes on income, payroll, consumption, corporate profits, wealth and bequests.'],
      ['data', 'The income tax is a smooth function fitted to PolicyEngine-UK.'],
      ['rule', 'How spending responds is the fiscal rule: see “Fiscal rules”, below.'],
    ],
  },
];

// Each edge carries a flow each way: [from the first block, from the second]
export const EDGES = [
  { id: 'hf', a: 'households', b: 'firms', ab: 'Labour; saving that becomes capital', ba: 'Wages; returns on capital' },
  { id: 'fw', a: 'firms', b: 'world', ab: 'Returns paid to foreign owners', ba: 'Foreign capital' },
  { id: 'wg', a: 'world', b: 'government', ab: 'Buys part of new gilts', ba: 'Interest on those gilts' },
  { id: 'gh', a: 'government', b: 'households', ab: 'Pensions and transfers', ba: 'Income, payroll, consumption and wealth taxes' },
];
const nameOf = (id) => NODES.find((n) => n.id === id).title;

export const flowTable = () => ({
  columns: ['From', 'To', 'Flow'],
  rows: EDGES.flatMap((e) => [
    [nameOf(e.a), nameOf(e.b), e.ab],
    [nameOf(e.b), nameOf(e.a), e.ba],
  ]),
});

// The same diagram as SVG, for the downloads
export function diagramSvg() {
  const C = CHART_COLOURS;
  const W = 760;
  const H = 420;
  const bw = 220;
  const bh = 84;
  const pos = { households: [0, 0], firms: [W - bw, 0], world: [W - bw, H - bh], government: [0, H - bh] };
  let out = '';
  for (const n of NODES) {
    const [x, y] = pos[n.id];
    out += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="10" fill="${C.surface}" stroke="${n.id === 'firms' ? C.gain : C.axis}" stroke-width="${n.id === 'firms' ? 2 : 1}"/>`;
    out += `<text x="${x + 14}" y="${y + 28}" font-size="15" font-weight="600" fill="${C.ink}">${esc(n.title)}</text>`;
    out += `<text x="${x + 14}" y="${y + 50}" font-size="12" fill="${C.muted}">${esc(n.tag)}</text>`;
  }
  const mid = (id) => [pos[id][0] + bw / 2, pos[id][1] + bh / 2];
  for (const e of EDGES) {
    const [ax, ay] = mid(e.a);
    const [bx, by] = mid(e.b);
    const horiz = ay === by;
    const x1 = horiz ? Math.min(ax, bx) + bw / 2 + 8 : ax;
    const x2 = horiz ? Math.max(ax, bx) - bw / 2 - 8 : ax;
    const y1 = horiz ? ay : Math.min(ay, by) + bh / 2 + 8;
    const y2 = horiz ? ay : Math.max(ay, by) - bh / 2 - 8;
    out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.reference}" stroke-width="1.5"/>`;
    const fwd = horiz ? ax < bx : ay < by;
    const [first, second] = fwd ? [e.ab, e.ba] : [e.ba, e.ab];
    if (horiz) {
      out += `<text x="${(x1 + x2) / 2}" y="${ay - 10}" font-size="12" text-anchor="middle" fill="${C.ink}">${esc(`${first} →`)}</text>`;
      out += `<text x="${(x1 + x2) / 2}" y="${ay + 20}" font-size="12" text-anchor="middle" fill="${C.ink}">${esc(`← ${second}`)}</text>`;
    } else {
      const tx = ax + (ax < W / 2 ? 14 : -14);
      const anchor = ax < W / 2 ? 'start' : 'end';
      out += `<text x="${tx}" y="${(y1 + y2) / 2 - 8}" font-size="12" text-anchor="${anchor}" fill="${C.ink}">${esc(`↓ ${first}`)}</text>`;
      out += `<text x="${tx}" y="${(y1 + y2) / 2 + 14}" font-size="12" text-anchor="${anchor}" fill="${C.ink}">${esc(`↑ ${second}`)}</text>`;
    }
  }
  // below the side labels (which sit at H/2 - 8 and H/2 + 14)
  out += `<text x="${W / 2}" y="${H / 2 + 52}" font-size="13" font-weight="600" text-anchor="middle" fill="${C.ink}">Markets clear</text>`;
  out += `<text x="${W / 2}" y="${H / 2 + 72}" font-size="12" text-anchor="middle" fill="${C.muted}">wage, interest rate; firms pay corporate tax</text>`;
  return { w: W, h: H, markup: out };
}

// Each flow names where it goes, so it reads the same in the loop and in
// the phone's single column. A drawn arrow gives its direction in the loop
// (households and firms on top, government and the rest of the world below);
// the arrows are hidden in the single column, where the words carry it.
const DIR = { hf: ['right', 'left'], fw: ['down', 'up'], wg: ['left', 'right'], gh: ['up', 'down'] };
function Arrow({ dir }) {
  return (
    <svg className={`md-arrow md-arrow-${dir}`} viewBox="0 0 24 12" width="24" height="12" aria-hidden="true">
      <path d="M1 6 H21 M16 1.5 L21.5 6 L16 10.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Edge({ e, lit }) {
  const [d1, d2] = DIR[e.id];
  return (
    <div className={`md-edge md-edge-${e.id}${lit ? ' is-lit' : ''}`}>
      <span className="md-flow">
        <Arrow dir={d1} />
        <span>
          <span className="md-to">To {nameOf(e.b).toLowerCase()}:</span> {e.ab}
        </span>
      </span>
      <span className="md-flow">
        <Arrow dir={d2} />
        <span>
          <span className="md-to">To {nameOf(e.a).toLowerCase()}:</span> {e.ba}
        </span>
      </span>
    </div>
  );
}

export default function ModelDiagram() {
  const [open, setOpen] = useState(null);
  const node = NODES.find((n) => n.id === open);
  return (
    <div className="md" data-no-axes="A diagram of flows between blocks: no scale">
      <div className={`md-grid${open ? ' is-lit' : ''}`} role="group" aria-label="OG-UK: four blocks and the flows between them">
        {NODES.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`md-node md-node-${n.id}${open === n.id ? ' is-open' : ''}`}
            aria-expanded={open === n.id}
            aria-controls="md-detail"
            onClick={() => setOpen(open === n.id ? null : n.id)}
          >
            <span className="md-node-head">
              <Icon name={iconFor(n.icon)} size={18} />
              <span className="md-node-title">{n.title}</span>
            </span>
            <span className="md-node-tag">{n.tag}</span>
            <span className="md-node-line">{n.line}</span>
          </button>
        ))}
        {EDGES.map((e) => (
          <Edge key={e.id} e={e} lit={open === e.a || open === e.b} />
        ))}
        <div className="md-centre">
          <b>
            <Icon name={iconFor('breakEven')} size={16} className="mx-dt-icon" />
            Markets clear
          </b>
          <span>The wage and the interest rate adjust until every market balances.</span>
          <span>Firms also pay corporate tax.</span>
        </div>
      </div>
      <p className="md-note">
        <IconText icon="caveat">A schematic: arrows show direction, not size.</IconText>
      </p>
      <div id="md-detail" className="md-detail" hidden={!node} aria-live="polite">
        {node ? (
          <>
            <h4>
              <Icon name={iconFor(node.icon)} size={16} />
              <span>{node.title}</span>
            </h4>
            <Items items={node.detail.map(([icon, text]) => ({ key: text, icon, text }))} />
          </>
        ) : null}
      </div>
    </div>
  );
}
