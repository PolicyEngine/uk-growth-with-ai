'use client';

import Icon from '@/components/ab/Icon.jsx';
import { NavLink } from '@/lib/nav.jsx';

// A card's one link to the Story scene that tells the same result
// (consolidated-design-fable.md §2, slot 9): last in the card, on Explore
// and Method only. The words are fixed; `name` (the scene, e.g. "the main
// case") goes in the link's title, not its text.
//
//   <StoryLink anchor="p3-central-step" name="the main case" />
export default function StoryLink({ anchor, name, className = '' }) {
  if (!anchor) return null;
  return (
    <p className={`story-link ${className}`.trim()}>
      <NavLink tab="story" anchor={anchor} className="story-link-a" title={name ? `In the Story: ${name}` : undefined}>
        See this in the story <Icon name="arrowRight" size={14} strokeWidth={2} />
      </NavLink>
    </p>
  );
}
