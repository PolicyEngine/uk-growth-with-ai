'use client';

import Icon from '@/components/ab/Icon.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { D, PR_URL } from './shared.jsx';
import R from '@/data/relatedWork.json';

// The close of part 3: not sticky, no figures. What the study covers and
// leaves out (docs/story/part3-notes.md, Caveats), and where to read more,
// including related PolicyEngine work (figures read off its pages and kept
// in relatedWork.json, with the date read).

const SHIFT = R.items.find((x) => x.id === 'income_shift');
const LAB = R.items.find((x) => x.id === 'budget_lab');

export default function Closing() {
  return (
    <aside className="p3-close" aria-labelledby="p3-close-h">
      <h3 id="p3-close-h">What the study covers</h3>
      <p>
        The study is static and covers one year: each displaced worker is out of work for the whole year, and it models no behavioural
        response, such as finding other work or changing hours. It counts no corporation tax, so any tax on profits that take the place of
        lost wages is left out.
      </p>
      <ul className="p3-close-links">
        <li>
          <a href={PR_URL} target="_blank" rel="noreferrer">
            <Icon name="arrowRight" size={16} strokeWidth={2} /> The draft study and its code: uk-ai-study PR #{D.source.pr}
          </a>
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
          </a>{' '}
          An experiment that shifts 0 to {SHIFT.shift_max_pct}% of labour income into capital income under current law, with UK and US
          views. In the UK view ({SHIFT.model}), the net-income Gini rises from {SHIFT.gini_base} to {SHIFT.gini_full} at a{' '}
          {SHIFT.shift_max_pct}% shift, and net revenue is lowest, at −£{SHIFT.revenue_min_bn}B, at a {SHIFT.revenue_min_shift_pct}% shift.
        </li>
        <li>
          <a href={LAB.url} target="_blank" rel="noreferrer">
            {LAB.title}
          </a>{' '}
          A US memo ({LAB.date}) comparing PolicyEngine with the Yale Budget Lab on the Karger et al. AI scenarios. With rapid adoption
          and proportional wage changes, it finds net government revenue up ${LAB.rapid_revenue_bn}B and SPM poverty up{' '}
          {LAB.rapid_poverty_pp}pp in 2030.
        </li>
      </ul>
    </aside>
  );
}
