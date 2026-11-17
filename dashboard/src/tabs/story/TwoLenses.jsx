'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { D, MODEL_YEAR, PROVISIONAL } from './part3/shared.jsx';
import { PAPER_URL, REFS, REPO_URL } from './part3/sources.jsx';
import QStage from '@/components/story/QStage.jsx';

// The close of the story: one header, one line, then the two models in one
// ruled table (rows: what each covers, can say, cannot say, and what it does
// with pay; columns: OG-UK and uk-ai-study), then one "Go deeper" row of
// links. No figures beyond the quoted pay input: each model's results have
// their homes in parts 2 and 3 and on Explore. The pay row states once that
// the two models assume opposite pay directions, a difference of
// assumptions: uk-ai-study takes Doorley et al.'s rise for those in work as
// an input; in OG-UK, pay below the OBR-central path is a result of its
// headline figures (part 2).
const M = D.method;
const STUDY = `uk-ai-study${PROVISIONAL ? ' (provisional)' : ''}`;
export const LENS_ROWS = [
  {
    id: 'covers',
    head: 'Covers',
    oguk: 'The whole economy over decades, as gaps against the OBR-central path',
    study: `UK households in one year, ${MODEL_YEAR}, under the tax and benefit system`,
  },
  {
    id: 'can',
    head: 'Can say',
    oguk: 'Output, pay rates, national income, the public finances, effects by birth year',
    study: 'Who loses income if jobs are assumed lost; the public finances; poverty and inequality',
  },
  {
    id: 'cannot',
    head: 'Cannot say',
    oguk: 'Unemployment: everyone who wants to work is employed. Forecasts of levels',
    study: 'What happens over time: recovery, re-employment, prices. Job loss as a result: it is assumed',
  },
  {
    id: 'pay',
    head: 'Pay',
    oguk: 'A result: in the headline figures, pay rates fall below the OBR-central path',
    study: (
      <>
        An input: <span data-input="">+{Number(M.survivor_wage_pct)}%</span> for those still in work, after{' '}
        <a href={REFS.doorley.url} target="_blank" rel="noreferrer" title={REFS.doorley.title}>
          {REFS.doorley.label}
        </a>
      </>
    ),
  },
];

// The close's question: shown big on the pinned screen; the header below is
// the title, so the question is not printed twice.
export const CLOSE_SUB = {
  title: 'Two lenses',
  icon: 'compare',
  question: 'What can each model say?',
};

// Six links at most, plain text.
const DEEPER = [
  {
    nav: { tab: 'explore', sub: 'economy' },
    label: 'Explore the OG-UK results',
  },
  {
    nav: { tab: 'explore', sub: 'households' },
    label: 'Explore the household results',
  },
  { nav: { tab: 'method', sub: 'how' }, label: 'Method and sources' },
  {
    href: PAPER_URL,
    label: PROVISIONAL ? 'The study’s draft paper (PDF)' : 'The study’s paper (PDF)',
  },
  { href: REPO_URL, label: 'Code: uk-ai-study' },
  { href: REFS.oguk.url, label: 'Code: uk-growth-with-ai' },
];

export default function TwoLenses() {
  return (
    <section className="story-part story-close" id="story-close" aria-labelledby="story-close-h">
      <QStage id="story-close" question={CLOSE_SUB.question} icon="compare" keyWord="model" />
      <header className="story-part-head" id="q-story-close">
        <h2 id="story-close-h">
          <Icon name={iconFor(CLOSE_SUB.icon)} size={24} className="lens-h-ico" /> {CLOSE_SUB.title}
        </h2>
        <p className="lens-lead">Different models, years and assumptions, including opposite pay directions: their numbers are not added or compared.</p>
      </header>
      <table className="lens-table">
        <caption className="lens-cap">What each model covers and can say</caption>
        <thead>
          <tr>
            <td />
            <th scope="col">OG-UK</th>
            <th scope="col">{STUDY}</th>
          </tr>
        </thead>
        <tbody>
          {LENS_ROWS.map((r) => (
            <tr key={r.id} data-row={r.id}>
              <th scope="row">{r.head}</th>
              <td data-model="OG-UK">{r.oguk}</td>
              <td data-model={STUDY}>{r.study}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="lens-deeper">
        <span className="lens-deeper-label">Go deeper</span>
        {DEEPER.map((l) =>
          l.nav ? (
            <NavLink key={l.label} tab={l.nav.tab} sub={l.nav.sub}>
              {l.label}
            </NavLink>
          ) : (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ),
        )}
      </p>
    </section>
  );
}
