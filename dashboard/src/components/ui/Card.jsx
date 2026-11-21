'use client';

import { isValidElement, useRef } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import DownloadMenu from '@/components/ui/DownloadMenu.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { METHOD } from '@/lib/labels.js';
import { iconFor } from '@/lib/concepts.js';
import SourceLine from '@/components/ui/SourceLine.jsx';
import MoreInfo, { HEADS, asLines } from '@/components/ui/MoreInfo.jsx';
import ModelLine from '@/components/ui/ModelLine.jsx';
import StoryLink from '@/components/ui/StoryLink.jsx';
import { Items } from '@/components/story/Items.jsx';
import { fileItem, navItem } from '@/lib/sourceItems.js';

// The "About this chart" sections (AboutFold, and the Finding boxes'
// sources popover, cardSources), in their fixed order.
const ABOUT = [
  ['read', 'How to read'],
  ['shows', 'What it shows'],
  ['how', 'How it’s calculated'],
  ['definitions', 'Definitions'],
  ['caveats', 'Caveats'],
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

// Everything secondary about a card, for a "Sources and notes" button that
// carries words as well as links (the Finding boxes; a Card's own button
// carries links only, its words are in More info, cardMore).
export function cardSources({ about, method, replication, sources = [], notes, read }) {
  const groups = [
    read?.length ? { title: 'How to read', notes: read.filter(Boolean).map((it) => ({ icon: it.icon, text: it.text })) } : null,
    notes?.length ? { title: 'Notes', notes: notes.filter(Boolean).map((it) => ({ icon: it.icon, text: it.text })) } : null,
    ...ABOUT.filter(([k]) => about?.[k]).map(([k, t]) => ({ title: t, notes: asItems(about[k]) })),
  ].filter(Boolean);
  return { groups, items: cardLinks({ method, replication, sources }) };
}

// A card's links, for its book icon: the sources, the Method section that
// explains the chart and the replication files.
export function cardLinks({ method, replication, sources = [] }) {
  const m = METHOD[method];
  return [
    ...(sources ?? []),
    m && !(sources ?? []).some((it) => it?.nav?.anchor === m.id) ? navItem(`Method: ${m.label}`, 'method', m.id, 'how') : null,
    replication?.code ? fileItem('Replicate: code', replication.code, 'PolicyEngine') : null,
    replication?.result ? fileItem('Replicate: result file', replication.result, 'PolicyEngine') : null,
  ].filter(Boolean);
}

// A card's More info groups (components/ui/MoreInfo.jsx), in the fixed
// order How to read · How it's calculated · Caveats:
//   `more`: item 36's rows ({ label, text }: Measure, Compared with,
//     Settings, Period, Sample, How it is drawn) go first under How to read;
//     keyed groups ({ key: 'read' | 'how' | 'caveats', items }, item 17's)
//     go first under their head (c0-rulings-opus.md ruling 3);
//   `read`, `about.read`, `about.shows`, `about.definitions`: How to read;
//   `about.how`: How it's calculated;
//   `about.caveats`, `notes`, `essential` (the old caveat line): Caveats.
// `about.sources` is references only (c0-rulings-opus.md ruling 4): it stays
// behind the book icon with the links (Card), so every chart card keeps its
// one Sources and notes button; method sentences go to More info.
export function cardMore({ more, about, read, notes, essential }) {
  const list = Array.isArray(more) ? more.filter(Boolean) : more ? [more] : [];
  const keyed = list.filter((g) => g.key && Array.isArray(g.items));
  const rows = list.filter((r) => !(r.key && Array.isArray(r.items)));
  const heads = HEADS.map(([k]) => k);
  for (const g of keyed) if (!heads.includes(g.key) || g.title) throw new Error(`More info: a group must be keyed to a fixed head (${heads.join(', ')}) with no title of its own: ${g.key}`);
  const own = (k) => keyed.filter((g) => g.key === k).flatMap((g) => g.items);
  const fixed = {
    read: [...own('read'), ...asLines(rows, 'r'), ...asLines(read, 'h'), ...asLines(about?.read, 'a'), ...asLines(about?.shows, 's'), ...asLines(about?.definitions, 'd')],
    how: [...own('how'), ...asLines(about?.how, 'c')],
    caveats: [...own('caveats'), ...asLines(about?.caveats, 'v'), ...asLines(notes, 'n'), ...asLines(essential, 'e')],
  };
  return HEADS.map(([k, t]) => ({ key: k, title: t, items: fixed[k] })).filter((g) => g.items?.length);
}

// The one card (consolidated-design-fable.md §2). Its slots, in order:
//   1 the title: one plain icon, the title (a finding, no full stop); the
//     book icon (the links and any source words) and the download icon
//     as one actions group at the card's top right;
//   2 the model row: the model line (`model`, only where the card's model
//     or settings differ from the page's), with the card's settings where
//     they differ (`modelSettings`), and the card's own chooser, the pill
//     (`controls`);
//   3 the lead (`lead`; `finding` is its older name): one sentence;
//   4 the unit line (`unit`): what is plotted, its unit and span;
//   5 the legend (`legend`): one shared row (components/ui/Legend.jsx);
//   6 the chart (children);
//   7 More info (`more`, `about`, `read`, `notes`, `essential`): closed;
//   8 the story link (`story`: { anchor, name }), Explore and Method only:
//     the last line inside More info where the card has one (push D, Q5a;
//     Vahid: "integrate More info / See this in the story"), else last in
//     the card.
// The unit line and legend sit above the chart (Vahid, 18 Nov), so the
// reader has the key before the marks. `foot` (a node after the chart) is
// kept for the Households flags until item 24 rebuilds them.
export default function Card({
  id, icon, title, model, modelSettings, lead, finding, unit, controls, legend, about, method, replication, download, logo = false, className = '', children, foot, sources, notes, read, essential, more, moreId, story,
}) {
  const ref = useRef(null);
  const links = cardLinks({ method, replication, sources });
  const words = about?.sources ? [{ title: 'Sources', notes: asItems(about.sources) }] : [];
  const groups = cardMore({ more, about, read, notes, essential });
  const said = lead ?? finding;
  const hasSources = links.length > 0 || words.length > 0;
  const storyIn = Boolean(story?.anchor) && groups.some((g) => g.items?.length);
  return (
    <article className={`card ${className}`} id={id} ref={ref}>
      <header className="card-head">
        <h3>
          {icon ? <Icon name={icon} size={18} className="card-icon" /> : null}
          <span>{title}</span>
        </h3>
        {/* the card's actions, one group at its top right (push D, Q5b;
            Vahid: "better align"): the book icon (sources) and the download
            icon, the same 32px box and 15px icon, centred on the title's
            first line (v2.css .card-actions) */}
        {hasSources || download ? (
          <div className="card-actions">
            {hasSources ? <SourceLine items={links} groups={words} record={false} /> : null}
            {download ? <DownloadMenu title={download.title ?? (typeof title === 'string' ? title : '')} cardRef={ref} {...download} /> : null}
          </div>
        ) : null}
      </header>
      {model || controls ? (
        <div className="card-model-row">
          {model ? <ModelLine model={model} settings={modelSettings} /> : null}
          {controls}
        </div>
      ) : null}
      {said ? <div className="card-finding card-lead">{said}</div> : null}
      {unit ? <p className="card-unit">{unit}</p> : null}
      {legend ? <div className="card-legend">{legend}</div> : null}
      {children ? <div className="chart-plot">{children}</div> : null}
      {foot}
      <MoreInfo id={moreId ?? (id ? `${id}-more` : undefined)} groups={groups} foot={storyIn ? <StoryLink {...story} /> : null} />
      {storyIn ? null : <StoryLink {...(story ?? {})} />}
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
