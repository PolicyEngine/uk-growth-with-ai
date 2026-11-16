'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useInView } from './motion.js';

const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// Fades and lifts its children in the first time they enter the viewport.
// Content on screen at first paint (and on the server, without JS) is never
// hidden: the fade is armed only for content below the fold at mount
// (round 1: no blank first frame). The CSS turns the motion off under
// prefers-reduced-motion.
export default function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...rest }) {
  const [ref, seen] = useInView();
  const [armed, setArmed] = useState(false);
  useIso(() => {
    const el = ref.current;
    if (el && el.getBoundingClientRect().top >= window.innerHeight) setArmed(true);
  }, []);
  return (
    <Tag ref={ref} className={`${armed ? 'reveal' : 'reveal-static'}${seen ? ' is-in' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}
