import Icon from './Icon.jsx';
import Disclosure from './Disclosure.jsx';

// An AB chart card (livingStandards/LsCard.jsx): header, summary sentence,
// unit line, plot, legend, logo, then a closed "About this chart" whose
// sections come in a fixed order and show only when they have content.
const ABOUT_ORDER = [
  ['shows', 'What it shows'],
  ['how', 'How it’s calculated'],
  ['definitions', 'Definitions'],
  ['caveats', 'Caveats'],
  ['sources', 'Sources'],
];

export default function ChartCard({ icon = 'trend', title, summary, unit, legend, about, children, className = '' }) {
  const parts = ABOUT_ORDER.filter(([k]) => about?.[k]);
  return (
    <div className={`chart-card ${className}`}>
      <div className="chart-header">
        <h3>
          <Icon name={icon} size={16} />
          <span>{title}</span>
        </h3>
      </div>
      {summary ? <p className="chart-description">{summary}</p> : null}
      {unit ? <p className="chart-unit">{unit}</p> : null}
      <div className="chart-plot">{children}</div>
      {legend ? <div className="chart-legend">{legend}</div> : null}
      <div className="card-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/logos/policyengine-teal.png" alt="PolicyEngine" width="80" height="17" />
      </div>
      {parts.length ? (
        <Disclosure inCard title="About this chart" preview={parts.map(([, t]) => t).join(' · ')}>
          {parts.map(([k, t]) => (
            <div key={k} className="info-section">
              <h4>{t}</h4>
              <div>{about[k]}</div>
            </div>
          ))}
        </Disclosure>
      ) : null}
    </div>
  );
}
