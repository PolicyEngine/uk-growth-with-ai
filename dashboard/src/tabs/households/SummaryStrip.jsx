'use client';

import IconLine from '@/components/ui/IconLine.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { D } from '@/tabs/story/part3/shared.jsx';
import { fmtBn, fmtPp } from '@/tabs/story/part3/format.js';
import { fmtGiniPts } from './figures.js';

// The main-case strip at the head of Explore > Households (Households
// redesign, Fable 5.2 ruling for Vahid, R2): four link tiles, each a figure
// of the main case on its draws, and each a link to the card that prints
// that measure. Every value restates its home (the Story, or card 7), so it
// carries data-axis and adds nothing to the page's figure count. Not a
// card and not a figure: a list of links. No tint by sign: these are not
// gains or losses to colour.
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const inWords = (n) => WORDS[n] ?? String(n);

export function stripTiles(d = D) {
  const h = d.headline;
  const resp = d.policy.rows.filter((r) => r.family === 'exposure');
  const costs = resp.map((r) => r.cost_bn);
  return [
    { key: 'cost', label: 'Net cost to the public finances', value: fmtBn(h.central_cost.value), sub: 'a year', icon: iconFor('finances'), anchor: 'hh-cost-lines' },
    { key: 'poverty', label: 'Absolute poverty', value: fmtPp(h.central_poverty.value), sub: 'before housing costs', icon: iconFor('poverty'), anchor: 'hh-rules' },
    { key: 'gini', label: 'Gini', value: fmtGiniPts(h.central_gini.value), sub: 'on its 0 to 100 scale', icon: iconFor('inequality'), anchor: 'hh-ladder' },
    {
      key: 'responses',
      label: `${inWords(resp.length)} policy responses`,
      value: `${fmtBn(Math.min(...costs))} to ${fmtBn(Math.max(...costs))}`,
      sub: resp.every((r) => r.poverty_pp < 0) ? 'cost a year on top of the main case; each lowers poverty' : 'cost a year on top of the main case; poverty effects vary',
      icon: iconFor('policy'),
      anchor: 'hh-policy',
      draws: resp.every((r) => r.draws === resp[0]?.draws) ? resp[0]?.draws : null,
    },
  ];
}

export default function SummaryStrip() {
  const tiles = stripTiles();
  const draws = D.headline.central_cost.draws;
  // the draw count once, where the responses ran on the same number
  const same = tiles[3].draws === draws;
  return (
    <div className="hh-strip-wrap">
      <ul className="hh-strip" aria-label="Main-case headlines">
        {tiles.map((t) => (
          <li key={t.key}>
            <NavLink tab="explore" sub="households" anchor={t.anchor} className="hh-tile">
              <IconLine as="span" icon={t.icon} tier="ui" className="hh-tile-label">
                {t.label}
              </IconLine>{' '}
              {/* spaces between the parts, so the text never runs a label
                  into its figure (label-joins) */}
              <span className="hh-tile-value" data-axis="">
                {t.value}
              </span>{' '}
              {/* the sub-line is its own block (a p), so the tile is not one
                  long list item to check_text */}
              <p className="hh-tile-sub">{t.key === 'responses' && !same && t.draws ? `${t.sub}; ${t.draws} draws` : t.sub}</p>
            </NavLink>
          </li>
        ))}
      </ul>
      <p className="hh-strip-cap">{`Main case · mean of ${draws} draws`}</p>
    </div>
  );
}
