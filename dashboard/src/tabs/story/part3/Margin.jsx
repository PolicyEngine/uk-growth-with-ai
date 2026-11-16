'use client';

import { useState } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Items } from '@/components/story/Items.jsx';
import { fmtBn, fmtPence, fmtPenceRange, fmtPp } from './format.js';
import { About, D, FigureHead, OutsideRebuildFlag, Source, ladder, perPound, Ico, entryClass, useEntry } from './shared.jsx';

// Step 6, job loss against wage cuts (results.tex, "How the earnings loss
// arrives"), on matching 20-draw bases only: pence per pound with each
// channel alone (job loss: the channel split's displacement run; wage cuts:
// variant cut_only), then cost and poverty with the survivor-wage and
// capital channels on in both (central seeds 0-19 against variant table3).
// The graphic is the home of all these figures, including the central case
// on the 20 draws, to which step 7 refers.

const J = D.per_pound_20.job_loss;
const W = perPound('wage_cuts');
const ER = D.per_pound_20.wage_cuts_employer_ni_p;
const JOB = ladder('central_20');
const CUT = ladder('wage_cuts');

// The card's title and claims, from the signs of the differences
// (part3.test.jsx): per pound on the margins alone, and poverty with the
// other channels on.
export function marginClaims() {
  const perPoundMore = W.government_p > J.government_p ? 'cut' : 'job';
  const povertyMore = JOB.poverty_pp > CUT.poverty_pp ? 'job' : 'cut';
  const costMore = CUT.cost_bn > JOB.cost_bn ? 'cut' : 'job';
  const NAMES = { job: ['Job loss', 'job loss'], cut: ['Wage cuts', 'wage cuts'] };
  const verb = (k, one, many) => (k === 'job' ? one : many);
  return {
    perPoundMore,
    povertyMore,
    costMore,
    title: `${NAMES[perPoundMore][0]} ${verb(perPoundMore, 'costs', 'cost')} more per pound; ${NAMES[povertyMore][1]} ${verb(povertyMore, 'raises', 'raise')} poverty more`,
    aria: `Dumbbells, 20 paired draws. Each margin alone: ${NAMES[perPoundMore][1]} ${verb(perPoundMore, 'costs', 'cost')} the public finances more per pound of earnings lost. With the wage and capital channels on: ${NAMES[costMore][1]} ${verb(costMore, 'costs', 'cost')} more and ${NAMES[povertyMore][1]} ${verb(povertyMore, 'raises', 'raise')} poverty more.`,
  };
}

// A dumbbell panel on its own axis from zero: two marks joined by a line;
// each mark carries its printed value. The wage-cut pence mark draws its
// employer-NI part as a segment of its own. `hl` dims the other margin.
function Dumbbell({ head, icon = 'measure', max, marks, on, delay, hl, setHl }) {
  const xs = marks.map((m) => (m.v / max) * 100);
  return (
    <div className="p3-db">
      <p className="p3-db-head p3-iconed">
        <Ico c={icon} size={12} /> {head}
      </p>
      <div className="p3-db-track" style={{ '--beat': `${delay}ms` }}>
        <span className="p3-db-link" style={{ left: `${Math.min(...xs)}%`, width: `${Math.abs(xs[1] - xs[0])}%` }} />
        {marks.map((m, i) => (
          <span key={m.id} className={`p3-db-mark is-${m.id}${hl && hl !== m.id ? ' is-dim' : ''}${i ? ' is-second' : ''}`}>
            {m.seg != null ? <span className="p3-db-seg" style={{ left: `${(m.seg / max) * 100}%`, width: `${((m.v - m.seg) / max) * 100}%` }} /> : null}
            <span
              className="p3-db-dot"
              style={{ left: `${xs[i]}%` }}
              tabIndex={on ? 0 : -1}
              aria-label={m.name}
              onMouseEnter={() => setHl(m.id)}
              onMouseLeave={() => setHl(null)}
              onFocus={() => setHl(m.id)}
              onBlur={() => setHl(null)}
            />
            <span className={`p3-db-val${xs[i] > 70 ? ' is-left' : ''}`} style={{ left: `${xs[i]}%` }}>
              {m.text}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function MarginFigure() {
  const [ref, e] = useEntry();
  const [hl, setHl] = useState(null);
  const chip = (id, icon, name) => (
    <button
      type="button"
      className={`p3-legend-chip is-${id}${hl && hl !== id ? ' is-dim' : ''}`}
      aria-pressed={hl === id}
      onMouseEnter={() => setHl(id)}
      onMouseLeave={() => setHl(null)}
      onFocus={() => setHl(id)}
      onBlur={() => setHl(null)}
    >
      <Ico c={icon} /> {name}
    </button>
  );
  const maxC = Math.max(JOB.cost_bn, CUT.cost_bn) * 1.15;
  const maxP = Math.max(JOB.poverty_pp, CUT.poverty_pp) * 1.15;
  return (
    <figure className={entryClass(e, 'p3-figure p3-scene p3-margin')} ref={ref}>
      <FigureHead icon="wageCut" title="The same earnings loss as job loss or as wage cuts" unit={`Mean of ${D.per_pound_20.draws} paired draws in every panel`} replay={e.replay} />
      <OutsideRebuildFlag />
      <p className="p3-legend-chips">
        {chip('job', 'jobLoss', 'Job loss')}
        {chip('cut', 'wageCut', 'Wage cuts')}
      </p>
      <section className="p3-db-group is-a">
        <p className="p3-group-head p3-group-first">
          <Ico c="cost" /> Each margin alone: cost per <span data-axis="">£1</span> of earnings lost
        </p>
        <Dumbbell
          head="Pence"
          icon="cost"
          max={100}
          on={e.on}
          delay={0}
          hl={hl}
          setHl={setHl}
          marks={[
            { id: 'job', v: J.government_p, name: 'Job loss', text: <>{fmtPence(J.government_p)} <span className="p3-muted">(range {fmtPenceRange(J.min_p, J.max_p)})</span></> },
            {
              id: 'cut',
              v: W.government_p,
              seg: W.household_p,
              name: 'Wage cuts',
              text: (
                <>
                  {fmtPence(W.government_p)} <span className="p3-muted">= {fmtPence(W.household_p)} + {fmtPence(ER)} employer NI</span>
                </>
              ),
            },
          ]}
        />
      </section>
      <section className="p3-db-group is-b">
        <p className="p3-group-head">
          <Ico c="capital" /> With the wage and capital channels on, as in the central case
        </p>
        <div className="p3-db-pair">
          <Dumbbell
            head="Cost, £bn a year"
            icon="cost"
            max={maxC}
            on={e.on}
            delay={1100}
            hl={hl}
            setHl={setHl}
            marks={[
              { id: 'job', v: JOB.cost_bn, name: 'Job loss: the central case on these draws', text: fmtBn(JOB.cost_bn) },
              { id: 'cut', v: CUT.cost_bn, name: 'Wage cuts of the same gross size', text: fmtBn(CUT.cost_bn) },
            ]}
          />
          <Dumbbell
            head="Absolute poverty, change"
            icon="poverty"
            max={maxP}
            on={e.on}
            delay={1400}
            hl={hl}
            setHl={setHl}
            marks={[
              { id: 'job', v: JOB.poverty_pp, name: 'Job loss: the central case on these draws', text: fmtPp(JOB.poverty_pp) },
              { id: 'cut', v: CUT.poverty_pp, name: 'Wage cuts of the same gross size', text: fmtPp(CUT.poverty_pp) },
            ]}
          />
        </div>
        <p className="p3-key p3-iconed">
          <Ico c="jobLoss" size={12} /> Job loss here is the central case on these 20 draws
        </p>
      </section>
      <Source>wage-cut runs, central seeds 0 to 19</Source>
    </figure>
  );
}

export default function Margin() {
  const claims = marginClaims();
  const steps = [
    {
      id: 'p3-margin-step',
      kicker: '6 · Job loss or wage cuts',
      title: claims.title,
      icon: 'wageCut',
      body: (
        <>
          <Items
            items={[
              { icon: 'wageCut', text: 'No one loses a job: wage cuts graded by AI exposure' },
              { icon: 'pay', text: 'They remove the same gross earnings as the job losses' },
              claims.povertyMore === 'job' && { icon: 'poverty', text: 'Job loss concentrates the loss, moving more households below the poverty line' },
              { icon: 'caveat', text: 'The ordering is a result for this shock, not the UK system' },
            ]}
          />
          <About>
            <Items
              items={[
                { icon: 'wageCut', text: 'A cut removes pounds taxed at the worker’s marginal rates' },
                { icon: 'tax', text: 'Employer NI is of similar size on both margins' },
                { icon: 'jobLoss', text: 'A lost job removes whole earnings; UC replaces less than tax forgone' },
                { icon: 'households', text: 'A loss spread across many earners moves few below the poverty line' },
              ]}
            />
          </About>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-margin" steps={steps} graphic={() => <MarginFigure />} label={claims.aria} />;
}
