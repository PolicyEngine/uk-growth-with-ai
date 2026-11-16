import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// Which model a figure comes from, top-left of its frame: 11px, 600, the
// part accent on the part tint (--part-accent, --part-tint), 4px radius.
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
