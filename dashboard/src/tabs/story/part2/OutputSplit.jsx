'use client';

import Sankey from '@/components/story/Sankey.jsx';
import Reveal from '@/components/story/Reveal.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { SCEN_NAME, CENTRAL, BOUND } from '@/tabs/ai/surprise.js';
import { SOURCE } from './frame.jsx';
import { SPLIT_YEAR, PART_COLOR, share, change, splitFor, sankeyGraph, waterfallRows } from './split.js';

// Where output goes in the headline year, at the header's scenario and
// closure (the central closure with Both, which the text says). Left: a
// Sankey of the OBR-central path, GDP split into labour income and gross
// capital income, and that into three parts, as shares of GDP. Right: a
// waterfall of each part's change in the scenario, in % of the path's GDP.
// The GDP bar carries no number: that figure is the headline tile's.
// Bare numbers, the unit in each figure's subtitle.

const CL_WORDS = { [CENTRAL]: 'central closure', [BOUND]: 'closed capital' };

function Waterfall({ rows }) {
  const ends = rows.flatMap((r) => [r.from, r.to]);
  let lo = Math.min(0, ...ends);
  let hi = Math.max(0, ...ends);
  const pad = (hi - lo) * 0.04;
  lo -= pad;
  hi += pad;
  const at = (x) => ((x - lo) / (hi - lo)) * 100;
  return (
    <ol className="p2-wf" style={{ '--zero': `${at(0)}%` }}>
      {rows.map((r) => {
        const a = Math.min(r.from, r.to);
        const b = Math.max(r.from, r.to);
        return (
          <li key={r.id} className={`p2-wf-row${r.sub ? ' is-sub' : ''}${r.outline ? ' is-outline' : ''}`} data-row={r.id}>
            <span className="p2-wf-label">
              {r.sub ? <span className="p2-wf-of">of which </span> : null}
              {r.label}
            </span>
            <span className="p2-wf-track" aria-hidden="true">
              <span className="p2-wf-zero" />
              <span
                className="p2-wf-bar"
                style={{ left: `${at(a)}%`, width: `${Math.max(at(b) - at(a), 0.4)}%`, '--bar': PART_COLOR[r.id] }}
              />
            </span>
            <span className="p2-wf-value">
              {r.value == null ? (
                <NavLink tab="story" anchor="story-headline">
                  headline tile
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

// The sentence under the two figures, true for the cell in view: it reads
// the signs, and prints no figure (the figures are on the charts).
function why(ch) {
  const out = [];
  if (ch.gdp > 0 && ch.labour < 0) {
    out.push(
      'GDP is above the path while labour income, what workers are paid in total, is below it: capital takes a larger share of a larger output, so all of the extra output and more goes to capital.',
    );
  } else {
    out.push(`GDP is ${ch.gdp >= 0 ? 'above' : 'below'} the path and labour income is ${ch.labour >= 0 ? 'above' : 'below'} it.`);
  }
  if (ch.foreign > 0 && ch.depreciation > 0) {
    out.push(
      'Part of the extra capital income is paid to foreign owners and part covers the wear on a larger capital stock, so national income rises by less than GDP.',
    );
  }
  return out.join(' ');
}

export default function OutputSplit({ sid, closure }) {
  const { cl, base, ch } = splitFor(sid, closure);
  const both = closure === 'both';
  const where = `${SCEN_NAME[sid]}, automation + productivity, ${CL_WORDS[cl]}, common fiscal rule`;
  const graph = base ? sankeyGraph(base, true) : null;
  const sankeyLabel = base
    ? `Sankey diagram: GDP on the OBR-central path in ${SPLIT_YEAR}, ${CL_WORDS[cl]}, split into labour income (${share(base.labour)} of every 100) and gross capital income, which splits into net capital income kept in the UK (${share(base.domestic)}), payments to foreign owners of UK capital and gilts (${share(base.foreign)}) and depreciation (${share(base.depreciation)}).`
    : '';
  return (
    <Reveal as="section" id="story-output" className="p2-output" aria-labelledby="story-output-h">
      <h3 id="story-output-h" className="p2-headline-title">
        Where output goes in {SPLIT_YEAR}
      </h3>
      <p className="p2-headline-lead">
        Every pound of GDP is paid to someone: to workers as labour income, or as capital income to owners at home or abroad,
        part of it to replace worn-out capital. On the left, the split on the OBR-central path; on the right, how{' '}
        {SCEN_NAME[sid]} changes each part.{' '}
        {both ? 'With both closures chosen above, both figures show the central closure.' : null}
      </p>
      <div className="p2-output-grid">
        <figure className="p2-figure p2-output-fig">
          <p className="story-figure-title">The OBR-central path, {SPLIT_YEAR}</p>
          <p className="story-figure-unit">{CL_WORDS[cl][0].toUpperCase() + CL_WORDS[cl].slice(1)}. Of every 100 of GDP</p>
          {graph ? (
            <div className="p2-sankey">
              <Sankey graphs={[graph]} label={sankeyLabel} width={520} height={300} pad={22} />
            </div>
          ) : (
            <p className="p2-pending">The reference path at this closure is pending.</p>
          )}
          <p className="p2-output-note">
            Paid abroad: profits on foreign-owned UK capital and interest on gilts held abroad. Taxes are not split out: in OG-UK
            income tax is one combined series.
          </p>
          <figcaption className="story-source">{SOURCE}</figcaption>
        </figure>
        <figure className="p2-figure p2-output-fig">
          <p className="story-figure-title">What {SCEN_NAME[sid]} changes, {SPLIT_YEAR}</p>
          <p className="story-figure-unit">
            {where[0].toUpperCase() + where.slice(1)}. Gap against the OBR-central path, % of its GDP
          </p>
          {ch ? (
            <>
              <Waterfall rows={waterfallRows(ch)} />
              <p className="p2-output-note">
                Rounded, so the parts may not add to the totals. The GDP bar ends at the headline GDP figure.
              </p>
            </>
          ) : (
            <p className="p2-pending">This solve is pending at the closure chosen above.</p>
          )}
          <figcaption className="story-source">{SOURCE}</figcaption>
        </figure>
      </div>
      {ch ? (
        <p className="p2-output-why">
          In this scenario, {why(ch)} These are gaps against the OBR-central path in {SPLIT_YEAR}, not forecasts of levels.{' '}
          <NavLink tab="explore" sub="economy" anchor="explore-part-economy">
            The labour share year by year is on Explore, Economy.
          </NavLink>
        </p>
      ) : null}
    </Reveal>
  );
}
