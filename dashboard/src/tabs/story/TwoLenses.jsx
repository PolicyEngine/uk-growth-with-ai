'use client';

import Icon from '@/components/ab/Icon.jsx';
import { NavLink } from '@/lib/nav.jsx';

// The close of the story: the two models side by side, what each can and
// cannot say, and why their numbers are not added together. No figures:
// each model's figures have their homes in parts 2 and 3 and in Explore.
const LENSES = [
  {
    id: 'oguk',
    icon: 'trend',
    name: 'OG-UK',
    what: 'A model of the whole economy over decades: households by age and earnings, firms, the government and the rest of the world.',
    can: 'How output, pay rates, national income, saving, investment and the public finances move when AI shifts income from labour to capital and raises productivity, and how that differs by birth year.',
    cannot: 'Unemployment: everyone who wants to work is employed, so it says nothing about job losses. Results are gaps against the OBR-central path, not forecasts of levels.',
    explore: { tab: 'explore', sub: 'economy', label: 'Explore the OG-UK results' },
    method: { tab: 'method', sub: 'how', label: 'How OG-UK works' },
  },
  {
    id: 'study',
    icon: 'usersRound',
    name: 'uk-ai-study (provisional)',
    what: 'A microsimulation of UK households in one year, FY 2026–27, built on survey data and the full tax and benefit system.',
    can: 'Who loses income if a share of employees are assumed to lose their jobs, what that costs the public finances, and how poverty and inequality change, under stated assumptions about who is displaced.',
    cannot: 'What happens over time: there is no recovery, re-employment, investment or price response, and job loss is an assumption, not a result.',
    explore: { tab: 'explore', sub: 'households', label: 'Explore the household results' },
    method: { tab: 'method', sub: 'households', label: 'How the study works' },
  },
];

export default function TwoLenses() {
  return (
    <section className="story-part story-close" id="story-close" aria-labelledby="story-close-h">
      <header className="story-part-head">
        <p className="story-part-kicker">
          <Icon name="layers" size={16} /> Two lenses
        </p>
        <h2 id="story-close-h">What each model can and cannot say</h2>
        <p>
          Parts 2 and 3 use different models, years and assumptions. Their numbers answer different questions, so they are not added
          together or compared directly.
        </p>
      </header>
      <div className="lens-grid">
        {LENSES.map((l) => (
          <article key={l.id} className="lens" aria-labelledby={`lens-${l.id}`}>
            <h3 id={`lens-${l.id}`}>
              <Icon name={l.icon} size={18} /> {l.name}
            </h3>
            <p className="lens-what">{l.what}</p>
            <dl>
              <dt>It can say</dt>
              <dd>{l.can}</dd>
              <dt>It cannot say</dt>
              <dd>{l.cannot}</dd>
            </dl>
            <p className="lens-links">
              <NavLink tab={l.explore.tab} sub={l.explore.sub}>
                <Icon name="arrowRight" size={14} /> {l.explore.label}
              </NavLink>
              <NavLink tab={l.method.tab} sub={l.method.sub}>
                <Icon name="arrowRight" size={14} /> {l.method.label}
              </NavLink>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
