'use client';

import { useState } from 'react';
import Sankey from '@/components/story/Sankey.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { useInView, useIsPhone } from '@/components/story/motion.js';
import { NavLink } from '@/lib/nav.jsx';
import { SCEN_NAME, CENTRAL, BOUND } from '@/tabs/ai/surprise.js';
import { SOURCE, Tx } from './frame.jsx';
import { SPLIT_YEAR, PART_COLOR, share, change, splitFor, sankeyGraph, waterfallRows, barColor } from './split.js';
import { dirConcept, dirWord } from './dir.js';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';

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
// above the three texts. Before step 3 the waterfall's frame (its title
// and the parts' names) shows faintly, values and bars hidden, as what
// comes next. The GDP bar carries no number: that figure is the headline
// tile's. Bare numbers, the unit in each subtitle.

const CL_WORDS = { [CENTRAL]: 'central closure', [BOUND]: 'closed capital' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const GROW_STAGGER = 80; // ms between waterfall bars

function Waterfall({ rows, on, hl, setHl, path }) {
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
              <span className="p2-wf-swatch" style={{ '--sw': PART_COLOR[r.id] }} aria-hidden="true" />
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
            <span className="p2-wf-value" data-path={r.value == null ? undefined : `${path}.${r.id === 'capital' ? 'gross_capital' : r.id}`}>
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

// Step 3's items, true for the cell in view: each reads a sign and prints
// no figure (the figures are on the charts). `icon` is a concept (a
// direction where the item states one, from the same sign as its words);
// The render adds chips for the parts named (labour, abroad, wear).
export function outChangeItems(ch) {
  const out = [
    { key: 'gdp', icon: dirConcept(ch.gdp), text: `GDP is ${dirWord(ch.gdp)} the path` },
    { key: 'labour', icon: dirConcept(ch.labour), text: `is ${dirWord(ch.labour)} it` },
  ];
  if (ch.gdp > 0 && ch.labour < 0) out.push({ key: 'all', icon: 'why', text: 'Capital takes all of the extra output, and more' });
  if (ch.foreign > 0 && ch.depreciation > 0) {
    out.push({ key: 'abroad', icon: 'foreign', text: 'Part goes abroad or covers wear on more capital' });
    out.push({ key: 'gni', icon: 'gni', text: 'So national income rises less than GDP' });
  }
  return out;
}

// A part's name as a chip: hovering, focusing or tapping it picks out its
// ribbon in the Sankey and its row in the waterfall. No number: each
// figure is printed once, on the chart. `on` is the part picked.
function Chip({ part, on, pick, children }) {
  const lit = on === part;
  return (
    <button
      type="button"
      className={`p2-chip${lit ? ' is-on' : ''}`}
      style={{ '--sw': PART_COLOR[part] }}
      data-part={part}
      onMouseEnter={() => pick(part)}
      onMouseLeave={() => pick(null)}
      onFocus={() => pick(part)}
      onBlur={() => pick(null)}
      onClick={() => pick(lit ? null : part)}
    >
      <span className="p2-chip-sw" aria-hidden="true" />
      {children}
    </button>
  );
}

// The graphic: the Sankey, the waterfall below it. `state` 0-2; `all`
// draws the last state with nothing hidden (phones).
function OutputGraphic({ state, sid, cl, base, ch, all = false, hl, setHl }) {
  const [ref, seen] = useInView({ rootMargin: '0px 0px -15% 0px' });
  const s = all ? 2 : state;
  // a pick holds only in the state it was made in (phones: always), so a
  // row focused when the reader scrolls back, which loses focus without a
  // blur as the waterfall goes inert, lights nothing
  const lit = hl && (all || hl.s === s) ? hl.id : null;
  const pick2 = (id) => setHl(id ? { id, s: 2 } : null);
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
        <p className="story-figure-title">
          <Tx icon="gdp">The OBR-central path, {SPLIT_YEAR}</Tx>
        </p>
        <p className="story-figure-unit">
          <Tx icon="measure" size={12}>
            {cap(CL_WORDS[cl])}. Of every 100 of GDP
          </Tx>
        </p>
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
              highlight={lit ?? undefined}
              onHover={s >= 2 ? pick2 : undefined}
            />
          </div>
        ) : (
          <p className="p2-pending">
            <Tx icon="provisional">The reference path at this closure is pending.</Tx>
          </p>
        )}
        <p className="story-source">
          <span className="p2-src-line">
            <Tx icon="tax" size={12}>
              Taxes are not split out: in OG-UK income tax is one combined series.
            </Tx>
          </span>{' '}
          <span className="p2-src-line">
            <Tx icon="source" size={12}>
              {SOURCE}
            </Tx>
          </span>
        </p>
      </div>
      {/* not yet reached: invisible, and out of reach of focus and pointer */}
      <div className={`p2-output-change p2-out-later${s >= 2 ? ' is-on' : ''}`} inert={s < 2 || undefined}>
        <p className="story-figure-title">
          <Tx icon="compare">
            What {SCEN_NAME[sid]} changes, {SPLIT_YEAR}
          </Tx>
        </p>
        <p className="story-figure-unit">
          <Tx icon="measure" size={12}>
            {where}. Gaps against the OBR-central path, % of its GDP, not forecasts of levels
          </Tx>
        </p>
        {ch ? (
          <>
            <Waterfall rows={waterfallRows(ch)} on={s >= 2} hl={lit} setHl={pick2} path={`output_split.change.${sid}.${cl}`} />
            <p className="story-source">
              <Tx icon="caveat" size={12}>
                Changes are rounded, so the parts may not add to the totals; the GDP bar ends at the headline GDP figure.
              </Tx>
            </p>
          </>
        ) : (
          <p className="p2-pending">
            <Tx icon="provisional">This solve is pending at the closure chosen above.</Tx>
          </p>
        )}
      </div>
    </figure>
  );
}

function outputSteps(sid, base, ch, hl, setHl, phone) {
  const labourMore = base ? base.labour > 50 : null;
  // a chip in card i picks for graphic state i (phones draw state 2 for all)
  const chip = (i) => {
    const on = hl && (phone || hl.s === i) ? hl.id : null;
    const pick = (id) => setHl(id ? { id, s: i } : null);
    return function chipFor(part, text) {
      return (
        <Chip part={part} on={on} pick={pick}>
          {text}
        </Chip>
      );
    };
  };
  const c0 = chip(0);
  const c1 = chip(1);
  const c2 = chip(2);
  // step 3's items, with the parts they name as chips
  const changeText = (it) =>
    it.key === 'labour' ? (
      <>
        {c2('labour', 'Labour income')} {it.text}
      </>
    ) : it.key === 'abroad' ? (
      <>
        Part goes {c2('foreign', 'abroad')} or covers {c2('depreciation', 'wear')} on more capital
      </>
    ) : (
      it.text
    );
  return [
    {
      id: 'p2-out-1',
      icon: 'gdp',
      title: 'GDP is paid as labour or capital income',
      body: (
        <Items
          items={[
            { icon: 'path', text: `Here: the OBR-central path in ${SPLIT_YEAR}` },
            { icon: 'gdp', text: 'Every pound of GDP is paid to someone' },
            {
              icon: 'labour',
              text: (
                <>
                  {c0('labour', 'Labour income')}, workers&rsquo; total pay: {labourMore == null ? 'one part' : labourMore ? 'the larger part' : 'the smaller part'}
                </>
              ),
            },
            {
              icon: 'capital',
              text: <>{c0('capital', 'Gross capital income')}: the rest, paid to capital&rsquo;s owners</>,
            },
          ]}
        />
      ),
    },
    {
      id: 'p2-out-2',
      icon: 'capital',
      title: 'Capital income splits three ways',
      body: (
        <Items
          items={[
            { icon: 'capital', text: <>{c1('domestic', 'Kept in the UK')} as net capital income</> },
            { icon: 'foreign', text: <>{c1('foreign', 'Paid abroad')}: profits on foreign-owned UK capital, interest on gilts held abroad</> },
            { icon: 'depreciation', text: <>{c1('depreciation', 'Depreciation')}: replaces capital that wears out</> },
          ]}
        />
      ),
    },
    {
      id: 'p2-out-3',
      pin: 'bottom',
      icon: 'compare',
      title: `What ${SCEN_NAME[sid]} changes`,
      body: (
        <>
          {ch ? (
            <Items
              items={outChangeItems(ch).map((it) => ({
                key: it.key,
                icon: it.icon,
                text: changeText(it),
              }))}
            />
          ) : (
            <p>This solve is pending at the closure chosen above.</p>
          )}
          <p className="p2-more">
            <Icon name={iconFor('link')} size={14} />
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
  // the part picked by a chip, a ribbon or a row, and the graphic state it
  // was picked in: { id, s }
  const [hl, setHl] = useState(null);
  const steps = outputSteps(sid, base, ch, hl, setHl, phone);
  return (
    <section id="story-output" className="p2-output" aria-labelledby="story-output-h">
      <h3 id="story-output-h" className="p2-headline-title">
        <Tx icon="outputSplit" size={22}>
          Where output goes in {SPLIT_YEAR}
        </Tx>
      </h3>
      <p className="p2-headline-lead">
        <Tx icon="path" size={16}>
          First the split on the OBR-central path, then how {SCEN_NAME[sid]} changes each part.{' '}
          {both ? 'With both closures chosen above, both figures show the central closure.' : null}
        </Tx>
      </p>
      {phone ? (
        <div className="p2-output-static">
          <OutputGraphic state={2} all sid={sid} cl={cl} base={base} ch={ch} hl={hl} setHl={setHl} />
          <ol className="p2-output-texts">
            {steps.map((s) => (
              <li key={s.id} id={s.id} className="p2-output-text">
                <h4 className="scrolly-title">
                  {s.icon ? <Icon name={iconFor(s.icon)} size={18} className="scrolly-title-icon" /> : null}
                  {s.title}
                </h4>
                <div className="scrolly-body">{s.body}</div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <Scrolly
          id="p2-output"
          label={`Where output goes in ${SPLIT_YEAR}`}
          steps={steps}
          graphic={(i) => <OutputGraphic state={Math.min(i, 2)} sid={sid} cl={cl} base={base} ch={ch} hl={hl} setHl={setHl} />}
        />
      )}
    </section>
  );
}
