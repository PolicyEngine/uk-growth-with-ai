'use client';

import D from '@/data/aiStudy2425.json';

// Where part 3's inputs and figures come from. External sources carry the
// URLs the study's own reference list gives (paper/sections/references.tex);
// the DWP and gov.uk pages were checked by hand. Study files are linked at
// the commit the data were read from, never at a branch name.

const SRC = D.source;
// The commit the data builder records (top-level `commit` once the data
// follow the merged study; `source.commit` before).
export const COMMIT = D.commit ?? SRC.commit;
// The refreshed data carry the links (source.repo_url, pr_url, paper_url,
// files_base_url); before that they are built from repo, pr and commit.
export const REPO_URL = SRC.repo_url ?? `https://github.com/${SRC.repo}`;
export const PR_URL = SRC.pr_url ?? `${REPO_URL}/pull/${SRC.pr}`;
const FILES_BASE = SRC.files_base_url ?? `${REPO_URL}/blob/${COMMIT}/`;
export const fileUrl = (path) => `${FILES_BASE}${path}`;
export const PAPER_URL = SRC.paper_url ?? fileUrl('paper/main.pdf');
// Paper sections, as their LaTeX source at the same commit (readable on GitHub).
export const SECTION = {
  method: { url: fileUrl('paper/sections/methodology.tex'), label: 'the paper, "Data and methods"' },
  results: { url: fileUrl('paper/sections/results.tex'), label: 'the paper, "Results"' },
};

export const REFS = {
  doorley: { label: 'Doorley et al. (2026)', url: 'https://doi.org/10.26504/jr16', title: 'Doorley, O’Connor, O’Shea and Tuda (2026), Artificial intelligence and income inequality in Ireland, ESRI and Department of Finance, JR16' },
  // Goldman Sachs' own copy of the note (checked 18 Nov 2026: HEAD and GET 200, application/pdf)
  briggs: { label: 'Briggs and Kodnani (2023)', url: 'https://www.gspublishing.com/content/research/en/reports/2023/03/27/d64e052b-0f6e-45d7-967b-d7be35fabd16.pdf', title: 'Briggs and Kodnani (2023), The potentially large effects of artificial intelligence on economic growth, Goldman Sachs Global Economics Analyst, 26 March 2023' },
  felten: { label: 'Felten et al. (2021)', url: 'https://doi.org/10.1002/smj.3286', title: 'Felten, Raj and Seamans (2021), AI occupational exposure (AIOE), Strategic Management Journal' },
  pizzinelli: { label: 'Pizzinelli et al. (2023)', url: 'https://doi.org/10.5089/9798400254802.001', title: 'Pizzinelli et al. (2023), Labor market exposure to AI, IMF Working Paper WP/23/216: the complementarity adjustment' },
  dfe: { label: 'DfE (2023)', url: 'https://www.gov.uk/government/publications/the-impact-of-ai-on-uk-jobs-and-training', title: 'Department for Education (2023), The impact of AI on UK jobs and training: the UK SOC 2020 mapping of AIOE' },
  obr: { label: 'OBR, March 2026, Box 2.2', url: 'https://obr.uk/efo/economic-and-fiscal-outlook-march-2026/', title: 'Office for Budget Responsibility, Economic and fiscal outlook, March 2026, Box 2.2: technological displacement scenario' },
  hbai: { label: 'DWP Households Below Average Income (HBAI)', url: 'https://www.gov.uk/government/collections/households-below-average-income-hbai--2', title: 'Department for Work and Pensions, Households Below Average Income statistics' },
  jsa: { label: 'gov.uk', url: 'https://www.gov.uk/guidance/new-style-jobseekers-allowance', title: 'New-style Jobseeker’s Allowance: paid for up to 182 days' },
  klein: { label: 'Klein Teeselink (2025)', url: 'https://doi.org/10.2139/ssrn.5516798', title: 'Klein Teeselink (2025), Generative AI and labor market outcomes: evidence from the United Kingdom' },
  autor: { label: 'Autor (2024)', url: 'https://doi.org/10.3386/w32140', title: 'Autor (2024), Applying AI to rebuild middle class jobs, NBER WP 32140' },
  acemoglu: { label: 'Acemoglu and Restrepo (2022)', url: 'https://doi.org/10.3982/ECTA19815', title: 'Acemoglu and Restrepo (2022), Tasks, automation, and the rise in U.S. wage inequality, Econometrica' },
  ogcore: { label: 'OG-Core', url: 'https://github.com/PSLmodels/OG-Core', title: 'OG-Core, the overlapping-generations model OG-UK is built on' },
  oguk: { label: 'this dashboard’s code', url: 'https://github.com/PolicyEngine/uk-growth-with-ai', title: 'PolicyEngine/uk-growth-with-ai' },
  study: { label: 'Household study code', url: REPO_URL, title: 'PolicyEngine/uk-ai-study' },
};

// An external source, named and linked; `children` overrides the label.
// `plain`: the name only, no link (in step text and chart rows, where
// citations are not linked: the figure's "Sources and notes" lists them).
export function Ref({ id, children, plain = false }) {
  const r = REFS[id];
  if (plain) return <span className="p3-cite">{children ?? r.label}</span>;
  return (
    <a href={r.url} target="_blank" rel="noopener noreferrer" title={r.title} className="p3-ref">
      {children ?? r.label}
    </a>
  );
}

// A paper section, linked.
export function Sec({ id, children }) {
  const s = SECTION[id];
  return (
    <a href={s.url} target="_blank" rel="noreferrer" className="p3-ref">
      {children ?? s.label}
    </a>
  );
}

// A study result file, linked at the commit; the visible text is the file's
// name unless `children` is given.
export function FileLink({ path, children }) {
  return (
    <a href={fileUrl(path)} target="_blank" rel="noreferrer" className="p3-ref p3-file">
      {children ?? path.split('/').pop()}
    </a>
  );
}
