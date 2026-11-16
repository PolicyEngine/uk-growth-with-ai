'use client';

import { Fragment } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { Items } from '@/components/story/Items.jsx';
import { useInView, useReducedMotion } from '@/components/story/motion.js';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { MODEL_YEAR, PROVISIONAL } from './part3/shared.jsx';
import { REFS } from './part3/sources.jsx';

// The close of the story: the two models side by side, each with a header
// icon and one line on what it is, then what it can say (3-4 items) and
// cannot say (2-3 items), and icon links. No figures: each model's figures
// have their homes in parts 2 and 3 and in Explore. The columns slide in from
// either side (the framework's .reveal), with a divider between them; under
// reduced motion they show at once.
const LENSES = [
  {
    id: 'oguk',
    icon: 'model',
    name: 'OG-UK',
    what: 'The whole economy over decades, as gaps against the OBR-central path',
    can: [
      { icon: 'gdp', text: 'Output and pay rates' },
      { icon: 'gni', text: 'National income UK residents keep' },
      { icon: 'finances', text: 'The public finances' },
      { icon: 'age', text: 'Effects by birth year' },
    ],
    cannot: [
      { icon: 'jobLoss', text: 'Unemployment: everyone who wants to work is employed' },
      { icon: 'forecast', text: 'Forecasts of levels' },
    ],
    code: [REFS.ogcore, { ...REFS.oguk, label: 'OG-UK runs: uk-growth-with-ai' }],
    explore: { tab: 'explore', sub: 'economy', label: 'Explore the OG-UK results' },
    method: { tab: 'method', sub: 'how', label: 'How OG-UK works' },
  },
  {
    id: 'study',
    icon: 'households',
    name: `uk-ai-study${PROVISIONAL ? ' (provisional)' : ''}`,
    what: `UK households in one year, ${MODEL_YEAR}, under the tax and benefit system`,
    can: [
      { icon: 'households', text: 'Who loses income if jobs are assumed lost' },
      { icon: 'cost', text: 'The cost to the public finances' },
      { icon: 'poverty', text: 'Poverty and inequality' },
    ],
    cannot: [
      { icon: 'timing', text: 'What happens over time: recovery, re-employment, prices' },
      { icon: 'jobLoss', text: 'Job loss as a result: it is assumed' },
    ],
    code: [{ ...REFS.study, label: 'The study and its code: uk-ai-study' }],
    explore: { tab: 'explore', sub: 'households', label: 'Explore the household results' },
    method: { tab: 'method', sub: 'households', label: 'How the study works' },
  },
];

// The close's opener (rendered by builder S's standalone opener when it lands).
export const CLOSE_SUB = {
  title: 'Two lenses',
  icon: 'compare',
  question: 'What can each model say?',
  takeaway: 'OG-UK speaks to the whole economy over decades; uk-ai-study to households in one year',
};

export default function TwoLenses() {
  const [ref, seen] = useInView();
  const reduce = useReducedMotion();
  const shown = seen || reduce ? ' is-in' : '';
  return (
    <section className="story-part story-close" id="story-close" aria-labelledby="story-close-h">
      <header className="story-part-head">
        <p className="story-part-kicker">
          <Icon name={iconFor('compare')} size={16} /> Two lenses
        </p>
        <h2 id="story-close-h">
          <Icon name={iconFor('canSay')} size={28} className="lens-ico lens-h-ico" />
          What each model can and cannot say
        </h2>
        <p>
          <Icon name={iconFor('limit')} size={18} className="lens-ico" /> Different models, years and assumptions: their numbers are not added or compared.
        </p>
      </header>
      <div ref={ref} className={`lens-grid lens-grid-split${shown}`}>
        {LENSES.map((l, i) => (
          <Fragment key={l.id}>
            {i ? (
              <div className="lens-divider" aria-hidden="true">
                <Icon name={iconFor('compare')} size={18} />
              </div>
            ) : null}
            <article className={`lens reveal ${i ? 'lens-from-right' : 'lens-from-left'}${shown}`} aria-labelledby={`lens-${l.id}`}>
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
                  <Icon name={iconFor('scenario')} size={14} className="lens-ico" />
                  {l.explore.label}
                </NavLink>
                <NavLink tab={l.method.tab} sub={l.method.sub}>
                  <Icon name={iconFor('source')} size={14} className="lens-ico" />
                  {l.method.label}
                </NavLink>
                {l.code.map((r) => (
                  <a key={r.url} href={r.url} target="_blank" rel="noreferrer" title={r.title}>
                    <Icon name={iconFor('code')} size={14} className="lens-ico" />
                    {r.label}
                  </a>
                ))}
              </p>
            </article>
          </Fragment>
        ))}
      </div>
    </section>
  );
}
