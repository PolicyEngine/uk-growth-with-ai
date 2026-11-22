'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { esc } from '@/lib/download.js';
import { Arrow } from '@/tabs/method/ModelDiagram.jsx';

// The household study as a flow (Method redesign, 5.2; M7, M8): survey
// data and AI exposure feed the shock and the tax-benefit model; the model
// gives household incomes and the public finances side by side; the shock,
// the model and the outputs are repeated over random draws. HTML boxes in a
// grid with the model diagram's arrow glyph, so the words wrap on a phone,
// where the flow is one column and each arrow is a line of words between
// boxes. Only the arrows the study has are drawn: none to or from the
// macro model, none for behaviour or prices, none out of the outputs.
//
// The box and arrow strings live in HouseholdsMethod.jsx (claims-and-years
// reads each file's typed years) and come here as props:
//   boxes: { a, b, c, d, e1, e2 }: { title, line, icon }
//   links: [{ id: 'ad', from: 'a', to: 'd', label }]
//   tag:   the draws line over the shock, the model and the outputs
// The arrows' directions in the grid (from 760px): A over B at the left,
// then C, D and E1 over E2 at the right.
const DIR = { ad: 'right', bc: 'right', cd: 'right', de1: 'right', de2: 'right' };

export function flowTable({ boxes, links }) {
  return {
    columns: ['From', 'To', 'What passes'],
    rows: links.map((l) => [boxes[l.from].title, boxes[l.to].title, l.label]),
  };
}

// The same flow as SVG, for the download
export function flowSvg({ boxes, links, tag }) {
  const C = CHART_COLOURS;
  const W = 900;
  const bw = 170;
  const bh = 92;
  const X = { a: 0, b: 0, c: 245, d: 490, e1: W - bw, e2: W - bw };
  const Yb = { a: 40, b: 190, c: 190, d: 115, e1: 40, e2: 190 };
  const H = 300;
  let out = '';
  out += `<text x="${X.c}" y="16" font-size="12" fill="${C.muted}">${esc(tag)}</text>`;
  out += `<line x1="${X.c}" y1="24" x2="${W}" y2="24" stroke="${C.axis}" stroke-dasharray="3 3"/>`;
  for (const [k, b] of Object.entries(boxes)) {
    out += `<rect x="${X[k]}" y="${Yb[k]}" width="${bw}" height="${bh}" rx="10" fill="${C.surface}" stroke="${k === 'd' ? C.gain : C.axis}" stroke-width="${k === 'd' ? 2 : 1}"/>`;
    out += `<text x="${X[k] + 12}" y="${Yb[k] + 26}" font-size="14" font-weight="600" fill="${C.ink}">${esc(b.title)}</text>`;
  }
  // into D from A (upper) and C (lower); out of D to E1 (upper) and E2 (lower)
  const yOut = (l) => Yb[l.from] + bh / 2 + (l.from === 'd' ? (l.to === 'e1' ? -20 : 20) : 0);
  const yIn = (l) => Yb[l.to] + bh / 2 + (l.to === 'd' ? (l.from === 'a' ? -20 : 20) : 0);
  for (const l of links) {
    const [x1, y1, x2, y2] = [X[l.from] + bw + 4, yOut(l), X[l.to] - 6, yIn(l)];
    out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.reference}" stroke-width="1.5"/>`;
    out += `<path d="M${x2 - 7} ${y2 - 4} L${x2} ${y2} L${x2 - 7} ${y2 + 4}" fill="none" stroke="${C.reference}" stroke-width="1.5"/>`;
  }
  return { w: W, h: H, markup: out };
}

function Box({ k, b }) {
  return (
    <div className={`hf-box hf-${k}`}>
      <span className="hf-box-head">
        <Icon name={iconFor(b.icon)} size={18} />
        <b>{b.title}</b>
      </span>
      <span className="hf-box-line">{b.line}</span>
    </div>
  );
}

// A box's title inside a sentence: lower case first, except a name
// ("PolicyEngine UK")
const inLine = (t) => (/^[A-Z][a-z]+[A-Z]/.test(t) || /^[A-Z]{2}/.test(t) ? t : t[0].toLowerCase() + t.slice(1));

function Link({ l, boxes }) {
  return (
    <p className={`hf-link hf-link-${l.id}`}>
      <Arrow dir={DIR[l.id] ?? 'right'} />
      <span>
        <span className="hf-ends">
          {boxes[l.from].title} to {inLine(boxes[l.to].title)}:{' '}
        </span>
        {l.label}
      </span>
    </p>
  );
}

// In the DOM in reading order for one column; the grid places each piece
// from 760px.
export default function HouseholdFlow({ boxes, links, tag }) {
  const link = (id) => links.find((l) => l.id === id);
  return (
    <div className="hf" data-no-axes="A diagram of the study’s steps: no scale">
      <div className="hf-grid" role="group" aria-label="The household study: from survey data to a result">
        <Box k="a" b={boxes.a} />
        <Box k="b" b={boxes.b} />
        <Link l={link('bc')} boxes={boxes} />
        <p className="hf-tag">
          <Icon name={iconFor('draws')} size={14} />
          <span>{tag}</span>
        </p>
        <Box k="c" b={boxes.c} />
        <Link l={link('cd')} boxes={boxes} />
        <Link l={link('ad')} boxes={boxes} />
        <Box k="d" b={boxes.d} />
        <Link l={link('de1')} boxes={boxes} />
        <Box k="e1" b={boxes.e1} />
        <Link l={link('de2')} boxes={boxes} />
        <Box k="e2" b={boxes.e2} />
      </div>
    </div>
  );
}
