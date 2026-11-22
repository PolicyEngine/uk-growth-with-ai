// The one legend (consolidated-design-fable.md §2, slot 5): one row above
// the plot, a swatch and a short name per series. Every chart's key is this
// component: a card's `legend`, the economy wall, and the story frames
// (components/story/chart/Frame.jsx re-exports it).
//
//   <Legend items={[{ key, label, color, kind?, dashed?, block?, off?, current? }]} />
//
// `kind`: 'line' (default), 'dashed', 'block' (a filled square), 'dot' or
// 'diamond' (point marks, ink unless a colour is given), or 'ring' (a
// hollow point mark: the dumbbells' no-foreign-capital dot). `dashed` and
// `block` are the older flags, kept for the story frames. The swatch is
// aria-hidden; the label is the item's text, so the list reads as names.
// `off` dims an entry (a series not drawn); `current` marks the emphasised
// one (is-sel, aria-current).
const KIND = { dashed: ' is-dashed', block: ' is-block', dot: ' is-dot', diamond: ' is-diamond', ring: ' is-ring', line: '' };

export function swatchClass(l) {
  const kind = l.kind ?? (l.block ? 'block' : l.dashed ? 'dashed' : 'line');
  return `ch-swatch${KIND[kind] ?? ''}`;
}

export default function Legend({ items, className = '', label }) {
  const shown = (items ?? []).filter(Boolean);
  if (!shown.length) return null;
  return (
    <ul className={`ch-legend ${className}`.trim()} aria-label={label}>
      {shown.map((l) => (
        <li key={l.key} className={[l.off ? 'is-off' : '', l.current ? 'is-sel' : ''].filter(Boolean).join(' ') || undefined} aria-current={l.current ? 'true' : undefined}>
          <span className={swatchClass(l)} style={l.color ? { '--sw': l.color } : undefined} aria-hidden="true" />
          {l.label}
        </li>
      ))}
    </ul>
  );
}
