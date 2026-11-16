'use client';

import { useEffect, useRef, useState } from 'react';

// The measured width of a chart's box in pixels (ResizeObserver), so a chart
// is drawn at its real size and its type is exact. Height is fixed
// (`height`) or follows the width (`aspect`, height / width, clamped to
// [minHeight, maxHeight]). On the server and before the first measure the
// fallback `width` is used; `ready` turns true once measured.
//
//   const box = useChartBox({ width: 560, aspect: 0.5, minHeight: 200 });
//   <div ref={box.ref}><svg width={box.width} height={box.height}>…</svg></div>
export function useChartBox({ width = 560, height, aspect, minHeight = 0, maxHeight = Infinity } = {}) {
  const ref = useRef(null);
  const [w, setW] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = (x) => {
      const r = Math.round(x);
      if (r > 0) setW((old) => (old != null && Math.abs(old - r) <= 1 ? old : r));
    };
    read(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => read(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = w ?? width;
  const H = height ?? Math.round(Math.min(maxHeight, Math.max(minHeight, W * (aspect ?? 0.5))));
  return { ref, width: W, height: H, ready: w != null };
}

export default useChartBox;
