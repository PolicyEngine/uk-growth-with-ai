'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';

// Short items in place of prose, about a dozen words each. Round 1 icon
// rule: items of one kind take a 4px dot (CSS), no icon; pass `icons` for
// a list whose items are unlike kinds (at most 4), and each item's `icon`
// (a concept name from lib/concepts.js) leads it.
//
//   <Items items={[{ icon: 'gapUp', text: <>GDP <strong>+0.92%</strong> above the path</> }]} />
export function Items({ items, className = '', icons = false }) {
  return (
    <ul className={`story-items${icons ? ' has-icons' : ''} ${className}`}>
      {items.filter(Boolean).map((it, i) => (
        <li key={it.key ?? i}>
          {icons ? <Icon name={iconFor(it.icon)} size={16} className="story-item-icon" /> : null}
          <span className="story-item-text">{it.text}</span>
        </li>
      ))}
    </ul>
  );
}

// A row of key facts: icon, number, a label of about three words.
// `value` may be a node (e.g. <CountUp>), printed once here.
//
//   <KeyFacts facts={[{ icon: 'jobLoss', value: '2.04m', label: 'employees assumed displaced' }]} />
export function KeyFacts({ facts, className = '' }) {
  return (
    <ul className={`story-facts ${className}`}>
      {facts.filter(Boolean).map((f, i) => (
        <li key={f.key ?? i} className="story-fact">
          <Icon name={iconFor(f.icon)} size={18} className="story-fact-icon" />
          <span className="story-fact-value">{f.value}</span>
          <span className="story-fact-label">{f.label}</span>
          {f.sub ? <span className="story-fact-sub">{f.sub}</span> : null}
        </li>
      ))}
    </ul>
  );
}

// A causal chain drawn as icon, arrow, icon: each link a plain icon and a
// short label, read left to right (top to bottom on narrow screens). An
// ordered list, so screen readers hear the steps in order.
//
//   <WhyChain label="Why national income gains less" links={[{ icon: 'ai', text: 'AI shock starts' }, …]} />
export function WhyChain({ links, label, className = '' }) {
  return (
    <ol className={`story-chain ${className}`} aria-label={label}>
      {links.filter(Boolean).map((l, i) => (
        <li key={l.key ?? i} className="story-chain-link">
          {i ? <Icon name="arrowRight" size={16} className="story-chain-arrow" /> : null}
          <span className="story-chain-node">
            <Icon name={iconFor(l.icon)} size={20} className="story-chain-icon" />
            <span className="story-chain-text">{l.text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

// Two columns of short items side by side, e.g. what each model can and
// cannot say. `columns`: [{ icon, title, items }].
export function Compare({ columns, className = '' }) {
  return (
    <div className={`story-compare ${className}`}>
      {columns.map((c) => (
        <section key={c.title} className="story-compare-col">
          <h4 className="story-compare-title">
            <Icon name={iconFor(c.icon)} size={18} /> {c.title}
          </h4>
          <Items items={c.items} />
        </section>
      ))}
    </div>
  );
}

// A grid of icon items: a plain icon, a short name and a short line each
// (part 3's "what the study leaves out", the limitations). `columns` on
// desktop (two at 900px and below, one on narrow phones).
//
//   <IconGrid label="What the study leaves out" items={[{ icon: 'excluded', title: 'Firms', text: 'No firm-side response' }]} />
export function IconGrid({ items, label, columns = 3, className = '' }) {
  return (
    <ul className={`icon-grid ${className}`.trim()} aria-label={label} style={{ '--icon-grid-cols': columns }}>
      {items.filter(Boolean).map((it, i) => (
        <li key={it.key ?? i}>
          <Icon name={iconFor(it.icon)} size={20} className="icon-grid-icon" />
          <span className="icon-grid-title">{it.title}</span>
          {it.text ? <span className="icon-grid-text">{it.text}</span> : null}
        </li>
      ))}
    </ul>
  );
}

// "What you just learned": a compact chip row at the end of a part, each
// chip a plain icon and a short line linking to the fact's home. `to` is an
// anchor on the Story (a string) or { tab, sub, anchor } for a home
// elsewhere.
//   old shape: { icon, text, to }       a line of at most 12 words, no new numbers
//   q/a shape: { icon, q, a, to }        the part's question replayed with its
//             answer (a string or node; the scene's own figures restated,
//             so the answer is data-axis: not a second home for the number
//             checks). `to` is the scene's question anchor, e.g. 'q-p1-output'.
//
//   <Recap items={[{ icon: 'gdp', q: 'How fast has the UK economy grown?', a: 'About 1.5% a year since 2010', to: 'q-p1-output' }]} />
//
// Round 1 (plan S4): the recap is off the page. A scene's closing line is
// the recap and the rail is the map, so Recap renders nothing unless a
// caller asks for it with `show` (kept for old callers and the tests).
export function Recap({ title = 'What you just learned', items, className = '', show = false }) {
  const list = (items ?? []).filter(Boolean);
  if (!list.length || !show) return null;
  const qa = list.some((it) => it.q != null);
  return (
    <nav className={`story-recap${qa ? ' is-qa' : ''} ${className}`.trim()} aria-label={title}>
      <p className="story-recap-title">
        <Icon name={iconFor('recap')} size={16} className="story-recap-icon" />
        {title}
      </p>
      <ul className="story-recap-list">
        {list.map((it, i) => {
          const to = typeof it.to === 'string' ? { tab: 'story', anchor: it.to } : (it.to ?? {});
          return (
            <li key={it.key ?? i}>
              <NavLink tab={to.tab ?? 'story'} sub={to.sub} anchor={to.anchor} className={`story-recap-chip${it.q != null ? ' is-qa' : ''}`}>
                {it.q != null ? (
                  // two short blocks (question, answer), each led by its icon
                  <span className="story-recap-qa">
                    <p className="story-recap-q">
                      <Icon name={iconFor(it.icon)} size={14} className="story-recap-chip-icon" />
                      {it.q}
                    </p>
                    {it.a != null ? (
                      <p className="story-recap-a" data-axis="">
                        <Icon name={iconFor('answer')} size={14} className="story-recap-chip-icon" />
                        {it.a}
                      </p>
                    ) : null}
                  </span>
                ) : (
                  <>
                    <Icon name={iconFor(it.icon)} size={14} className="story-recap-chip-icon" />
                    <span>{it.text}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
