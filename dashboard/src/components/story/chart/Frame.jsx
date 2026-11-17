import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import ModelBadge from './ModelBadge.jsx';
import { Essential } from '@/components/ui/SourceLine.jsx';

// The frame round a chart: model badge (and any head actions, e.g. Replay),
// title (with the figure's one "Sources and notes" button after it,
// `source`: a <SourceLine>), unit line, the drawing, then one foot: a
// legend (only where end labels will not do) and any `essential` caveat
// line. `sources`: an older "Sources" disclosure, kept for callers that
// still pass one.
//
// `titleReserve` (the longest title any state shows) and `footReserve`
// ({ legend, source }, the fullest foot any state shows) hold their height
// in hidden copies, so a state change never moves the drawing or the card.
// The copies are visibility: hidden, aria-hidden, inert and data-axis (out
// of innerText and the number checks).
//
// Round 1 icon rule: the title carries the figure's one icon (`icon`, a
// concept); the unit line, axis titles, model tag and source line carry
// none (a legend entry's swatch is its mark).
//
// `yTitle` / `xTitle`: the axis titles as HTML lines (for charts whose svg
// draws none): the y title with its unit above the plot (left), the x title
// under it (right), each a plain icon and data-axis-title="y" / "x"
// (check_axes.mjs). An svg chart may instead pass `title` to its <Axis>.
//
//   <Frame model="oguk" icon="gdp" title="GDP against the path" unit="% gap, not a forecast"
//     legend={[{ key: 'a', label: 'UK central', color: 'var(--series-2)' }]}
//     source={<SourceLine items={[…]} />}>
//     <svg … />
//   </Frame>
export function Legend({ items, className = '' }) {
  if (!items?.length) return null;
  return (
    <ul className={`ch-legend ${className}`.trim()}>
      {items.map((l) => (
        <li key={l.key} className={l.off ? 'is-off' : undefined}>
          <span className={`ch-swatch${l.dashed ? ' is-dashed' : ''}${l.block ? ' is-block' : ''}`} style={{ '--sw': l.color }} aria-hidden="true" />
          {l.label}
        </li>
      ))}
    </ul>
  );
}

function Foot({ legend, essential, sources }) {
  return (
    <>
      <Legend items={legend} />
      {essential ? <Essential>{essential}</Essential> : null}
      {sources ? (
        <div className="ch-source-row">
          {sources ? (
            <details className="ch-sources">
              <summary>Sources</summary>
              <div className="ch-sources-body" data-reference="">
                {sources}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export default function Frame({
  model,
  icon = 'path',
  title,
  titleReserve,
  unit,
  yTitle,
  xTitle,
  legend,
  source,
  essential,
  sources,
  footReserve,
  actions,
  className = '',
  innerRef,
  children,
  ...rest
}) {
  return (
    <figure className={`ch-frame ${className}`.trim()} ref={innerRef} {...rest}>
      {model || actions ? (
        <div className="ch-frame-head">
          {model ? <ModelBadge model={model} /> : <span />}
          {actions ? <span className="ch-frame-actions">{actions}</span> : null}
        </div>
      ) : null}
      {title ? (
        <p className={`ch-title${titleReserve ? ' ch-stack' : ''}`}>
          <Icon name={iconFor(icon)} size={16} className="ch-title-icon" />
          <span className="ch-stack-cell">
            <span>{title}</span>
            {titleReserve ? (
              <span className="ch-ghost" aria-hidden="true" data-axis="" inert>
                {titleReserve}
              </span>
            ) : null}
          </span>
          {source}
        </p>
      ) : null}
      {unit ? (
        <p className="ch-unit">
          {unit}
        </p>
      ) : null}
      {yTitle ? (
        <p className="ch-axis-title-html is-y" data-axis-title="y">
          <span>{yTitle}</span>
        </p>
      ) : null}
      <div className="ch-plot">{children}</div>
      {xTitle ? (
        <p className="ch-axis-title-html is-x" data-axis-title="x">
          <span>{xTitle}</span>
        </p>
      ) : null}
      {legend?.length || essential || sources ? (
        <figcaption className={`ch-foot${footReserve ? ' ch-stack' : ''}`}>
          {footReserve ? (
            <div className="ch-stack-cell">
              <div>
                <Foot legend={legend} essential={essential} sources={sources} />
              </div>
              <div className="ch-ghost" aria-hidden="true" data-axis="" inert>
                <Legend items={footReserve.legend} />
                {footReserve.essential ? <Essential>{footReserve.essential}</Essential> : null}
              </div>
            </div>
          ) : (
            <Foot legend={legend} essential={essential} sources={sources} />
          )}
        </figcaption>
      ) : null}
    </figure>
  );
}
