'use client';

import Icon from '@/components/ab/Icon.jsx';
import { SectionHeading } from '@/components/ui/Card.jsx';
import { iconFor } from '@/lib/concepts.js';
import IconText from '@/tabs/method/IconText.jsx';
import R from '@/data/relatedWork.json';

// Related PolicyEngine work: other PolicyEngine pages on AI and the tax
// system, as compact icon link cards. Their figures are those pages' own,
// read off them on the date in relatedWork.json (moved here from the close
// of Story part 3, November 2026), and are labelled so: they are not results
// of this dashboard and come from other models, countries and policies.

const READ_DATE = new Date(`${R.read}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const SHIFT = R.items.find((x) => x.id === 'income_shift');
const LAB = R.items.find((x) => x.id === 'budget_lab');
const P = (id, k) => `relatedWork.items.${id}.${k}`;

const CARDS = [
  {
    it: SHIFT,
    line: 'Moves a rising share of labour income into capital income, under current law.',
    where: `UK and US views; UK view: ${SHIFT.model}`,
    figures: [
      {
        icon: 'inequality',
        text: (
          <>
            Net-income Gini: <span data-path={P('income_shift', 'gini_base')}>{SHIFT.gini_base}</span> to{' '}
            <span data-path={P('income_shift', 'gini_full')}>{SHIFT.gini_full}</span> when all of it moves.
          </>
        ),
      },
      {
        icon: 'cost',
        text: (
          <>
            Net revenue lowest, <span data-path={P('income_shift', 'revenue_min_bn')}>−£{SHIFT.revenue_min_bn}B</span>, at a{' '}
            <span data-path={P('income_shift', 'revenue_min_shift_pct')}>{SHIFT.revenue_min_shift_pct}%</span> shift.
          </>
        ),
      },
    ],
  },
  {
    it: LAB,
    line: `Runs ${LAB.scenarios}, as calibrated by ${LAB.compares_short}, through PolicyEngine.`,
    where: `US memo, ${LAB.date}; ${LAB.model}`,
    figures: [
      {
        icon: 'cost',
        text: (
          <>
            Rapid adoption, proportional wages: net revenue up{' '}
            <span data-path={P('budget_lab', 'rapid_revenue_bn')}>${LAB.rapid_revenue_bn}B</span> in 2030.
          </>
        ),
      },
      {
        icon: 'poverty',
        text: (
          <>
            SPM poverty up <span data-path={P('budget_lab', 'rapid_poverty_pp')}>{LAB.rapid_poverty_pp}pp</span>, same case.
          </>
        ),
      },
    ],
  },
];

export default function RelatedWork() {
  return (
    <section className="mx-related" aria-labelledby="related-work-h">
      <SectionHeading id="related-work" icon={iconFor('related')} title={<span id="related-work-h">Related PolicyEngine work</span>}>
        <IconText icon="period">Figures read off these pages on {READ_DATE}. They are those pages&rsquo; figures, not this dashboard&rsquo;s.</IconText>
      </SectionHeading>
      <ul className="mx-related-grid">
        {CARDS.map(({ it, line, where, figures }) => (
          <li key={it.id} className="mx-related-card" id={`related-${it.id}`}>
            <a className="mx-related-title" href={it.url} target="_blank" rel="noreferrer">
              <Icon name={iconFor('related')} size={16} />
              <span>{it.title}</span>
            </a>
            <p className="mx-related-line">
              <IconText icon="why">{line}</IconText>
            </p>
            <p className="mx-related-where">
              <IconText icon="foreign">{where}</IconText>
            </p>
            <p className="mx-related-tag">
              <IconText icon="source">Their figures:</IconText>
            </p>
            <ul className="mx-related-figs">
              {figures.map((f, i) => (
                <li key={i}>
                  <Icon name={iconFor(f.icon)} size={14} />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
