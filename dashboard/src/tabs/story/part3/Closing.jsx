'use client';

import Icon from '@/components/ab/Icon.jsx';
import { useState } from 'react';
import { Items } from '@/components/story/Items.jsx';
import { useInView, useReducedMotion } from '@/components/story/motion.js';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { D, Ico, PAPER_URL, PR_URL } from './shared.jsx';
import R from '@/data/relatedWork.json';

// Step 8, the close of part 3: not sticky; its only figures are related work's. What the study covers and
// leaves out (docs/story/part3-notes.md, Caveats), and related PolicyEngine
// work (figures read off its pages and kept
// in relatedWork.json, with the date read).

const SHIFT = R.items.find((x) => x.id === 'income_shift');
const LAB = R.items.find((x) => x.id === 'budget_lab');
const READ_DATE = new Date(`${R.read}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Where to read more: the row of links on the "Next" band that ends part 3
// (Part3.jsx), so the part closes with one band rather than a list and a band.
export function CloseLinks() {
  return (
    <>
      <a href={PAPER_URL} target="_blank" rel="noreferrer">
        <Ico c="source" />The draft paper (PDF)
      </a>
      <a href={PR_URL} target="_blank" rel="noreferrer">
        <Ico c="code" />The study and its code: uk-ai-study PR #{D.source.pr}
      </a>
      <NavLink tab="explore" sub="households">
        <Ico c="scenario" />Explore: every variant, rule and policy response
      </NavLink>
      <NavLink tab="method" sub="households">
        <Ico c="model" />Method and sources: how the study is made
      </NavLink>
      <NavLink tab="method" sub="studies">
        <Ico c="compare" />Other studies of AI and the UK economy
      </NavLink>
    </>
  );
}

// Step 8: what the one-year test leaves out, as an icon grid. Each tile is a
// button; hover, focus or a tap shows its one line of detail (display:none
// until then, so it is not counted as visible text). Tiles reveal one after
// another on scroll (the framework's .reveal), at once under reduced motion.
export const LEFT_OUT = [
  { id: 'reemploy', icon: 'labour', label: 'Re-employment', detail: 'The displaced stay out of work all year' },
  { id: 'partners', icon: 'households', label: 'Partners’ hours', detail: 'Partners do not change how much they work' },
  { id: 'redundancy', icon: 'pay', label: 'Redundancy pay', detail: 'No redundancy payments are counted' },
  { id: 'savings', icon: 'savings', label: 'Running down savings', detail: 'Households do not draw on their savings' },
  { id: 'jsa', icon: 'takeUp', label: 'New-style JSA by default', detail: 'Central case: none for the newly displaced; claims follow take-up flags' },
  { id: 'corp', icon: 'tax', label: 'Corporation tax', detail: 'Profits replacing lost wages untaxed; capital rise kept apart' },
  { id: 'young', icon: 'age', label: 'Fewer young hires', detail: 'Reduced hiring lies outside a job-displacement framework' },
  { id: 'self', icon: 'business', label: 'Self-employed', detail: 'Outside the labour-market shocks' },
  { id: 'occ', icon: 'occupations', label: 'Only 9 occupation groups', detail: 'AI exposure varies across nine groups only' },
];

function LeftOutGrid() {
  const [ref, seen] = useInView();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(null);
  return (
    <ul ref={ref} className="p3-out-grid" aria-label="What this one-year test leaves out">
      {LEFT_OUT.map((t, i) => (
        <li key={t.id} className={`p3-out-tile reveal${seen || reduce ? ' is-in' : ''}${open === t.id ? ' is-open' : ''}`} style={{ '--reveal-delay': reduce ? '0ms' : `${i * 70}ms` }} data-tile={t.id}>
          <button type="button" className="p3-out-btn" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>
            <Icon name={iconFor(t.icon)} size={22} className="p3-out-icon" />
            <span className="p3-out-label">{t.label}</span>
            <span className="p3-out-detail">{t.detail}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Closing() {
  return (
    <aside className="p3-close" aria-labelledby="p3-close-h">
      <p className="scrolly-kicker p3-iconed">
        <Ico c="excluded" size={12} />8 · What the study leaves out
      </p>
      <h3 id="p3-close-h">
        <Icon name={iconFor('excluded')} size={18} /> What this one-year test leaves out
      </h3>
      <p className="p3-chip-frame">
        <Ico c="caveat" size={14} /> A one-year stress test, not a forecast
      </p>
      <LeftOutGrid />
      <h3 id="p3-related-h">
        <Icon name={iconFor('external')} size={18} /> Related PolicyEngine work
      </h3>
      <ul className="p3-related" aria-labelledby="p3-related-h">
        <li>
          <a href={SHIFT.url} target="_blank" rel="noreferrer">
            <Ico c="external" />{SHIFT.title}
          </a>
          <Items
            items={[
              { icon: 'scenario', text: 'Shifts a rising share of labour income, up to all, to capital' },
              { icon: 'model', text: <>Current law; UK view: {SHIFT.model}; a US view too</> },
              { icon: 'inequality', text: <>Net-income Gini: {SHIFT.gini_base} to {SHIFT.gini_full} when all of it moves</> },
              { icon: 'finances', text: <>Net revenue change lowest, −£{SHIFT.revenue_min_bn}B, at a {SHIFT.revenue_min_shift_pct}% shift</> },
            ]}
          />
        </li>
        <li>
          <a href={LAB.url} target="_blank" rel="noreferrer">
            <Ico c="external" />{LAB.title}
          </a>
          <Items
            items={[
              { icon: 'source', text: <>A US memo, {LAB.date}</> },
              { icon: 'scenario', text: <>Runs {LAB.scenarios}, calibrated by {LAB.compares_short}</> },
              { icon: 'finances', text: <>Rapid adoption, proportional wages: net revenue up ${LAB.rapid_revenue_bn}B in 2030</> },
              { icon: 'poverty', text: <>SPM poverty up {LAB.rapid_poverty_pp}pp in 2030</> },
            ]}
          />
        </li>
      </ul>
      <p className="p3-related-note p3-iconed">
        <Ico c="caveat" size={12} /> Figures read off these pages on {READ_DATE}. They are not results of this dashboard.
      </p>
    </aside>
  );
}
