import Icon from './Icon.jsx';
import Disclosure from './Disclosure.jsx';

// One idea per card: a plain icon, a short title, one or two lines, optional
// content (a command block, a fact list) and an optional fold for detail.
export default function InfoCard({ icon, title, children, more, moreTitle = 'More', morePreview, id, className = '' }) {
  return (
    <div className={`info-card ${className}`} id={id}>
      <h3 className="info-card-title">
        <Icon name={icon} size={18} />
        <span>{title}</span>
      </h3>
      <div className="info-card-body">{children}</div>
      {more ? (
        <Disclosure inCard title={moreTitle} preview={morePreview}>
          <div className="info-card-more">{more}</div>
        </Disclosure>
      ) : null}
    </div>
  );
}
