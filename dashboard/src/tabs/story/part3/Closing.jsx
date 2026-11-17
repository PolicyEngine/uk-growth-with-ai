'use client';

import Icon from '@/components/ab/Icon.jsx';
import { useEntry, useSnap } from '@/components/story/motion.js';

// The end of part 3: not sticky, no figures. What the one-year test leaves
// out (docs/story/part3-notes.md, Caveats), as one plain two-column list of
// short items with dot markers under the scene header. Corporation tax is
// not repeated here: the three-channels scene says, where it matters, that
// dividend tax is counted and corporation tax is not.

// One tinted panel of eight small tiles (Vahid: "need boxes or
// something"): a plain icon, a 2-3 word title and one muted line from the
// study's caveat. Hairline dividers, no card per tile: one object. Tiles
// appear in turn as the panel enters (useEntry, reversible; final on a
// jump; static under reduced motion). `text` keeps the full line (12 words
// or fewer) for tests and screen readers.
export const LEFT_OUT = [
  { id: 'reemploy', ic: 'replay', title: 'Re-employment', line: 'The displaced stay out of work all year' },
  { id: 'partners', ic: 'users', title: 'Partners’ hours', line: 'Unchanged' },
  { id: 'redundancy', ic: 'banknote', title: 'Redundancy pay', line: 'None counted' },
  { id: 'savings', ic: 'piggy', title: 'Running down savings', line: 'Households do not draw on them' },
  { id: 'jsa', ic: 'fileX', title: 'New-style JSA', line: 'None in the main case' },
  { id: 'young', ic: 'userMinus', title: 'Fewer young hires', line: 'Jobs lost are counted, not jobs never offered' },
  { id: 'self', ic: 'briefcase', title: 'The self-employed', line: 'The shocks apply to employees only' },
  { id: 'occ', ic: 'layers', title: 'AI exposure', line: 'Varies across nine occupation groups only' },
].map((t) => ({ ...t, text: `${t.title}: ${t.line.charAt(0).toLowerCase()}${t.line.slice(1)}` }));

// A level-(b) topic header (item 1) and a chip.
export const CLOSING_SUB = {
  title: 'What this one-year test leaves out',
};

export default function Closing() {
  const [ref, entry] = useEntry({ line: 0.85 });
  const snap = useSnap(ref, entry);
  return (
    <aside className="p3-close" aria-labelledby="p3-close-h">
      <header className="scene-head topic-head p3-close-head" data-scene={CLOSING_SUB.title} id="q-p3-close">
        <h3 className="scene-head-q" id="p3-close-h">
          {CLOSING_SUB.title}
        </h3>
        <span className="p3-close-chip">A one-year test, not a forecast</span>
      </header>
      <div ref={ref} className={`story-frame story-panel p3-close-card${entry.entered ? ' is-in' : ''}${snap ? ' is-snap' : ''}`}>
        <ul className="p3-out-list" aria-label="What this one-year test leaves out">
          {LEFT_OUT.map((t, i) => (
            <li key={t.id} data-item={t.id} className="p3-out-tile" style={{ '--i': i }}>
              <Icon name={t.ic} size={18} className="p3-out-ic" />
              <span className="p3-out-title">{t.title}</span>
              <span className="p3-out-line">{t.line}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
