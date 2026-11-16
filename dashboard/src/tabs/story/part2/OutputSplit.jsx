'use client';

import { useState } from 'react';
import Sankey from '@/components/story/Sankey.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { useInView, useIsPhone } from '@/components/story/motion.js';
import { NavLink } from '@/lib/nav.jsx';
import { SCEN_NAME, CENTRAL, BOUND } from '@/tabs/ai/surprise.js';
import { SOURCE } from './frame.jsx';
import { SPLIT_YEAR, share, change, splitFor, sankeyGraph, waterfallRows, barColor } from './split.js';

// Where output goes in the headline year, at the header's scenario and
// closure (the central closure with Both, which the lead says), as a
// three-step scrolly over one graphic:
//   1  a Sankey of the OBR-central path: GDP to labour income and gross
//      capital income, as shares of GDP (the left column's ribbons wipe in);
//   2  gross capital income's three parts: kept in the UK, paid abroad,
//      depreciation (the next column wipes in);
//   3  a waterfall of each part's change in the scenario, in % of the path's
//      GDP, bars growing in turn. Hovering or focusing a row picks out its
//      ribbon, and hovering a ribbon its row.
// The baseline is never morphed into the scenario: they are different
// measures (shares of the path's GDP, changes against it).
// Every figure is in the DOM in every state, once: layers not yet reached
// are hidden by opacity and clip-path only, so the text (and the number
// checks, which read it at step 1) always holds each share and change. On
// phones a sticky graphic this tall would leave no room to read, and the
// scrolly would repeat it per step, so the figure is drawn once, complete,
// above the three texts. A trailing spacer step holds the last state while
// card 3 is read, so the tall sticky graphic is not pulled up early. The GDP bar carries no number: that figure is the
// headline tile's. Bare numbers, the unit in each subtitle.

const CL_WORDS = { [CENTRAL]: 'central closure', [BOUND]: 'closed capital' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const GROW_STAGGER = 80; // ms between waterfall bars

function Waterfall({ rows, on, hl, setHl }) {
  const ends = rows.flatMap((r) => [r.from, r.to]);
  let lo = Math.min(0, ...ends);
  let hi = Math.max(0, ...ends);
  const pad = (hi - lo) * 0.04;
  lo -= pad;
  hi += pad;
  const at = (x) => ((x - lo) / (hi - lo)) * 100;
  return (
    <ol className={`p2-wf${on ? ' is-on' : ''}${hl ? ' has-hl' : ''}`} style={{ '--zero': `${at(0)}%` }} onMouseLeave={() => setHl(null)}>
      {rows.map((r, i) => {
        const a = Math.min(r.from, r.to);
        const b = Math.max(r.from, r.to);
        const pick = r.id === 'gdp' ? null : r.id;
        return (
          <li
            key={r.id}
            className={`p2-wf-row${r.sub ? ' is-sub' : ''}${r.outline ? ' is-outline' : ''}${hl && hl === r.id ? ' is-hl' : ''}`}
            data-row={r.id}
            tabIndex={pick && on ? 0 : undefined}
            onMouseEnter={() => setHl(pick)}
            onFocus={() => setHl(pick)}
            onBlur={() => setHl(null)}
          >
            <span className="p2-wf-label">
              {r.sub ? <span className="p2-wf-of">of which </span> : null}
              {r.label}
            </span>
            <span className="p2-wf-track" aria-hidden="true">
              <span className="p2-wf-zero" />
              {/* grows from the end it starts at: zero for labour and GDP,
                  the previous row's end for the parts */}
              <span
                className={`p2-wf-bar${r.to < r.from ? ' is-back' : ''}`}
                style={{
                  left: `${at(a)}%`,
                  width: `${Math.max(at(b) - at(a), 0.4)}%`,
                  '--bar': barColor(r.id, r.to - r.from),
                  transitionDelay: on ? `${i * GROW_STAGGER}ms` : '0ms',
                }}
              />
            </span>
            <span className="p2-wf-value">
              {r.value == null ? (
                <NavLink tab="story" anchor="story-headline" className="p2-wf-link" aria-label="GDP: see the headline figures">
                  Headline figures <Icon name="arrowRight" size={12} strokeWidth={2} />
                </NavLink>
              ) : (
                change(r.value)
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// The sentence for step 3, true for the cell in view: it reads the signs,
// and prints no figure (the figures are on the charts).
function why(ch) {
  const out = [];
  if (ch.gdp > 0 && ch.labour < 0) {
    out.push('GDP is above the path and labour income below it: capital takes all of the extra output, and more.');
  } else {
    out.push(`GDP is ${ch.gdp >= 0 ? 'above' : 'below'} the path and labour income is ${ch.labour >= 0 ? 'above' : 'below'} it.`);
  }
  if (ch.foreign > 0 && ch.depreciation > 0) {
    out.push('Part of the extra capital income goes abroad or covers wear on more capital, so national income rises less than GDP.');
  }
  return out.join(' ');
}

// The graphic: the Sankey, the waterfall below it. `state` 0-2; `all`
// draws the last state with nothing hidden (phones).
function OutputGraphic({ state, sid, cl, base, ch, all = false }) {
  const [ref, seen] = useInView({ rootMargin: '0px 0px -15% 0px' });
  const [hl, setHl] = useState(null);
  const s = all ? 2 : state;
  // a row focused when the reader scrolls back loses focus without a blur
  // (the waterfall goes inert): clear its highlight then
  if (s < 2 && hl !== null) setHl(null);
  const lit = hl;
  // nothing wipes in before the block is seen; then column by column
  const reveal = all ? 2 : seen ? Math.min(s + 1, 2) : 0;
  const graph = base ? sankeyGraph(base, true) : null;
  const where = `${SCEN_NAME[sid]}, automation + productivity, common fiscal rule`;
  const sankeyLabel = base
    ? `Sankey diagram: GDP on the OBR-central path in ${SPLIT_YEAR}, ${CL_WORDS[cl]}, split into labour income (${share(base.labour)} of every 100) and gross capital income, which splits into net capital income kept in the UK (${share(base.domestic)}), payments to foreign owners of UK capital and gilts (${share(base.foreign)}) and depreciation (${share(base.depreciation)}).`
    : '';
  return (
    <figure ref={ref} className="p2-figure p2-output-fig p2-output-graphic" data-state={s}>
      <div className="p2-output-base">
        <p className="story-figure-title">The OBR-central path, {SPLIT_YEAR}</p>
        <p className="story-figure-unit">{cap(CL_WORDS[cl])}. Of every 100 of GDP</p>
        {graph ? (
          <div className="p2-sankey">
            <Sankey
              graphs={[graph]}
              label={sankeyLabel}
              width={420}
              height={196}
              pad={24}
              rightRoom={118}
              linkOpacity={0.7}
              reveal={reveal}
              highlight={s >= 2 ? lit : undefined}
              onHover={s >= 2 ? setHl : undefined}
            />
          </div>
        ) : (
          <p className="p2-pending">The reference path at this closure is pending.</p>
        )}
        <p className="story-source">
          Taxes are not split out: in OG-UK income tax is one combined series. {SOURCE}
        </p>
      </div>
      {/* not yet reached: invisible, and out of reach of focus and pointer */}
      <div className={`p2-output-change p2-out-later${s >= 2 ? ' is-on' : ''}`} inert={s < 2 || undefined}>
        <p className="story-figure-title">What {SCEN_NAME[sid]} changes, {SPLIT_YEAR}</p>
        <p className="story-figure-unit">{where}. Gaps against the OBR-central path, % of its GDP, not forecasts of levels</p>
        {ch ? (
          <>
            <Waterfall rows={waterfallRows(ch)} on={s >= 2} hl={lit} setHl={setHl} />
            <p className="story-source">
              Changes are rounded, so the parts may not add to the totals; the GDP bar ends at the headline GDP figure.
            </p>
          </>
        ) : (
          <p className="p2-pending">This solve is pending at the closure chosen above.</p>
        )}
      </div>
    </figure>
  );
}

function outputSteps(sid, base, ch) {
  const labourMore = base ? base.labour > 50 : null;
  return [
    {
      id: 'p2-out-1',
      kicker: 'Where output goes',
      title: 'GDP is paid as labour or capital income',
      body: (
        <p>
          Every pound of GDP is paid to someone. On the OBR-central path in {SPLIT_YEAR},{' '}
          {labourMore == null ? 'part' : labourMore ? 'the larger part' : 'the smaller part'} goes to workers as labour income, what
          they are paid in total; the rest is gross capital income, paid to the owners of capital.
        </p>
      ),
    },
    {
      id: 'p2-out-2',
      kicker: 'Where output goes',
      title: 'Capital income splits three ways',
      body: (
        <p>
          Part is kept in the UK as net capital income. Part is paid abroad: profits on foreign-owned UK capital and interest on gilts
          held abroad. The rest replaces capital that wears out: depreciation.
        </p>
      ),
    },
    {
      id: 'p2-out-3',
      pin: 'bottom',
      kicker: 'Where output goes',
      title: `What ${SCEN_NAME[sid]} changes`,
      body: (
        <>
          {ch ? <p>In this scenario, {why(ch)}</p> : <p>This solve is pending at the closure chosen above.</p>}
          <p className="p2-more">
            <Icon name="arrowRight" size={14} />
            <NavLink tab="explore" sub="economy" anchor="explore-part-economy">
              The labour share year by year
            </NavLink>
          </p>
        </>
      ),
    },
  ];
}

export default function OutputSplit({ sid, closure }) {
  const { cl, base, ch } = splitFor(sid, closure);
  const both = closure === 'both';
  const phone = useIsPhone();
  const steps = outputSteps(sid, base, ch);
  return (
    <section id="story-output" className="p2-output" aria-labelledby="story-output-h">
      <h3 id="story-output-h" className="p2-headline-title">
        Where output goes in {SPLIT_YEAR}
      </h3>
      <p className="p2-headline-lead">
        First the split on the OBR-central path, then how {SCEN_NAME[sid]} changes each part.{' '}
        {both ? 'With both closures chosen above, both figures show the central closure.' : null}
      </p>
      {phone ? (
        <div className="p2-output-static">
          <OutputGraphic state={2} all sid={sid} cl={cl} base={base} ch={ch} />
          <ol className="p2-output-texts">
            {steps.map((s) => (
              <li key={s.id} id={s.id} className="p2-output-text">
                <h4 className="scrolly-title">{s.title}</h4>
                <div className="scrolly-body">{s.body}</div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <Scrolly
          id="p2-output"
          label={`Where output goes in ${SPLIT_YEAR}`}
          steps={[...steps, { id: 'p2-out-end', spacer: true }]}
          graphic={(i) => <OutputGraphic state={Math.min(i, 2)} sid={sid} cl={cl} base={base} ch={ch} />}
        />
      )}
    </section>
  );
}
