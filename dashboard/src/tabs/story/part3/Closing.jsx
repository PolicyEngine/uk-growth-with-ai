'use client';

import Icon from '@/components/ab/Icon.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { D, MODEL_YEAR, PAPER_URL, PR_URL } from './shared.jsx';
import R from '@/data/relatedWork.json';

// Step 8, the close of part 3: not sticky; its only figures are related work's. What the study covers and
// leaves out (docs/story/part3-notes.md, Caveats), and where to read more,
// including related PolicyEngine work (figures read off its pages and kept
// in relatedWork.json, with the date read).

const SHIFT = R.items.find((x) => x.id === 'income_shift');
const LAB = R.items.find((x) => x.id === 'budget_lab');
const READ_DATE = new Date(`${R.read}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function Closing() {
  return (
    <aside className="p3-close" aria-labelledby="p3-close-h">
      <p className="scrolly-kicker">8 · What the study leaves out</p>
      <h3 id="p3-close-h">A one-year stress test, not a forecast</h3>
      <p>
        The study traces what current tax and benefit rules would do if a shock of a given size, incidence and margin occurred in {MODEL_YEAR}.
        Displacement is a one-year stock: the displaced earn nothing for the whole year, with no re-employment, no change in partners’ hours,
        no redundancy pay and no running down of savings. Under the central assumption the newly displaced receive no new-style JSA, and
        claiming follows the data’s take-up flags.
      </p>
      <p>
        It counts no corporation tax, so profits that take the place of lost wages are left out, and the capital-income rise is set apart from
        the labour shock. Reduced hiring of young workers lies outside a framework that displaces existing jobs. AI exposure varies across
        nine occupation groups only, and the self-employed are outside the labour-market shocks.
      </p>
      <ul className="p3-close-links">
        <li>
          <a href={PAPER_URL} target="_blank" rel="noreferrer">
            <Icon name="arrowRight" size={16} strokeWidth={2} /> The draft paper (PDF)
          </a>
        </li>
        <li>
          <a href={PR_URL} target="_blank" rel="noreferrer">
            <Icon name="arrowRight" size={16} strokeWidth={2} /> The study and its code: uk-ai-study PR #{D.source.pr}
          </a>
        </li>
        <li>
          <NavLink tab="explore" sub="households" className="p3-close-link">
            <Icon name="arrowRight" size={16} strokeWidth={2} /> Explore: every variant, rule and policy response
          </NavLink>
        </li>
        <li>
          <NavLink tab="method" sub="households" className="p3-close-link">
            <Icon name="arrowRight" size={16} strokeWidth={2} /> Method and sources: how the study is made
          </NavLink>
        </li>
        <li>
          <NavLink tab="method" sub="studies" className="p3-close-link">
            <Icon name="arrowRight" size={16} strokeWidth={2} /> Other studies of AI and the UK economy
          </NavLink>
        </li>
      </ul>
      <h3 id="p3-related-h">Related PolicyEngine work</h3>
      <ul className="p3-related" aria-labelledby="p3-related-h">
        <li>
          <a href={SHIFT.url} target="_blank" rel="noreferrer">
            {SHIFT.title}
          </a>
          An experiment that moves a rising share of labour income, up to all of it, into capital income under current law, with UK
          and US views. In the UK view ({SHIFT.model}), the net-income Gini rises from {SHIFT.gini_base} to {SHIFT.gini_full} when all of
          it moves, and the change in net government revenue is lowest, −£{SHIFT.revenue_min_bn}B, at a {SHIFT.revenue_min_shift_pct}%
          shift.
        </li>
        <li>
          <a href={LAB.url} target="_blank" rel="noreferrer">
            {LAB.title}
          </a>
          A US memo ({LAB.date}) that runs {LAB.scenarios}, as calibrated by {LAB.compares_short}, through PolicyEngine. For rapid
          adoption with proportional wage changes, it finds net government revenue up ${LAB.rapid_revenue_bn}B and SPM poverty up{' '}
          {LAB.rapid_poverty_pp}pp in 2030.
        </li>
      </ul>
      <p className="p3-related-note">Figures read off these pages on {READ_DATE}. They are not results of this dashboard.</p>
    </aside>
  );
}
