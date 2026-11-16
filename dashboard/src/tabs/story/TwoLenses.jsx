'use client';

import Icon from '@/components/ab/Icon.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';

// The close of the story: the two models side by side, what each can and
// cannot say, and why their numbers are not added together. No figures:
// each model's figures have their homes in parts 2 and 3 and in Explore.
// Each lens: what it is, then what it can and cannot say as short icon
// items (headed by the canSay and cannotSay icons).
const LENSES = [
  {
    id: 'oguk',
    icon: 'model',
    name: 'OG-UK',
    what: 'A model of the whole economy over decades: households by age and earnings, firms, government, the rest of the world.',
    can: [
      { icon: 'ai', text: 'What happens when AI shifts income to capital and lifts productivity:' },
      { icon: 'gdp', text: 'Output, pay rates and national income' },
      { icon: 'capital', text: 'Saving and investment' },
      { icon: 'finances', text: 'The public finances' },
      { icon: 'age', text: 'How the effects differ by birth year' },
    ],
    cannot: [
      { icon: 'jobLoss', text: 'Unemployment: everyone who wants to work is employed' },
      { icon: 'excluded', text: 'So it says nothing about job losses' },
      { icon: 'path', text: 'Levels: results are gaps against the OBR-central path, not forecasts' },
    ],
    explore: { tab: 'explore', sub: 'economy', label: 'Explore the OG-UK results' },
    method: { tab: 'method', sub: 'how', label: 'How OG-UK works' },
  },
  {
    id: 'study',
    icon: 'households',
    name: 'uk-ai-study (provisional)',
    what: 'A microsimulation of UK households in one year, FY 2026–27, on survey data and the full tax and benefit system.',
    can: [
      { icon: 'jobLoss', text: 'If a share of employees are assumed to lose their jobs:' },
      { icon: 'households', text: 'Who loses income' },
      { icon: 'cost', text: 'What it costs the public finances' },
      { icon: 'poverty', text: 'How poverty and inequality change' },
      { icon: 'scenario', text: 'Under stated assumptions about who is displaced' },
    ],
    cannot: [
      { icon: 'timing', text: 'What happens over time' },
      { icon: 'excluded', text: 'No recovery, re-employment, investment or price response' },
      { icon: 'limit', text: 'Job loss is an assumption, not a result' },
    ],
    explore: { tab: 'explore', sub: 'households', label: 'Explore the household results' },
    method: { tab: 'method', sub: 'households', label: 'How the study works' },
  },
];

export default function TwoLenses() {
  return (
    <section className="story-part story-close" id="story-close" aria-labelledby="story-close-h">
      <header className="story-part-head">
        <p className="story-part-kicker">
          <Icon name={iconFor('compare')} size={16} /> Two lenses
        </p>
        <h2 id="story-close-h">What each model can and cannot say</h2>
        <p>
          <Icon name={iconFor('limit')} size={18} className="lens-ico" /> Parts 2 and 3 use different models, years and assumptions, so their numbers are not added or compared.
        </p>
      </header>
      <div className="lens-grid">
        {LENSES.map((l) => (
          <article key={l.id} className="lens" aria-labelledby={`lens-${l.id}`}>
            <h3 id={`lens-${l.id}`}>
              <Icon name={iconFor(l.icon)} size={18} /> {l.name}
            </h3>
            <p className="lens-what">
              <Icon name={iconFor('measure')} size={16} className="lens-ico" /> {l.what}
            </p>
            <h4 className="lens-say">
              <Icon name={iconFor('canSay')} size={16} /> It can say
            </h4>
            <Items items={l.can} />
            <h4 className="lens-say">
              <Icon name={iconFor('cannotSay')} size={16} /> It cannot say
            </h4>
            <Items items={l.cannot} />
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
