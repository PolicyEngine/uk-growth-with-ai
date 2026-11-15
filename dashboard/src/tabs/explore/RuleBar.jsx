'use client';

import Picker from '@/components/ui/Picker.jsx';
import { useNav } from '@/lib/nav.jsx';
import { RULES } from '@/lib/labels.js';
import { solvedUnder } from '@/tabs/ai/surprise.js';

// The fiscal-rule picker of Explore's results pages, drawn like the header
// pickers (scenario, closure) and stored in the address (&rule=). Every
// chart, table and sentence on Economy and Public finances reads it.
const solvedNote = (id) => {
  if (id === 'common') return 'Spending follows GDP. Solved for every scenario';
  const names = solvedUnder(id).map((s) => s.label);
  return `${RULES.find((r) => r.id === id).note}. Solved for ${names.join(' and ')}`;
};
const OPTIONS = RULES.map((r) => ({ value: r.id, label: r.label, short: r.short, note: solvedNote(r.id) }));

export default function RuleBar() {
  const { st, set } = useNav();
  return <Picker icon="landmark" label="Fiscal rule" value={st.rule} options={OPTIONS} onChange={(rule) => set({ rule })} />;
}
