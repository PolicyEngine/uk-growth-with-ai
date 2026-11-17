'use client';

import { useEffect, useRef, useState } from 'react';

// In view now (not once): true while the element crosses the viewport less
// its bottom 15%, false when it leaves, so a build tied to it replays each
// time the reader scrolls back to it, from above or below.
export function useLiveInView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((es) => setSeen(es.some((e) => e.isIntersecting)), { rootMargin: '0px 0px -15% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}
