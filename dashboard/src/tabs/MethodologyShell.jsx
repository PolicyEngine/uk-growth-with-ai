'use client';

import SubTabs from '@/components/SubTabs.jsx';
import MethodologyTab from '@/tabs/MethodologyTab.jsx';
import CodeTab from '@/tabs/CodeTab.jsx';
import ModelComparisonPanel from '@/tabs/ai/ModelComparisonPanel.jsx';
import ObrNumbers from '@/tabs/ObrNumbers.jsx';

export const SUBTABS = [
  { id: 'how', label: 'How OG-UK works' },
  { id: 'code', label: 'Code' },
  { id: 'coverage', label: 'Model coverage' },
  { id: 'obr', label: 'OBR comparison' },
];

export default function MethodologyShell({ sub, onSubChange, openModal }) {
  const active = sub || 'how';
  return (
    <>
      <SubTabs tabs={SUBTABS} active={active} onChange={onSubChange} />
      {active === 'how' && <MethodologyTab openModal={openModal} />}
      {active === 'code' && <CodeTab />}
      {active === 'coverage' && <ModelComparisonPanel />}
      {active === 'obr' && <ObrNumbers />}
    </>
  );
}
