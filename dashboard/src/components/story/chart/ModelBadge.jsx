import D from '@/data/aiStudy2425.json';

// Which model a figure comes from, top-left of its frame: the model's name
// as plain meta text (round 1: no icon, no pill).
//   <ModelBadge model="oguk" />
// uk-ai-study's label comes from its data file: the model year
// (model_year_label) and, only while the study is provisional, that word.
export const studyLabel = (d = D) => ['Household study', d.model_year_label, d.provisional ? 'provisional' : null].filter(Boolean).join(' · ');
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
      {m.label}
    </span>
  );
}
