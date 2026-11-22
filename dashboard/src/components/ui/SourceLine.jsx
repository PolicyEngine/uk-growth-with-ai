'use client';

import { isValidElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import IconLine from '@/components/ui/IconLine.jsx';
import { createPortal } from 'react-dom';
import Icon from '@/components/ab/Icon.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { iconFor } from '@/lib/concepts.js';
import { mathNodes } from '@/components/ui/MathSym.jsx';

// The one quiet "Sources and notes" button of every figure (Story,
// Explore, Method), the vitals panel and the "As of" stamp: a small plain
// BookOpen icon, placed straight after the figure's title, with no visible
// source text. Clicking it (or Enter / Space) opens a small popover (a
// bottom sheet on phones, 600px and below) that holds everything secondary:
// the publishers, every series, file and document (its name is the link,
// then the publisher, series ID and release date where known), the period
// the figure runs to ("Through ..."), and the figure's notes and caveats,
// worded as they were. A second click or Esc closes it; focus moves into
// the list and back to the button.
//
// The popover is drawn only while open, in a portal on <body>: out of the
// tab panel's text (the number checks read the page at rest), and clear of
// sticky or clipped figure frames. The root is a <span>, so it can sit in a
// title paragraph.
//
//   <SourceLine items={[{ publisher: 'Office for National Statistics', label: 'GDP', id: 'IHYQ', date: '2026-11-12', url }]}
//     through="2026 Q3" notes={['A caveat.']} />
//
// Item: { publisher, label, id, date (ISO or text), url, nav: { tab, sub,
// anchor } (a link inside the dashboard), extra (one more plain fact),
// kind: 'series' | 'file' | 'document' | 'page' }. `record={false}`: no
// hidden copy of the notes (for notes that were never on the page, e.g. a
// card's former "About this chart" fold, or block content).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d ?? ''));
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(d ?? '');
};

const SHORT = {
  'Office for National Statistics': 'ONS',
  'Office for Budget Responsibility': 'OBR',
  'Department for Science, Innovation and Technology and AI Security Institute': 'DSIT',
  'Department for Science, Innovation and Technology': 'DSIT',
  'International Monetary Fund': 'IMF',
};
export const shortPublisher = (p) => SHORT[p] ?? p;

const PLURAL = { series: 'series', file: 'files', document: 'documents', page: 'pages', source: 'sources', release: 'releases' };
function countText(items) {
  const counted = items.filter((it) => !it.nav);
  const kinds = new Set(counted.map((it) => it.kind ?? 'source'));
  const kind = kinds.size === 1 ? [...kinds][0] : 'source';
  const n = counted.length;
  if (!n) return '';
  return `${n} ${n === 1 ? kind : PLURAL[kind] ?? `${kind}s`}`;
}

export function summaryOf(items, lead = 'Source') {
  const pubs = [...new Set(items.filter((it) => it.publisher && !it.nav).map((it) => shortPublisher(it.publisher)))];
  const nav = items.filter((it) => it.nav).map((it) => it.navShort ?? 'Method');
  const parts = [pubs.join(', '), countText(items), ...new Set(nav)].filter(Boolean);
  return `${lead}: ${parts.join(' · ')}`;
}

const PHONE = '(max-width: 600px)';

// Inside the popover every line is one item led by one plain icon, by
// concept (lib/concepts.js): a note's own `icon`, else its group's; a
// source's by its kind.
const GROUP_ICON = {
  Notes: 'caveat',
  Assumptions: 'scenario',
  Settings: 'scenario',
  'How it’s counted': 'measure',
  'How to read': 'reading',
  Draws: 'draws',
  Model: 'model',
  'What it shows': 'canSay',
  'How it’s calculated': 'arithmetic',
  Definitions: 'measure',
  Caveats: 'caveat',
  Sources: 'source',
  More: 'deeper',
};
const KIND_ICON = { series: 'path', file: 'replication', document: 'source', page: 'source', release: 'asOf', source: 'source' };
// a note: a node, or { icon: concept, text }
const asNote = (n) => (n && typeof n === 'object' && !isValidElement(n) && 'text' in n ? n : { text: n });

function Item({ it, onNav }) {
  const meta = [it.publisher && !it.nav ? shortPublisher(it.publisher) : null, it.id, it.date ? `released ${fmtDate(it.date)}` : null, it.extra].filter(Boolean);
  const label = it.nav ? (
    <NavLink tab={it.nav.tab} sub={it.nav.sub} anchor={it.nav.anchor} className="src-pop-link" onClick={onNav}>
      {mathNodes(it.label)}
    </NavLink>
  ) : it.url ? (
    <a className="src-pop-link" href={it.url} target="_blank" rel="noopener noreferrer">
      {mathNodes(it.label)}
    </a>
  ) : (
    <span className="src-pop-name">{mathNodes(it.label)}</span>
  );
  return (
    <li className="src-pop-item">
      <Icon name={iconFor(it.nav ? 'deeper' : KIND_ICON[it.kind ?? 'source'] ?? 'source')} size={14} className="src-pop-ic" />
      <span className="src-pop-body">
        {label}
        {meta.length ? <span className="src-pop-meta">{meta.join(' · ')}</span> : null}
      </span>
    </li>
  );
}

// The muted essential-caveat line a figure may keep under its chart (at
// most one, 12 words or fewer); everything else goes behind the button.
// It leads with a concept icon (Vahid, 21 Nov: "with icon"; the inline Tx
// style, .p2-tx-icon): `icon`, a caveat by default.
export function Essential({ icon = 'caveat', children }) {
  return children ? (
    <IconLine concept={icon} tier="ui" className="src-essential" data-essential="">
      {children}
    </IconLine>
  ) : null;
}

export default function SourceLine({ items = [], notes = [], groups = [], through, label = 'Sources and notes', className = '', title, record = true }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const pop = useRef(null);
  const id = `src-pop-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const list = items.filter((it) => it && (it.label || it.url));
  // the note groups ("Assumptions", "How it's counted", "Draws", ...), then
  // any ungrouped notes as "Notes"; the sources come last
  const gs = [...groups, { title: 'Notes', notes }].map((g) => ({ ...g, notes: (g.notes ?? []).filter((n) => n && ![null, undefined, false, ''].includes(asNote(n).text)) })).filter((g) => g.notes.length);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  }, []);

  // place it at the click: a bottom sheet on phones; else under the button
  // (over it when there is no room below), kept inside the viewport
  const place = () => {
    if (window.matchMedia?.(PHONE).matches) return { sheet: true };
    const r = btn.current.getBoundingClientRect();
    const w = Math.min(420, window.innerWidth - 32);
    const left = Math.max(16, Math.min(r.left, window.innerWidth - w - 16)) + window.scrollX;
    const below = window.innerHeight - r.bottom > 300 || r.top < 300;
    return { left, width: w, top: (below ? r.bottom + 6 : r.top - 6) + window.scrollY, above: !below };
  };
  const toggle = () => {
    if (open) return setOpen(false);
    setPos(place());
    setOpen(true);
  };

  // focus moves into the list on open; Esc, a click outside or a resize close it
  useEffect(() => {
    if (!open) return undefined;
    const f = requestAnimationFrame(() => (pop.current?.querySelector('.src-pop-group a') ?? pop.current?.querySelector('button'))?.focus());
    const key = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    const down = (e) => {
      if (pop.current?.contains(e.target) || btn.current?.contains(e.target)) return;
      close(false);
    };
    const resize = () => close(false);
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', down);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(f);
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', down);
      window.removeEventListener('resize', resize);
    };
  }, [open, close]);

  // focus leaving the popover (tabbing past its last link) closes it
  const blur = (e) => {
    const to = e.relatedTarget;
    if (!to || pop.current?.contains(to) || btn.current?.contains(to)) return;
    setOpen(false);
  };

  const style = pos && !pos.sheet ? { left: pos.left, top: pos.top, width: pos.width } : undefined;
  const panel =
    open && pos && typeof document !== 'undefined'
      ? createPortal(
          <>
            {pos.sheet ? <div className="src-pop-backdrop" aria-hidden="true" onPointerDown={() => close(false)} /> : null}
            <div
              ref={pop}
              id={id}
              role="dialog"
              aria-label={title ?? label}
              className={`src-pop${pos.sheet ? ' is-sheet' : ''}${pos.above ? ' is-above' : ''}`}
              style={style}
              onBlur={blur}
            >
              <div className="src-pop-head">
                <span className="src-pop-title">{title ?? label}</span>
                <button type="button" className="src-pop-close" onClick={() => close()} aria-label="Close">
                  <Icon name="x" size={14} className="src-pop-x" />
                </button>
              </div>
              {gs.map((g) => (
                <div key={g.title} className="src-pop-group">
                  <span className="src-pop-sub">{g.title}</span>
                  <ul className="src-pop-notes">
                    {g.notes.map(asNote).map((n, i) => (
                      <li key={i} className="src-pop-note">
                        <Icon name={iconFor(n.icon ?? g.icon ?? GROUP_ICON[g.title] ?? 'caveat')} size={14} className="src-pop-ic" />
                        <span className="src-pop-body">{n.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {list.length || through ? (
                <div className="src-pop-group">
                  <span className="src-pop-sub">Sources</span>
                  {list.length ? <span className="src-pop-pubs">{summaryOf(list)}</span> : null}
                  <ul className="src-pop-list">
                    {list.map((it, i) => (
                      <Item key={`${it.url ?? it.label}-${i}`} it={it} onNav={() => setOpen(false)} />
                    ))}
                  </ul>
                  {through ? <p className="src-pop-through">Through {through}</p> : null}
                </div>
              ) : null}
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <span className={`src-line ${className}`.trim()} data-source-line="">
      <button
        ref={btn}
        type="button"
        className="src-line-btn"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        aria-label={label}
        title={label}
        onClick={toggle}
      >
        <Icon name="book" size={15} className="src-line-icon" />
      </button>
      {/* the notes as text, hidden, for the page's number checks (dumptabs
          reads [data-source-notes]): a figure's caveat may be a number's home */}
      {record && (gs.length || through) ? (
        <span hidden data-source-notes="">
          {gs.map((g) => (
            <span key={g.title}>
              {g.notes.map(asNote).map((n, i) => (
                <span key={i}> {n.text}</span>
              ))}
            </span>
          ))}
          {through ? <span> Through {through}</span> : null}
        </span>
      ) : null}
      {panel}
    </span>
  );
}
