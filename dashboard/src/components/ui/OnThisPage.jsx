'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { stickyBottom } from '@/lib/scroll.js';
import { NavLink } from '@/lib/nav.jsx';

// A page's contents (AB2026 MethodContents): a sticky list at the left on a
// wide screen with the section being read marked, a "Jump to" select on a
// phone. sections: [{ id, title, icon }]
export default function OnThisPage({ tab, sections, label }) {
  const [current, setCurrent] = useState(sections[0]?.id);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const line = stickyBottom() + 48;
        let cur = sections[0]?.id;
        for (const { id } of sections) {
          const el = document.getElementById(id);
          if (el && el.offsetHeight > 0 && el.getBoundingClientRect().top <= line) cur = id;
        }
        const doc = document.documentElement;
        if (doc.scrollHeight > window.innerHeight && window.innerHeight + window.scrollY >= doc.scrollHeight - 2) cur = sections[sections.length - 1]?.id;
        setCurrent(cur);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [sections]);

  return (
    <nav className="page-contents" aria-label={label}>
      <p className="contents-title" aria-hidden="true">
        On this page
      </p>
      <ol className="contents-list">
        {sections.map((s) => (
          <li key={s.id}>
            <NavLink tab={tab} anchor={s.id} className="contents-link" aria-current={current === s.id ? 'location' : undefined}>
              {s.icon ? <Icon name={s.icon} size={16} /> : null}
              <span>{s.title}</span>
            </NavLink>
          </li>
        ))}
      </ol>
      <label className="contents-jump">
        <span>Jump to</span>
        <NavSelect tab={tab} sections={sections} current={current} />
      </label>
    </nav>
  );
}

import { useNav } from '@/lib/nav.jsx';
function NavSelect({ tab, sections, current }) {
  const { go } = useNav();
  return (
    <select value={current} onChange={(e) => go(tab, { anchor: e.target.value })}>
      {sections.map((s) => (
        <option key={s.id} value={s.id}>
          {s.title}
        </option>
      ))}
    </select>
  );
}
