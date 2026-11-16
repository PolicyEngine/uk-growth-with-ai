'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// Short items in place of prose: each one a plain icon (a concept name from
// lib/concepts.js, or an Icon.jsx key) and about a dozen words.
//
//   <Items items={[{ icon: 'gapUp', text: <>GDP <strong>+0.92%</strong> above the path</> }]} />
export function Items({ items, className = '' }) {
  return (
    <ul className={`story-items ${className}`}>
      {items.filter(Boolean).map((it, i) => (
        <li key={it.key ?? i}>
          <Icon name={iconFor(it.icon)} size={16} className="story-item-icon" />
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
//   <WhyChain label="Why national income gains less" links={[{ icon: 'ai', text: 'AI arrives' }, …]} />
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
