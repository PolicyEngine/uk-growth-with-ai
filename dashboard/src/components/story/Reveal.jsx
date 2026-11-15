'use client';

import { useInView } from './motion.js';

// Fades and lifts its children in the first time they enter the viewport.
// The CSS turns the motion off under prefers-reduced-motion.
export default function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...rest }) {
  const [ref, seen] = useInView();
  return (
    <Tag ref={ref} className={`reveal${seen ? ' is-in' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}
