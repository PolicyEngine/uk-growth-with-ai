'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Pill from '@/components/ui/Pill.jsx';
import { useNav } from '@/lib/nav.jsx';
import { ARM_PICK, CLOSURES, RULES } from '@/lib/labels.js';
import { subscribe } from '@/lib/scrollLoop.js';
import { VERSION_COLOR } from '@/lib/versionColors.js';
import { SCENARIOS, SCEN_NAME, ruleSolved } from '@/tabs/ai/surprise.js';

// The OG-UK settings as one pill (item-11-pill-fable.md): scenario,
// foreign capital, version and budget assumption, only those the page reads
// (labels.js pickersFor). At rest the page pill is the first thing in the
// model row after the page title (PagePill, item 22); once it has gone
// under the sticky stack, the sub-tab header shows the same pill
// (SettingsChip, data-condensed). The Story band has its own (BandPill:
// scenario and foreign capital). All of it is the address (one store,
// lib/nav.jsx), so every chart on every page follows the same choice.

// Each option's one line (item-11-pill-fable.md section 5); one home each:
// the closure, version and rule lines are labels.js's notes.
const SCEN_NOTE = {
  uk_low: 'The lower UK case, from OBR and IMF inputs',
  uk_central: 'The headline case, from IMF and OBR inputs',
  uk_high: 'The upper UK case, from OBR inputs',
  korinek: 'A US case, shown as the upper case; not calibrated to the UK',
};
const CLOSURE_SHORT = { central: 'Some', closed: 'None', both: 'Both' };
const CLOSURE_WORDS = { central: 'some foreign capital', closed: 'no foreign capital', both: 'both foreign-capital cases' };
const lower = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const noop = () => {};

// The pill's sections for a page: `pick` from labels.js, `alwaysRule` (Public
// finances: the budget assumption shows even at the common rule, Vahid 18
// Nov). The words in the pill drop the common rule elsewhere.
export function ogukSections(pick, st, set = noop, { alwaysRule = false } = {}) {
  if (!pick || pick.study) return [];
  const out = [];
  const locked = pick.scenario === 'locked';
  const sid = locked ? 'uk_central' : st.s;
  if (pick.scenario)
    out.push(
      locked
        ? { id: 'scenario', label: 'Scenario', glyph: 'sliders', locked: 'UK central: the only scenario solved for this page', seg: SCEN_NAME.uk_central, def: true }
        : {
            id: 'scenario',
            label: 'Scenario',
            glyph: 'sliders',
            kind: 'one',
            value: sid,
            options: SCENARIOS.map((x) => ({ value: x.id, label: x.label, desc: SCEN_NOTE[x.id] })),
            onChange: (s) => set({ s }),
            seg: SCEN_NAME[sid] ?? sid,
            def: sid === 'uk_central',
          },
    );
  if (pick.closure)
    out.push({
      id: 'closure',
      label: 'Foreign capital',
      glyph: 'globe',
      kind: 'one',
      value: st.closure,
      options: CLOSURES.map((c) => ({ value: c.id, label: CLOSURE_SHORT[c.id] ?? c.label, desc: c.note })),
      onChange: (closure) => set({ closure }),
      seg: CLOSURE_WORDS[st.closure] ?? st.closure,
      def: st.closure === 'central',
    });
  if (pick.arm) {
    const a = ARM_PICK.find((x) => x.id === st.armId) ?? ARM_PICK[0];
    out.push({
      id: 'arm',
      label: 'Version',
      glyph: 'gitBranch',
      kind: 'one',
      value: a.id,
      options: ARM_PICK.map((x) => ({ value: x.id, label: x.label, desc: x.note })),
      onChange: (armId) => set({ armId }),
      seg: lower(a.label),
      def: a.id === 'tfp',
    });
  }
  if (pick.rule) {
    const only = Array.isArray(pick.rule) ? pick.rule : null;
    const value = only ? st.wrule : st.rule;
    const r = RULES.find((x) => x.id === value) ?? RULES[0];
    const why = (id) => (only && !only.includes(id) ? 'Not solved for this page' : !ruleSolved(id, sid) ? `Not solved for ${SCEN_NAME[sid]}` : null);
    out.push({
      id: 'rule',
      label: 'Budget assumption',
      glyph: 'landmark',
      kind: 'one',
      value,
      options: RULES.map((x) => ({ value: x.id, label: x.short, desc: x.note, disabled: !!why(x.id), why: why(x.id) })),
      onChange: (rule) => set({ rule }),
      seg: value === 'common' && !alwaysRule ? null : lower(r.short),
      full: lower(r.short),
      // Who gains' debt-neutral default is always named, so never dropped first
      def: !only && value === 'common',
    });
  }
  return out;
}

// The Version section on its own, for a card's pill (one value with the
// page's: &arm=). `first`: the card pill's first segment starts with a
// capital.
export function versionSection(st, set, first = false) {
  const a = ARM_PICK.find((x) => x.id === st.armId) ?? ARM_PICK[0];
  return {
    id: 'arm',
    label: 'Version',
    glyph: 'gitBranch',
    kind: 'one',
    value: a.id,
    options: ARM_PICK.map((x) => ({ value: x.id, label: x.label, desc: x.note })),
    onChange: (armId) => set({ armId }),
    seg: first ? a.label : lower(a.label),
    def: a.id === 'tfp',
  };
}

// Versions shown (tick any; &arms=), for a chart that draws several
// versions: each option's swatch is its line colour (the key).
export function versionsShownSection(st, set) {
  const n = st.arms.length;
  const total = ARM_PICK.length;
  return {
    id: 'arms',
    label: 'Versions shown',
    glyph: 'gitBranch',
    kind: 'any',
    value: st.arms,
    options: ARM_PICK.map((x) => ({ value: x.id, label: x.label, desc: x.note, swatch: { color: VERSION_COLOR[x.id] } })),
    onChange: (arms) => set({ arms: ARM_PICK.map((x) => x.id).filter((id) => arms.includes(id)) }),
    seg: n === total ? `All ${total} versions` : n ? `${n} of ${total} versions` : 'No versions',
    def: n === total,
  };
}

// The settings in words, for the pill: one segment per setting shown, in
// the pill's order. Pure, so tested.
export function settingsSegments(pick, st, opts) {
  return ogukSections(pick, st, noop, opts)
    .filter((x) => x.seg)
    .map((x) => ({ key: x.id === 'arm' ? 'arm' : x.id, text: x.seg }));
}

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

// The page's pill and the sub-tab header's copy of it: one component, the
// same sections. `sub` names the page (Public finances always shows the
// budget assumption).
export function OgukPill({ pick, sub, className = '', align }) {
  const { st, set } = useNav();
  const sections = ogukSections(pick, st, set, { alwaysRule: sub === 'finances' });
  if (!sections.length) return null;
  return <Pill title="Macro model settings" sections={sections} className={className} align={align} />;
}
export function SettingsChip({ pick, sub }) {
  return <OgukPill pick={pick} sub={sub} className="is-header" align="right" />;
}
export function PagePill({ pick, sub }) {
  return <OgukPill pick={pick} sub={sub} className="is-page" />;
}
export function BandPill({ pick }) {
  return <OgukPill pick={pick} className="is-band" />;
}

// Keep the app's data-condensed mark: set once the page pill (in the model
// row after the page title) has scrolled up under the sticky stack, so the
// sub-tab header's pill takes over. One subscriber of the page's scroll
// loop (lib/scrollLoop.js): reads in read(), the attribute in write().
export function useCondensed(appRef, key) {
  useEffect(() => {
    const app = appRef.current;
    if (!app) return undefined;
    let on = null;
    let stuck = null;
    const off = subscribe({
      read: (f) => {
        // the page pill (the model row's) under the stack: the header's
        // copy shows
        const bar = app.querySelector('.tab-panel:not([hidden]) .settings-chip-wrap.is-page');
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
