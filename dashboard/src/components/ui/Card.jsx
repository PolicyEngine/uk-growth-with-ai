'use client';

import { useRef } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import DownloadMenu from '@/components/ui/DownloadMenu.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { METHOD } from '@/lib/labels.js';

// The one card. In fixed order: icon + title (+ download), one sentence
// stating the finding, the control bar, the plot, the legend, the logo, and
// a closed "About this chart" fold whose sections come in a fixed order and
// which ends with a link to the Method section that explains the chart.
const ABOUT = [
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
      <NavLink tab="method" anchor={m.id}>
        More in Method: {m.label} <Icon name="arrowRight" size={14} strokeWidth={2} />
      </NavLink>
    </p>
  );
}

export function AboutFold({ about, method, title = 'About this chart' }) {
  const parts = ABOUT.filter(([k]) => about?.[k]);
  if (!parts.length && !method) return null;
  return (
    <Disclosure inCard title={title} preview={parts.map(([, t]) => t).join(' · ')}>
      {parts.map(([k, t]) => (
        <div key={k} className="info-section">
          <h4>{t}</h4>
          <div>{about[k]}</div>
        </div>
      ))}
      {method ? <MethodLink section={method} /> : null}
    </Disclosure>
  );
}

export default function Card({
  id, icon, title, finding, unit, controls, legend, about, method, download, logo = true, className = '', children, foot, aboutTitle,
}) {
  const ref = useRef(null);
  return (
    <article className={`card ${className}`} id={id} ref={ref}>
      <header className="card-head">
        <h3>
          {icon ? <Icon name={icon} size={18} className="card-icon" /> : null}
          <span>{title}</span>
        </h3>
        {download ? <DownloadMenu title={download.title ?? (typeof title === 'string' ? title : '')} cardRef={ref} {...download} /> : null}
      </header>
      {finding ? <p className="card-finding">{finding}</p> : null}
      {controls}
      {unit ? <p className="card-unit">{unit}</p> : null}
      {children ? <div className="chart-plot">{children}</div> : null}
      {legend ? <div className="card-legend">{legend}</div> : null}
      {foot}
      {logo ? (
        <div className="card-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logos/policyengine-teal.png" alt="PolicyEngine" width="80" height="17" />
        </div>
      ) : null}
      <AboutFold about={about} method={method} title={aboutTitle} />
    </article>
  );
}

// A text card: icon + title, a line or two, an optional "Details" fold.
export function InfoCard({ id, icon, title, tag, children, more, morePreview, className = '' }) {
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
      {more ? (
        <Disclosure inCard title="Details" preview={morePreview}>
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
