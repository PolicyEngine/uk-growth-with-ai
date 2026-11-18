'use client';

import { isValidElement, useRef } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import DownloadMenu from '@/components/ui/DownloadMenu.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { METHOD } from '@/lib/labels.js';
import { iconFor } from '@/lib/concepts.js';
import SourceLine, { Essential } from '@/components/ui/SourceLine.jsx';
import { Items } from '@/components/story/Items.jsx';
import { fileItem, navItem } from '@/lib/sourceItems.js';

// The one card. In fixed order: icon + title, with the card's one quiet
// "Sources and notes" button after it (+ download), one sentence stating
// the finding, the control bar, the plot, the legend, an optional essential
// caveat line, the logo. Behind the button (components/ui/SourceLine.jsx):
// the card's notes, then what was the "About this chart" fold, its
// sections in a fixed order, then the sources (`sources`: items), the
// Method section that explains the chart and the replication files.
const ABOUT = [
  ['read', 'How to read'],
  ['shows', 'What it shows'],
  ['how', 'How it’s calculated'],
  ['definitions', 'Definitions'],
  ['caveats', 'Caveats'],
  ['sources', 'Sources'],
];

export function MethodLink({ section }) {
  const m = METHOD[section];
  if (!m) return null;
  return (
    <p className="method-link">
      <NavLink tab="method" sub="how" anchor={m.id}>
        More in Method: {m.label} <Icon name="arrowRight" size={14} strokeWidth={2} />
      </NavLink>
    </p>
  );
}

// `replication`: { code, result } (URLs: the script that makes the figure
// and its result file, e.g. on GitHub), one icon line at the end of the fold.
export function Replication({ code, result }) {
  if (!code && !result) return null;
  return (
    <p className="replication-link">
      <Icon name={iconFor('replication')} size={14} />
      <span>
        Replicate:{' '}
        {code ? (
          <a href={code} target="_blank" rel="noopener noreferrer">
            code
          </a>
        ) : null}
        {code && result ? ' · ' : null}
        {result ? (
          <a href={result} target="_blank" rel="noopener noreferrer">
            result file
          </a>
        ) : null}
      </span>
    </p>
  );
}

export function AboutFold({ about, method, replication, title = 'About this chart' }) {
  const parts = ABOUT.filter(([k]) => about?.[k]);
  if (!parts.length && !method && !replication) return null;
  return (
    <Disclosure inCard title={title} preview={parts.map(([, t]) => t).join(' · ')}>
      {parts.map(([k, t]) => (
        <div key={k} className="info-section">
          <h4>{t}</h4>
          <div>{about[k]}</div>
        </div>
      ))}
      {method ? <MethodLink section={method} /> : null}
      {replication ? <Replication {...replication} /> : null}
    </Disclosure>
  );
}

// A section's content as note items: an <Items> list becomes one icon-led
// line per item; anything else is one note.
const asItems = (node) =>
  isValidElement(node) && node.type === Items ? (node.props.items ?? []).filter(Boolean).map((it) => ({ icon: it.icon, text: it.text })) : [node];

// Everything secondary about a card, for its "Sources and notes" button.
export function cardSources({ about, method, replication, sources = [], notes, read }) {
  const groups = [
    read?.length ? { title: 'How to read', notes: read.filter(Boolean).map((it) => ({ icon: it.icon, text: it.text })) } : null,
    notes?.length ? { title: 'Notes', notes: notes.filter(Boolean).map((it) => ({ icon: it.icon, text: it.text })) } : null,
    ...ABOUT.filter(([k]) => about?.[k]).map(([k, t]) => ({ title: t, notes: asItems(about[k]) })),
  ].filter(Boolean);
  const m = METHOD[method];
  const items = [
    ...(sources ?? []),
    m && !(sources ?? []).some((it) => it?.nav?.anchor === m.id) ? navItem(`Method: ${m.label}`, 'method', m.id, 'how') : null,
    replication?.code ? fileItem('Replicate: code', replication.code, 'PolicyEngine') : null,
    replication?.result ? fileItem('Replicate: result file', replication.result, 'PolicyEngine') : null,
  ].filter(Boolean);
  return { groups, items };
}

export default function Card({
  id, icon, title, finding, unit, controls, legend, about, method, replication, download, logo = false, className = '', children, foot, sources, notes, read, essential,
}) {
  const ref = useRef(null);
  const src = cardSources({ about, method, replication, sources, notes, read });
  return (
    <article className={`card ${className}`} id={id} ref={ref}>
      <header className="card-head">
        <h3>
          {icon ? <Icon name={icon} size={18} className="card-icon" /> : null}
          <span>{title}</span>
          {src.items.length || src.groups.length ? <SourceLine items={src.items} groups={src.groups} record={false} /> : null}
        </h3>
        {download ? <DownloadMenu title={download.title ?? (typeof title === 'string' ? title : '')} cardRef={ref} {...download} /> : null}
      </header>
      {controls}
      {finding ? <div className="card-finding">{finding}</div> : null}
      {unit ? <p className="card-unit">{unit}</p> : null}
      {children ? <div className="chart-plot">{children}</div> : null}
      {legend ? <div className="card-legend">{legend}</div> : null}
      <Essential>{essential}</Essential>
      {foot}
      {/* the notes, hidden, for the page's number checks (a note may be a
          number's one home); they show behind the button */}
      {notes?.length || read?.length ? (
        <div hidden data-source-notes="">
          <Items items={[...(read ?? []), ...(notes ?? [])]} />
        </div>
      ) : null}
      {logo ? (
        <div className="card-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logos/policyengine-teal.png" alt="PolicyEngine" width="80" height="17" />
        </div>
      ) : null}
    </article>
  );
}

// A text card: icon + title, a line or two, an optional "Details" fold.
export function InfoCard({ id, icon, title, tag, children, more, morePreview, foot, className = '' }) {
  return (
    <article className={`card info ${className}`} id={id}>
      <header className="card-head">
        <h3>
          {icon ? <Icon name={icon} size={18} className="card-icon" /> : null}
          <span>{title}</span>
        </h3>
      </header>
      {tag ? <p className="card-tag">{tag}</p> : null}
      <div className="card-body">{children}</div>
      {foot}
      {more ? (
        <Disclosure inCard title="More info" preview={morePreview}>
          <div className="card-more">{more}</div>
        </Disclosure>
      ) : null}
    </article>
  );
}

// A section heading: plain icon, h2, one grey sentence.
export function SectionHeading({ id, icon, title, children }) {
  return (
    <div className="section-heading" id={id} tabIndex={-1}>
      {icon ? <Icon name={icon} size={20} className="section-icon" /> : null}
      <div className="section-heading-text">
        <h2>{title}</h2>
        {children ? <p>{children}</p> : null}
      </div>
    </div>
  );
}

// A headline tile: name, big signed figure, one line of meaning, and
// optional small rows below a hairline.
export function StatTile({ icon, name, value, tone, sub, tip, children }) {
  return (
    <div className="stat-tile">
      <div className="stat-name">
        {icon ? <Icon name={icon} size={16} /> : null}
        <span>{name}</span>
        {tip}
      </div>
      <div className={`stat-value${tone ? ` is-${tone}` : ''}`}>{value}</div>
      {sub ? <p className="stat-sub">{sub}</p> : null}
      {children ? <div className="stat-extra">{children}</div> : null}
    </div>
  );
}

// What a view is showing when a header picker does not fully apply to it.
export function ViewNote({ icon = 'info', children }) {
  return (
    <p className="view-note">
      <Icon name={icon} size={16} />
      <span>{children}</span>
    </p>
  );
}

// Icon + text, no box.
export function IconLine({ icon, children, className = '' }) {
  return (
    <p className={`icon-line ${className}`}>
      <Icon name={icon} size={16} />
      <span>{children}</span>
    </p>
  );
}
