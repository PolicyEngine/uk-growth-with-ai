'use client';

import Icon from '@/components/ab/Icon.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { D, PR_URL } from './shared.jsx';

// The close of part 3: not sticky, no figures. What the study covers and
// leaves out (docs/story/part3-notes.md, Caveats), and where to read more.

export default function Closing() {
  return (
    <aside className="p3-close" aria-labelledby="p3-close-h">
      <h3 id="p3-close-h">What the study covers</h3>
      <p>
        The study is static and covers one year: each displaced worker is out of work for the whole year, and it models no behavioural
        response, such as finding other work or changing hours. It counts no corporation tax, so any tax on profits that take the place of
        lost wages is left out.
      </p>
      <ul className="p3-close-links">
        <li>
          <a href={PR_URL} target="_blank" rel="noreferrer">
            <Icon name="arrowRight" size={16} strokeWidth={2} /> The draft study and its code: uk-ai-study PR #{D.source.pr}
          </a>
        </li>
        <li>
          <NavLink tab="studies" className="p3-close-link">
            <Icon name="arrowRight" size={16} strokeWidth={2} /> Other studies of AI and the UK economy
          </NavLink>
        </li>
      </ul>
    </aside>
  );
}
