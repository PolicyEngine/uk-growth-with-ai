'use client';

import { InfoCard } from '@/components/ui/Card.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { linkAiFiles } from '@/tabs/explore/sources.jsx';
import { D, PR_URL } from '@/tabs/story/part3/shared.jsx';
import { AHMADI_URL } from '@/data/references.js';
import { REFS } from '@/tabs/story/part3/sources.jsx';

// The household study's result files, the commit they were read at and how
// the page is built (checks-words2.md, item 23). It was the "Detail and
// sources" fold at the foot of Explore > Households, then its own Method
// sub-tab; since the Method redesign it is a card in Data and code's
// "Data files and versions" (#detail-sources), and Explore links here in
// one line.
const STATUS = D.provisional === false ? (D.status ?? null) : 'provisional';
const PR = D.source.pr_url ?? PR_URL;

export const FILES = [
  ['The main case', 'results/robustness/central_monte_carlo.json'],
  ['Cost by tax and benefit', D.cost_components.file],
  ['Channels', D.channels.file],
  ['Take-up and JSA', 'results/takeup/takeup_draws.csv, results/takeup/takeup_runs.json'],
  ['Wage cuts', 'results/wage_cut/wage_cut_draws.csv'],
  ['OBR-sized runs and the Sankey', 'results/next_runs/obr_benchmark.json, results/next_runs/obr_benchmark_draws.csv, results/next_runs/obr_household_deciles.csv'],
  ['Displacement rules', D.rules[0].file],
  ['Deciles', 'results/appendix/decomposition_ci.csv, results/appendix/decile_ranking_sensitivity.csv'],
  ['Break-evens', 'results/robustness/survivor_wage_grid.csv, results/next_runs/capital_variants_draws.csv, results/robustness/duration_takeup_sensitivity.json'],
  ['Policy responses', D.policy.file],
];

export default function HouseholdsDetail() {
  return (
    <InfoCard id="detail-sources" icon="fileText" title="Household study: result files" className="hh-detail-card">
      <p className="hh-detail-sub">Result files, commit, how the page is built: the household study behind Explore’s Households page and part 3 of the story.</p>
      <div className="hh-sources">
        <p>
          Read from the study’s committed result files, commit{' '}
          <a href={`https://github.com/${D.source.repo}/tree/${D.source.commit}`} target="_blank" rel="noopener noreferrer">
            <code>{D.source.commit.slice(0, 7)}</code>
          </a>
          ; each checked against the paper by <code>build_ai_study_data.py</code>.
        </p>
        <ul data-reference="">
          {FILES.map(([what, f]) => (
            <li key={what}>
              <b>{what}:</b> {linkAiFiles(f)}
            </li>
          ))}
        </ul>
        <p className="hh-links">
          <a href={AHMADI_URL} target="_blank" rel="noopener noreferrer">
            {`${STATUS === 'provisional' ? 'Draft: ' : ''}${REFS.ahmadi.title} (PDF)`}
          </a>
          <a href={PR} target="_blank" rel="noopener noreferrer">
            Household study PR #{D.source.pr}
          </a>
          <NavLink tab="method" sub="households">
            Household method
          </NavLink>
        </p>
      </div>
    </InfoCard>
  );
}
