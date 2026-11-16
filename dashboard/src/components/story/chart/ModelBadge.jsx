import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// Which model a figure comes from, top-left of its frame: a plain icon and
// the model's name (11px, 600, in the part accent), no fill or chip.
//   <ModelBadge model="oguk" />
export const MODELS = {
  official: { label: 'Official statistics', icon: 'record' },
  oguk: { label: 'OG-UK', icon: 'model' },
  aistudy: { label: 'uk-ai-study · provisional', icon: 'provisional' },
  illustration: { label: 'Illustration', icon: 'caveat' },
};

export default function ModelBadge({ model, className = '' }) {
  const m = MODELS[model];
  if (!m) return null;
  return (
    <span className={`ch-badge ${className}`.trim()} data-model={model}>
      <Icon name={iconFor(m.icon)} size={12} className="ch-badge-icon" />
      {m.label}
    </span>
  );
}
