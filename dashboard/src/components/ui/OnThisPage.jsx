'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { stickyBottom } from '@/lib/scroll.js';
import { subscribe } from '@/lib/scrollLoop.js';
import { NavLink } from '@/lib/nav.jsx';

// A page's contents (AB2026 MethodContents): a sticky list at the left on a
// wide screen with the section being read marked, a "Jump to" select on a
// phone. sections: [{ id, title, icon }]
export default function OnThisPage({ tab, sub, sections, label }) {
  const [current, setCurrent] = useState(sections[0]?.id);
  const nav = useRef(null);
  useEffect(
    () =>
      // the page's one scroll loop (lib/scrollLoop.js): reads, then writes;
      // idle while the list is off screen (a hidden tab)
      subscribe({
        el: nav.current,
        read: () => {
          const line = stickyBottom() + 48;
          let cur = sections[0]?.id;
          for (const { id } of sections) {
            const el = document.getElementById(id);
            if (el && el.offsetHeight > 0 && el.getBoundingClientRect().top <= line) cur = id;
          }
          const doc = document.documentElement;
          if (doc.scrollHeight > window.innerHeight && window.innerHeight + window.scrollY >= doc.scrollHeight - 2) cur = sections[sections.length - 1]?.id;
          return cur;
        },
        write: (cur) => setCurrent(cur),
      }),
    [sections],
  );

  return (
    <nav ref={nav} className="page-contents" aria-label={label}>
      <p className="contents-title" aria-hidden="true">
        On this page
      </p>
      <ol className="contents-list">
        {sections.map((s) => (
          <li key={s.id}>
            <NavLink tab={tab} sub={sub} anchor={s.id} className="contents-link" aria-current={current === s.id ? 'location' : undefined}>
              {s.icon ? <Icon name={s.icon} size={16} /> : null}
              <span>{s.title}</span>
            </NavLink>
          </li>
        ))}
      </ol>
      <label className="contents-jump">
        <span>Jump to</span>
        <NavSelect tab={tab} sub={sub} sections={sections} current={current} />
      </label>
    </nav>
  );
}

import { useNav } from '@/lib/nav.jsx';
function NavSelect({ tab, sub, sections, current }) {
  const { go } = useNav();
  return (
    <select value={current} onChange={(e) => go(tab, { sub, anchor: e.target.value })}>
      {sections.map((s) => (
        <option key={s.id} value={s.id}>
          {s.title}
        </option>
      ))}
    </select>
  );
}
