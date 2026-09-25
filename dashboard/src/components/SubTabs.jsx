'use client';

// Horizontal sub-tab bar, a smaller sibling of the top-level `.tab-bar`.
export default function SubTabs({ tabs, active, onChange, label }) {
  return (
    <nav className="subtab-bar" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === active}
          className={`subtab-button${t.id === active ? ' active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
