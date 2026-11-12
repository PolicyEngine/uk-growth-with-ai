'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { TipBox, useOutside } from '@/components/ab/Tip.jsx';

// Small pieces shared by the Scenarios and method, Literature and Code tabs.

export const ext = (href, text) => (
  <a href={href} target="_blank" rel="noreferrer">
    {text}
  </a>
);

// Scroll to an element once it is laid out (it may sit in a tab that has
// just been shown), below the sticky band and tab row.
export function scrollToId(id) {
  let tries = 0;
  const attempt = () => {
    const el = document.getElementById(id);
    if (el && el.offsetHeight > 0) {
      const top = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: 'smooth' });
      if (typeof el.focus === 'function' && el.tabIndex >= 0) el.focus({ preventScroll: true });
      return;
    }
    if (tries++ < 60) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}

// A link to an element on another tab (its one home).
export function GoTo({ tab, id, onTab, children }) {
  return (
    <a
      href={`?tab=${tab}${id ? `#${id}` : ''}`}
      className="mx-goto"
      onClick={(e) => {
        e.preventDefault();
        onTab?.(tab);
        if (id) scrollToId(id);
      }}
    >
      {children}
    </a>
  );
}

// A focusable SVG or HTML target with a tooltip on hover, keyboard focus or
// tap. `as` lets it be an SVG <g>.
export function useHover() {
  const [hi, setHi] = useState(null);
  const ref = useRef(null);
  useOutside(ref, hi != null, () => setHi(null));
  const bind = (key, label) => ({
    tabIndex: 0,
    role: 'button',
    'aria-label': label,
    onMouseEnter: () => setHi(key),
    onMouseLeave: () => setHi(null),
    onFocus: () => setHi(key),
    onBlur: () => setHi(null),
    onClick: () => setHi(key),
    onKeyDown: (e) => {
      if (e.key === 'Escape') setHi(null);
    },
  });
  return { hi, setHi, ref, bind };
}

// A tooltip box placed over an HTML anchor at (x%, y%) of its container.
export function FloatTip({ x, y, children, below = false }) {
  return (
    <span className={`mx-tip-anchor${below ? ' below' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}>
      <TipBox className="mx-tip">{children}</TipBox>
    </span>
  );
}

// A step indicator: one row of numbered steps that tracks the section in
// view and scrolls to a step on click. Sticky under the band and tab row.
export function StepRail({ steps, sub, onSub, label = 'Steps' }) {
  const first = (steps.find((s) => !sub || s.sub === sub) || steps[0])?.id;
  const [active, setActive] = useState(first);
  const rail = useRef(null);
  useEffect(() => {
    const els = steps.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined;
    const seen = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : null));
        const visible = steps.filter((s) => seen.get(s.id) != null);
        if (visible.length) setActive(visible[0].id);
      },
      { rootMargin: '-140px 0px -55% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [steps, sub]);
  // Keep the active step visible inside the rail at phone width
  useEffect(() => {
    const el = rail.current?.querySelector(`[data-step="${active}"]`);
    if (el && rail.current.scrollWidth > rail.current.clientWidth) {
      const r = rail.current;
      const left = el.offsetLeft - 24;
      if (left < r.scrollLeft || el.offsetLeft + el.offsetWidth > r.scrollLeft + r.clientWidth) r.scrollTo({ left, behavior: 'smooth' });
    }
  }, [active]);
  return (
    <nav className="mx-steprail" aria-label={label}>
      <ol ref={rail}>
        {steps.map((s, i) => {
          const on = s.id === active;
          const done = steps.findIndex((t) => t.id === active) > i;
          return (
            <li key={s.id} data-step={s.id} className={`${on ? 'is-active' : ''}${done ? ' is-past' : ''}`}>
              <a
                href={`#${s.id}`}
                aria-current={on ? 'step' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  if (s.sub && s.sub !== sub) onSub?.(s.sub);
                  scrollToId(s.id);
                }}
              >
                <span className="mx-step-num">{i + 1}</span>
                <span className="mx-step-label">{s.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// A numbered section on a guided tab: number, plain icon, title, one-line lede.
export function StepSection({ id, n, icon, title, lede, children }) {
  return (
    <section className="mx-step" id={id} aria-labelledby={`${id}-h`}>
      <header className="mx-step-head">
        <span className="mx-step-n" aria-hidden="true">
          {n}
        </span>
        <div>
          <h2 id={`${id}-h`}>
            <Icon name={icon} size={20} />
            <span>{title}</span>
          </h2>
          {lede ? <p>{lede}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}
