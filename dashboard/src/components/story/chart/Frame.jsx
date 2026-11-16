import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import ModelBadge from './ModelBadge.jsx';

// The frame round a chart: model badge (and any head actions, e.g. Replay),
// title, unit line, the drawing, then one foot: a legend (only where end
// labels will not do) and a one-line source. Fuller source detail (series
// ids, release dates, notes) goes in `sources`, a "Sources" disclosure that
// opens over the figure without changing its height.
//
// `titleReserve` (the longest title any state shows) and `footReserve`
// ({ legend, source }, the fullest foot any state shows) hold their height
// in hidden copies, so a state change never moves the drawing or the card.
// The copies are visibility: hidden, aria-hidden, inert and data-axis (out
// of innerText and the number checks).
//
// Every text line leads with a plain icon (title: `icon`, a concept; unit:
// measure; source: source; a legend entry: its swatch).
//
// `yTitle` / `xTitle`: the axis titles as HTML lines (for charts whose svg
// draws none): the y title with its unit above the plot (left), the x title
// under it (right), each a plain icon and data-axis-title="y" / "x"
// (check_axes.mjs). An svg chart may instead pass `title` to its <Axis>.
//
//   <Frame model="oguk" icon="gdp" title="GDP against the path" unit="% gap, not a forecast"
//     legend={[{ key: 'a', label: 'UK central', color: 'var(--series-2)' }]}
//     source={<>Source: <a href="…">OG-UK</a></>} sources={<p>…</p>}>
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

function Foot({ legend, source, sources }) {
  return (
    <>
      <Legend items={legend} />
      {source || sources ? (
        <div className="ch-source-row">
          {source ? (
            <p className="story-source ch-source" data-cite="">
              <Icon name={iconFor('source')} size={12} className="ch-source-icon" />
              <span className="ch-source-text">{source}</span>
            </p>
          ) : null}
          {sources ? (
            <details className="ch-sources">
              <summary>
                <Icon name={iconFor('source')} size={12} />
                Sources
              </summary>
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
        </p>
      ) : null}
      {unit ? (
        <p className="ch-unit">
          <Icon name={iconFor('measure')} size={13} className="ch-unit-icon" />
          {unit}
        </p>
      ) : null}
      {yTitle ? (
        <p className="ch-axis-title-html is-y" data-axis-title="y">
          <Icon name={iconFor('yAxis')} size={13} className="ch-axis-title-icon" />
          <span>{yTitle}</span>
        </p>
      ) : null}
      <div className="ch-plot">{children}</div>
      {xTitle ? (
        <p className="ch-axis-title-html is-x" data-axis-title="x">
          <Icon name={iconFor('xAxis')} size={13} className="ch-axis-title-icon" />
          <span>{xTitle}</span>
        </p>
      ) : null}
      {legend?.length || source || sources ? (
        <figcaption className={`ch-foot${footReserve ? ' ch-stack' : ''}`}>
          {footReserve ? (
            <div className="ch-stack-cell">
              <div>
                <Foot legend={legend} source={source} sources={sources} />
              </div>
              <div className="ch-ghost" aria-hidden="true" data-axis="" inert>
                <Legend items={footReserve.legend} />
                {footReserve.source ? <div className="story-source ch-source">{footReserve.source}</div> : null}
              </div>
            </div>
          ) : (
            <Foot legend={legend} source={source} sources={sources} />
          )}
        </figcaption>
      ) : null}
    </figure>
  );
}
