'use client';

import SubTabs from '@/components/SubTabs.jsx';
import ModelComparisonPanel from '@/tabs/ai/ModelComparisonPanel.jsx';
import ResultsPanel from '@/tabs/ai/ResultsPanel.jsx';

export const SUBTABS = [
  { id: 'comparison', label: 'Model comparison' },
  { id: 'results', label: 'Results' },
];

export default function AiGrowthTab({ sub, onSubChange }) {
  const active = SUBTABS.some((t) => t.id === sub) ? sub : SUBTABS[0].id;
  return (
    <>
      <SubTabs tabs={SUBTABS} active={active} onChange={onSubChange} label="UK growth with AI" />
      {active === 'comparison' ? <ModelComparisonPanel /> : <ResultsPanel />}
    </>
  );
}
