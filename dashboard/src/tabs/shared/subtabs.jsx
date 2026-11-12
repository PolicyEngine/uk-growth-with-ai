'use client';

// Sub-tabs for the Scenarios and method, Literature and Code tabs.
// TEMPORARY stand-in with the API of AB2026's SubTabs.jsx (useSubTabParam,
// SubTabs { tabs, value, onChange, ariaLabel, idPrefix }), until the shared
// component lands on dashboard/ab2026-redesign; then this file re-exports it.
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';

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
  return [value, setValue];
}

export default function SubTabs({ tabs, value, onChange, ariaLabel, idPrefix }) {
  const refs = useRef({});
  const keyMove = (e, i) => {
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') j = 0;
    if (e.key === 'End') j = tabs.length - 1;
    if (j == null) return;
    e.preventDefault();
    onChange(tabs[j].value);
    refs.current[tabs[j].value]?.focus();
  };
  return (
    <div className="sub-tabs-band mx-subtabs">
      <div className="mx-subtabs-row" role="tablist" aria-label={ariaLabel}>
        {tabs.map((t, i) => {
          const on = t.value === value;
          return (
            <button
              key={t.value}
              ref={(n) => {
                refs.current[t.value] = n;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-subtab-${t.value}`}
              aria-controls={`${idPrefix}-subpanel-${t.value}`}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              className={`mx-subtab${on ? ' is-on' : ''}`}
              onClick={() => onChange(t.value)}
              onKeyDown={(e) => keyMove(e, i)}
            >
              {t.icon ? <Icon name={t.icon} size={16} /> : null}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SubTabPanel({ idPrefix, value, children }) {
  return (
    <div className="sub-panel" role="tabpanel" id={`${idPrefix}-subpanel-${value}`} aria-labelledby={`${idPrefix}-subtab-${value}`}>
      {children}
    </div>
  );
}
