'use client';

import Icon from '@/components/ab/Icon.jsx';
import IconLine from '@/components/ui/IconLine.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import { InfoCard, SectionHeading } from '@/components/ui/Card.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { iconFor } from '@/lib/concepts.js';
import { MACRO_ABOUT_CAP } from '@/lib/labels.js';
import { LATE_YEAR } from '@/tabs/ai/surprise.js';
import { SOURCES } from '@/data/literature.js';
import { LAST_UPDATED, MODEL_YEAR, longDate } from '@/tabs/code/ledger.js';
import { PARTS } from '@/tabs/story/StoryTab.jsx';
import { ROWS } from './inputs.js';

// Method and sources > Overview, "How the study works" (Method redesign,
// M1): the landing of the tab. Three cards for the study's three parts,
// each with what it is, the question it answers and its key assumption,
// then three cards for the pages every part shares: inputs, evidence and
// code. No result figure on the page, and no contents list.
//
// Each card is the text card (components/ui/Card.jsx InfoCard,
// article.card.info), not Card: Card puts its children in .chart-plot,
// which check_sources reads as a figure needing a sources button.
//
// The parts' questions and key assumptions are the strings Vahid approved
// for the Story's part openers on 22 Nov (StoryTab.jsx PARTS: `question`,
// `line`), imported, never retyped.
const part = (n) => PARTS.find((p) => p.n === n);

const PART_CARDS = [
  {
    n: 1,
    title: 'Official statistics',
    icon: iconFor('record'),
    is: 'Published ONS, OBR and DSIT statistics on the UK economy and jobs so far.',
    // Part 1 has no method page: its method is which release was read
    // when, which Data and code holds (the releases table)
    link: { text: 'Releases and the source ledger', tab: 'method', sub: 'code', anchor: 'releases' },
  },
  {
    n: 2,
    title: 'Macro model',
    icon: iconFor('model'),
    is: `${MACRO_ABOUT_CAP}, solved year by year to ${LATE_YEAR}.`,
    link: { text: 'Macro model method', tab: 'method', sub: 'how' },
  },
  {
    n: 3,
    title: 'Household study',
    icon: iconFor('households'),
    is: `PolicyEngine UK, a tax-benefit model, on Microcosm UK survey data for ${MODEL_YEAR}.`,
    link: { text: 'Household method', tab: 'method', sub: 'households' },
  },
];

const MORE_CARDS = [
  {
    id: 'inputs',
    title: 'Inputs and sources',
    icon: iconFor('source'),
    line: 'Every scenario input and model parameter: its value, where it comes from and which part uses it.',
    meta: `${ROWS.length} inputs`,
    link: { text: 'Inputs and sources', tab: 'method', sub: 'inputs' },
  },
  {
    id: 'studies',
    title: 'Evidence',
    icon: iconFor('record'),
    line: 'What other studies and official sources can and cannot represent, and where the macro model’s results sit among them.',
    meta: `${Object.keys(SOURCES).length} studies and official sources`,
    link: { text: 'Evidence', tab: 'method', sub: 'studies' },
  },
  {
    id: 'code',
    title: 'Data and code',
    icon: iconFor('code'),
    line: 'The repository, the data files behind every page, and the commands to rerun the results.',
    meta: `Data last updated ${longDate(LAST_UPDATED)}`,
    link: { text: 'Data and code', tab: 'method', sub: 'code' },
  },
];

function CardLink({ link }) {
  return (
    <p className="mx-ov-link">
      <NavLink tab={link.tab} sub={link.sub} anchor={link.anchor}>
        {link.text} <Icon name="arrowRight" size={14} strokeWidth={2} />
      </NavLink>
    </p>
  );
}

export default function MethodOverview() {
  return (
    <div className="mx-tab mx-ov">
      <div className="page-body">
        <PageIntro question="How does the study work?" answer={<>Three parts, each with its own method. They are read side by side; their figures are not added together.</>} />
        <section>
          <SectionHeading id="ov-parts" icon={iconFor('answers')} title="The three parts" />
          <div className="card-grid mx-ov-grid">
            {PART_CARDS.map((c) => {
              const p = part(c.n);
              return (
                <InfoCard key={c.n} icon={c.icon} title={c.title} tag={p?.kicker ?? `Part ${c.n}`} className="mx-ov-card" foot={<CardLink link={c.link} />}>
                  <dl className="mx-ov-dl">
                    <div>
                      <dt>What it is</dt>
                      <dd>{c.is}</dd>
                    </div>
                    <div>
                      <dt>It answers</dt>
                      <dd>{p?.question}</dd>
                    </div>
                    <div>
                      <dt>Key assumption</dt>
                      <dd>{p?.line}</dd>
                    </div>
                  </dl>
                </InfoCard>
              );
            })}
          </div>
          <IconLine concept="compare" className="mx-ov-note">
            The parts are not linked: the household study’s figures are not added to or compared with the macro model’s.
          </IconLine>
        </section>
        <section>
          <SectionHeading id="ov-more" icon={iconFor('source')} title="Inputs, evidence and code" />
          <div className="card-grid mx-ov-grid">
            {MORE_CARDS.map((c) => (
              <InfoCard key={c.id} icon={c.icon} title={c.title} className="mx-ov-card" foot={<CardLink link={c.link} />}>
                <p>{c.line}</p>
                <p className="mx-ov-meta">{c.meta}</p>
              </InfoCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
