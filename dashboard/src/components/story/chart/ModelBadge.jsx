import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import D from '@/data/aiStudy2425.json';

// Which model a figure comes from, top-left of its frame: a plain icon and
// the model's name (11px, 600, in the part accent), no fill or chip.
//   <ModelBadge model="oguk" />
// uk-ai-study's label comes from its data file: the model year
// (model_year_label) and, only while the study is provisional, that word.
export const studyLabel = (d = D) => ['uk-ai-study', d.model_year_label, d.provisional ? 'provisional' : null].filter(Boolean).join(' · ');
export const MODELS = {
  official: { label: 'Official statistics', icon: 'record' },
  oguk: { label: 'OG-UK', icon: 'model' },
  aistudy: { label: studyLabel(), icon: D.provisional ? 'provisional' : 'households' },
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
