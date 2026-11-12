'use client';

// Sub-tabs for the Scenarios and method, Literature and Code tabs: the shared
// row (ViewTabs, variant "sub", as Results uses it), plus the ?sub= state.
// Results keeps its sub-tab in page.jsx; these tabs keep theirs here, so
// page.jsx only passes `active`.
import { useEffect, useState } from 'react';
import ViewTabs from '@/components/ab/ViewTabs.jsx';

export const SUB_TAB_PARAM = 'sub';

export function useSubTabParam(values, active = true) {
  const fallback = values[0];
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return fallback;
    const sub = new URLSearchParams(window.location.search).get(SUB_TAB_PARAM);
    return values.includes(sub) ? sub : fallback;
  });
  useEffect(() => {
    if (!active) return;
    const params = new URLSearchParams(window.location.search);
    if (value === fallback) params.delete(SUB_TAB_PARAM);
    else params.set(SUB_TAB_PARAM, value);
    const search = params.toString();
    const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState({}, '', url);
    }
  }, [value, fallback, active]);
  const choose = (v) => {
    setValue(v);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };
  return [value, choose];
}

// tabs: [{ value, label, icon }]
export default function SubTabs({ tabs, value, onChange, ariaLabel, idPrefix }) {
  return (
    <ViewTabs
      tabs={tabs.map((t) => ({ id: t.value, label: t.label, icon: t.icon }))}
      value={value}
      onChange={onChange}
      idPrefix={idPrefix}
      label={ariaLabel}
      variant="sub"
    />
  );
}

export function SubTabPanel({ idPrefix, value, children }) {
  return (
    <div className="sub-panel" role="tabpanel" id={`${idPrefix}-${value}`} aria-labelledby={`${idPrefix}btn-${value}`}>
      {children}
    </div>
  );
}
