'use client';

import Icon from '@/components/ab/Icon.jsx';
import { Compare, Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { D, Ico, MODEL_YEAR, PAPER_URL, PR_URL } from './shared.jsx';
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

// What the study traces, and what it leaves out (each led by the "excluded"
// icon), as two icon columns.
const TRACES = [
  { icon: 'scenario', text: 'Current tax and benefit rules, for a given shock size and incidence' },
  { icon: 'oneYear', text: <>Displacement as a one-year stock in {MODEL_YEAR}</> },
  { icon: 'jobLoss', text: 'The displaced earn nothing for the whole year' },
  { icon: 'takeUp', text: 'Claiming follows the data’s take-up flags' },
  { icon: 'benefits', text: 'Central case: no new-style JSA for the newly displaced' },
  { icon: 'capital', text: 'The capital-income rise is set apart from the labour shock' },
];
const LEAVES_OUT = [
  'Re-employment, or changes in partners’ hours',
  'Redundancy pay and running down savings',
  'Profits replacing lost wages: no corporation tax is counted',
  'Reduced hiring of young workers',
  'The self-employed, from the labour-market shocks',
  'AI exposure finer than nine occupation groups',
].map((text) => ({ key: text, icon: 'excluded', text }));

export default function Closing() {
  return (
    <aside className="p3-close" aria-labelledby="p3-close-h">
      <p className="scrolly-kicker p3-iconed">
        <Ico c="excluded" size={12} />8 · What the study leaves out
      </p>
      <h3 id="p3-close-h">
        <Icon name={iconFor('limit')} size={18} /> A one-year stress test, not a forecast
      </h3>
      <Compare
        className="p3-close-compare"
        columns={[
          { icon: 'canSay', title: 'What it traces', items: TRACES },
          { icon: 'excluded', title: 'What it leaves out', items: LEAVES_OUT },
        ]}
      />
      <h3 id="p3-related-h">
        <Icon name={iconFor('related')} size={18} /> Related PolicyEngine work
      </h3>
      <ul className="p3-related" aria-labelledby="p3-related-h">
        <li>
          <a href={SHIFT.url} target="_blank" rel="noreferrer">
            <Ico c="related" />{SHIFT.title}
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
            <Ico c="related" />{LAB.title}
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
