'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Picker, { SegPicker } from '@/components/ui/Picker.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink, useNav } from '@/lib/nav.jsx';
import { ARM_PICK, CLOSURES, RULES, RULE_PICK } from '@/lib/labels.js';
import { subscribe } from '@/lib/scrollLoop.js';
import { SCENARIOS, SCEN_NAME, ruleSolved, solvedUnder } from '@/tabs/ai/surprise.js';

// The one OG-UK settings bar (addendum E4 idea 1). At rest, under the tab
// rows, it holds every choice the page reads: scenario and closure (compact
// pickers), then the page pickers, arm and fiscal rule (radio groups with
// icons; their one-line descriptions are in the tooltips). It is not
// sticky: once it has scrolled under the tab rows, the sub-tab header shows
// one compact chip that sums the settings up (SettingsChip) and opens them
// all in a popover (a sheet from the foot of the screen on a phone). All of
// it is the address (one store, lib/nav.jsx), so every chart on every page
// follows the same choice. On a uk-ai-study page the OG-UK settings do not
// apply: the bar shows a "different model" chip instead, and the sub-tab
// header a compact copy of it (ModelChip).

const SCEN_NOTE = { uk_low: 'Lower UK scenario, derived from OBR/IMF inputs', uk_central: 'Headline scenario, derived from IMF/OBR inputs', uk_high: 'Upper UK scenario, derived from OBR inputs', korinek: 'A US case used as the upper case, not calibrated to the UK' };
export const SCEN_OPTIONS = SCENARIOS.map((s) => ({ value: s.id, label: s.label, note: SCEN_NOTE[s.id] }));
// Under the "Foreign capital" label the options say only Some / None / Both.
// The closed picker shows the full name (`short`, which Picker shows first):
// on a laptop the settings bar hides the picker's label.
const CLOSURE_SHORT = { central: 'Some', closed: 'None', both: 'Both' };
export const CLOSURE_OPTIONS = CLOSURES.map((c) => ({ value: c.id, label: CLOSURE_SHORT[c.id] ?? c.label, short: c.label, note: c.note, icon: c.icon }));

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

// Copy this view: the address carries every choice. An icon button (its
// name in the tooltip and the accessible name); the result is announced.
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
  const name = 'Copy a link to this view, with every choice';
  return (
    <button type="button" className={`copy-link${done ? ' is-done' : ''}`} onClick={copy} title={done ? 'Link copied' : name} aria-label={name}>
      <Icon name="link" size={16} />
      <span className="visually-hidden" aria-live="polite">
        {done ? 'Link copied' : ''}
      </span>
    </button>
  );
}

// The settings in words, for the chip: one segment per setting the page
// reads, in the bar's order (scenario, closure, arm, rule). Pure, so tested.
const CLOSURE_WORDS = { central: 'some foreign capital', closed: 'no foreign capital', both: 'foreign capital: both' };
const lower = (t) => t.charAt(0).toLowerCase() + t.slice(1);
export function settingsSegments(pick, st) {
  if (!pick || pick.study) return [];
  const out = [];
  const sid = pick.scenario === 'locked' ? 'uk_central' : st.s;
  if (pick.scenario) out.push({ key: 'scenario', text: SCEN_NAME[sid] ?? sid });
  if (pick.closure) out.push({ key: 'closure', text: CLOSURE_WORDS[st.closure] ?? st.closure });
  if (pick.arm) {
    const a = ARM_PICK.find((x) => x.id === st.armId);
    if (a) out.push({ key: 'arm', text: lower(a.label) });
  }
  if (pick.rule) {
    const only = Array.isArray(pick.rule) ? pick.rule : null;
    const r = RULES.find((x) => x.id === (only ? st.wrule : st.rule));
    if (r) out.push({ key: 'rule', text: lower(r.short) });
  }
  return out;
}

// One radio group in the popover: the group's icon and name, then each
// option with its icon, label and one-line description. Arrow keys move
// and choose (roving tabindex); a disabled option says why.
function OptionGroup({ icon, label, value, options, onChange, locked }) {
  const id = useId();
  const refs = useRef({});
  const enabled = options.filter((o) => !o.disabled);
  const onKey = (e) => {
    const i = enabled.findIndex((o) => o.value === value);
    const last = enabled.length - 1;
    const next = { ArrowDown: i >= last ? 0 : i + 1, ArrowRight: i >= last ? 0 : i + 1, ArrowUp: i <= 0 ? last : i - 1, ArrowLeft: i <= 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(enabled[next].value);
    refs.current[enabled[next].value]?.focus();
  };
  const chosenOk = enabled.some((o) => o.value === value);
  return (
    <div className="sp-group">
      <p className="sp-group-name" id={id}>
        <Icon name={icon} size={16} />
        <span>{label}</span>
      </p>
      {locked ? (
        <p className="sp-locked">
          <Icon name="lock" size={14} />
          <span>
            {options.find((o) => o.value === value)?.label}: {locked}
          </span>
        </p>
      ) : (
        <div className="sp-options" role="radiogroup" aria-labelledby={id} onKeyDown={onKey}>
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button
                key={o.value}
                ref={(el) => {
                  refs.current[o.value] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                aria-disabled={o.disabled || undefined}
                tabIndex={o.disabled ? -1 : on || (!chosenOk && o === enabled[0]) ? 0 : -1}
                className={`sp-option${on ? ' is-on' : ''}${o.disabled ? ' is-disabled' : ''}`}
                onClick={() => !o.disabled && onChange(o.value)}
              >
                {o.icon ? <Icon name={o.icon} size={16} /> : <span className="sp-noicon" aria-hidden="true" />}
                <span className="sp-option-text">
                  <span className="sp-option-label">{o.label}</span>
                  <span className="sp-option-note">{o.disabled ? o.why : o.desc ?? o.note}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// The pickers in the popover: only those the page reads (labels.js)
function SettingsPanel({ pick }) {
  const { st, set } = useNav();
  const only = Array.isArray(pick.rule) ? pick.rule : null;
  const sid = pick.scenario === 'locked' ? 'uk_central' : st.s;
  return (
    <>
      {pick.scenario ? (
        <OptionGroup icon="sliders" label="Scenario" value={sid} options={SCEN_OPTIONS} onChange={(s) => set({ s })} locked={pick.scenario === 'locked' ? 'Who gains shows UK central only' : null} />
      ) : null}
      {pick.closure ? <OptionGroup icon="globe" label="Foreign capital" value={st.closure} options={CLOSURE_OPTIONS} onChange={(closure) => set({ closure })} /> : null}
      {pick.arm ? <OptionGroup icon="gitBranch" label="Version" value={st.armId} options={ARM_OPTIONS.map((o) => ({ ...o, desc: o.sub }))} onChange={(armId) => set({ armId })} /> : null}
      {pick.rule ? (
        <OptionGroup icon="landmark" label="Budget assumption" value={only ? st.wrule : st.rule} options={ruleOptions(sid, only).map((o) => ({ ...o, desc: o.sub }))} onChange={(rule) => set({ rule })} />
      ) : null}
    </>
  );
}

const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]), a[href], [tabindex="0"]';

// The compact settings chip in the sub-tab header: the settings in words,
// whole segments dropped from the end when the row is narrow (never cut
// mid-word; the full text is in the tooltip and the accessible name). It
// opens a dialog with every picker the page reads: a popover under the
// chip, a sheet from the foot of the screen at 600px and below. Enter or
// Space opens; Escape, the close button or a click outside closes; focus is
// held inside while open and goes back to the chip.
export function SettingsChip({ pick }) {
  const { st } = useNav();
  const segs = settingsSegments(pick, st);
  const full = segs.map((x) => x.text).join(' · ');
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(segs.length);
  const btn = useRef(null);
  const text = useRef(null);
  const pop = useRef(null);
  const popId = useId();

  // fit: show every segment, then drop from the end while the text is
  // wider than its box (on resize and on every change of the words)
  useLayoutEffect(() => {
    const el = text.current;
    const row = btn.current?.parentElement;
    if (!el || !row) return undefined;
    const fit = () => {
      const parts = [...el.children];
      parts.forEach((p) => p.removeAttribute('hidden'));
      let n = parts.length;
      while (n > 0 && el.scrollWidth > el.clientWidth + 1) {
        n -= 1;
        parts[n].setAttribute('hidden', '');
      }
      setShown(n);
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    ro?.observe(row);
    // the chip takes no room until the bar has gone under the stack: fit
    // again when it appears
    ro?.observe(btn.current);
    return () => ro?.disconnect();
  }, [full]);

  const close = (focus = true) => {
    setOpen(false);
    if (focus) btn.current?.focus();
  };
  useEffect(() => {
    if (!open) return undefined;
    const p = pop.current;
    (p?.querySelector('[role="radio"][tabindex="0"]') ?? p?.querySelector(FOCUSABLE))?.focus();
    const onDoc = (e) => {
      if (!p?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);
  const onPopKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...pop.current.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  if (!segs.length) return null;
  return (
    <div className={`settings-chip-wrap${open ? ' is-open' : ''}`}>
      <button
        ref={btn}
        type="button"
        className="settings-chip"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popId}
        aria-label={`Settings: ${full}. Change`}
        title={full}
        data-shown={shown}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Icon name="sliders" size={16} className="settings-chip-icon" />
        <span className="settings-chip-text" ref={text} aria-hidden="true">
          {segs.map((x) => (
            <span key={x.key} className="settings-chip-seg">
              {x.text}
            </span>
          ))}
        </span>
        <Icon name="chevronDown" size={14} strokeWidth={2} className="settings-chip-chevron" />
      </button>
      <div className="sheet-scrim settings-scrim" aria-hidden="true" hidden={!open} onClick={() => close()} />
      <div ref={pop} id={popId} className="settings-pop" role="dialog" aria-modal="true" aria-label="Settings for this page" hidden={!open} onKeyDown={onPopKey}>
        <p className="settings-pop-title">
          <span>Settings for this page</span>
          <button type="button" className="sheet-close" aria-label="Close settings" onClick={() => close()}>
            <Icon name="x" size={18} />
          </button>
        </p>
        {open ? <SettingsPanel pick={pick} /> : null}
      </div>
    </div>
  );
}

// The compact copy of the "different model" chip, for the sub-tab header
// on a uk-ai-study page
export function ModelChip() {
  return (
    <NavLink tab="method" sub="households" className="subhead-chip" title="A different model: the household study (PolicyEngine UK), households in one year. The OG-UK settings do not apply.">
      <Icon name={iconFor('households')} size={15} />
      <span>Different model</span>
    </NavLink>
  );
}

// Keep the app's data-condensed mark: set once the settings bar (at rest,
// under the tab rows) has scrolled up under the sticky stack, so the
// sub-tab header's chip takes over. One subscriber of the page's scroll
// loop (lib/scrollLoop.js): reads in read(), the attribute in write().
export function useCondensed(appRef, key) {
  useEffect(() => {
    const app = appRef.current;
    if (!app) return undefined;
    let on = null;
    let stuck = null;
    const off = subscribe({
      read: (f) => {
        const bar = app.querySelector(':scope > .settings-bar');
        const stack = app.querySelector(':scope > .sticky-stack');
        const cond = bar && stack ? bar.getBoundingClientRect().bottom <= stack.getBoundingClientRect().bottom + 1 : false;
        return { cond, stuck: f.y > 4 };
      },
      write: (d) => {
        if (d.cond !== on) {
          on = d.cond;
          app.toggleAttribute('data-condensed', d.cond);
        }
        if (d.stuck !== stuck) {
          stuck = d.stuck;
          app.toggleAttribute('data-stuck', d.stuck);
        }
      },
    });
    return off;
  }, [appRef, key]);
}

export default function SettingsBar({ pick }) {
  const { st, set } = useNav();
  if (pick.study) {
    return (
      <div className="settings-bar is-study">
        <NavLink tab="method" sub="households" className="model-chip">
          <Icon name={iconFor('households')} size={15} />
          <span>
            <strong>A different model:</strong> the household study (PolicyEngine UK), households in one year.
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
    <div className="settings-bar">
      <div className="settings-row">
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
        {pick.closure ? <Picker icon="globe" label="Foreign capital" value={st.closure} options={CLOSURE_OPTIONS} onChange={(closure) => set({ closure })} /> : null}
        {pick.arm ? <SegPicker icon="gitBranch" label="Version" value={st.armId} options={ARM_OPTIONS} onChange={(armId) => set({ armId })} /> : null}
        {pick.rule ? <SegPicker icon="landmark" label="Budget assumption" value={ruleValue} options={ruleOptions(sid, only)} onChange={(rule) => set({ rule })} /> : null}
      </div>
    </div>
  );
}
