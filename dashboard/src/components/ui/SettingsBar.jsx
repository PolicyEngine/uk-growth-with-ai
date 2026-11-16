'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Picker, { SegPicker } from '@/components/ui/Picker.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink, useNav } from '@/lib/nav.jsx';
import { ARM_PICK, CLOSURES, RULES, RULE_PICK } from '@/lib/labels.js';
import { SCENARIOS, SCEN_NAME, ruleSolved, solvedUnder } from '@/tabs/ai/surprise.js';

// The one OG-UK settings bar (addendum E4 idea 1): sticky under the tab
// row on Explore, it holds every choice the page reads: scenario and
// closure (compact pickers), then the page pickers, arm and fiscal rule
// (radio groups with icons and sub-labels). All of it is the address (one
// store, lib/nav.jsx), so every chart on every page follows the same
// choice. On a uk-ai-study page the OG-UK settings do not apply: the bar
// shows a "different model" chip instead.

const SCEN_NOTE = { uk_low: 'UK range, lower end', uk_central: 'Headline scenario', uk_high: 'UK range, upper end', korinek: 'A US upper case: Korinek et al.’s “substantial” inputs' };
export const SCEN_OPTIONS = SCENARIOS.map((s) => ({ value: s.id, label: s.label, note: SCEN_NOTE[s.id] }));
export const CLOSURE_OPTIONS = CLOSURES.map((c) => ({ value: c.id, label: c.label, note: c.note, icon: c.icon }));

// Why a rule is unavailable, for the tooltip of a disabled option
function ruleWhy(id, sid, only) {
  if (only && !only.includes(id)) return 'This page is solved under the common rule and debt-neutral transfers only';
  const names = solvedUnder(id).map((s) => s.label);
  return `Not solved for ${SCEN_NAME[sid]}: solved for ${names.join(' and ')}`;
}
export function ruleOptions(sid, only) {
  return RULES.map((r) => {
    const off = (only && !only.includes(r.id)) || !ruleSolved(r.id, sid);
    return { value: r.id, label: r.label, short: r.short, sub: RULE_PICK[r.id].sub, icon: RULE_PICK[r.id].icon, note: `${r.label}: ${r.note}`, disabled: off, why: off ? ruleWhy(r.id, sid, only) : undefined };
  });
}
const ARM_OPTIONS = ARM_PICK.map((a) => ({ value: a.id, label: a.label, short: a.short, sub: a.note, icon: a.icon, note: `${a.label}: ${a.note}` }));

// Copy this view: the address carries every choice
export function CopyLink() {
  const [done, setDone] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setDone(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1800);
    } catch {
      setDone(false);
    }
  };
  return (
    <button type="button" className="copy-link" onClick={copy} title="Copy a link to this view, with every choice">
      <Icon name="link" size={15} />
      <span className="copy-link-text" aria-live="polite">
        {done ? 'Link copied' : 'Copy link'}
      </span>
    </button>
  );
}

export default function SettingsBar({ pick }) {
  const { st, set } = useNav();
  const row = useRef(null);
  const prev = useRef(null);
  // keep the chosen options in view when the row scrolls sideways, but only
  // after the reader changes one: on first paint the row opens at its start,
  // with Scenario and Closure in view
  useEffect(() => {
    const key = `${st.armId}|${st.rule}|${st.wrule}`;
    const first = prev.current === null || prev.current === key;
    prev.current = key;
    if (first) return;
    const r = row.current;
    if (!r || r.scrollWidth <= r.clientWidth) return;
    const on = [...r.querySelectorAll('.seg-option.is-on')].pop();
    if (!on) return;
    const a = on.getBoundingClientRect();
    const b = r.getBoundingClientRect();
    if (a.right > b.right) r.scrollLeft += a.right - b.right + 16;
    else if (a.left < b.left) r.scrollLeft -= b.left - a.left + 16;
  }, [st.armId, st.rule, st.wrule]);
  if (pick.study) {
    return (
      <div className="settings-bar is-study" data-sticky-bar="">
        <NavLink tab="method" sub="households" className="model-chip">
          <Icon name={iconFor('households')} size={15} />
          <span>
            <strong>A different model:</strong> uk-ai-study, households in one year.
            <span className="model-chip-more"> The OG-UK settings do not apply.</span>
          </span>
        </NavLink>
      </div>
    );
  }
  const only = Array.isArray(pick.rule) ? pick.rule : null;
  const sid = pick.scenario === 'locked' ? 'uk_central' : st.s;
  // on a page with fewer rules (Who gains: common or debt-neutral) the rule
  // it shows is the one marked
  const ruleValue = only ? st.wrule : st.rule;
  return (
    <div className="settings-bar" data-sticky-bar="">
      <div className="settings-row" ref={row}>
        {pick.scenario ? (
          <Picker
            icon="sliders"
            label="Scenario"
            value={sid}
            options={SCEN_OPTIONS}
            onChange={(s) => set({ s })}
            locked={pick.scenario === 'locked'}
            lockedNote="Who gains shows UK central only"
          />
        ) : null}
        {pick.closure ? <Picker icon="globe" label="Closure" value={st.closure} options={CLOSURE_OPTIONS} onChange={(closure) => set({ closure })} /> : null}
        {pick.arm ? <SegPicker icon="gitBranch" label="Arm" value={st.armId} options={ARM_OPTIONS} onChange={(armId) => set({ armId })} /> : null}
        {pick.rule ? <SegPicker icon="landmark" label="Fiscal rule" value={ruleValue} options={ruleOptions(sid, only)} onChange={(rule) => set({ rule })} /> : null}
      </div>
    </div>
  );
}
