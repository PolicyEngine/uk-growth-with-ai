'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { tabById, CLOSURES, RULES } from '@/lib/labels.js';
import { SCENARIOS, ARMS, S } from '@/tabs/ai/surprise.js';
import { revealAnchor } from '@/lib/scroll.js';

// One reader and one writer for the address. Everything a reader can choose
// is in it, so any view can be shared as a link:
//   ?tab=  &sub=           the tab and its sub-tab (Explore, Method and sources)
//   &s=    &closure=       the header pickers: scenario, capital closure
//   &arms= &rule=          Results' control bars: arms shown, fiscal rule
//   &arm=  &wrule= &groups= Who gains' control bar
//   #anchor                a section on the page
// Defaults are left out. A change of tab or sub-tab is a history entry
// (pushState), so Back steps through the tabs; pickers and control bars
// replace the current entry.

const ARM_IDS = ARMS.map((a) => a.id);
export const WG_ARMS = ['tfp', 'zfixed', 'stress'];
export const WG_GROUPS = ['0', '1', '2', '3', '4', '5', '6', 'all'];
const WG_GROUPS_DEFAULT = ['0', '2', '6', 'all'];

export const DEFAULTS = {
  tab: 'story',
  sub: null, // null = the tab's first sub-tab
  s: S.default_scenario,
  closure: 'central',
  arms: ARM_IDS,
  rule: 'common',
  arm: 'tfp',
  wrule: 'dn',
  groups: WG_GROUPS_DEFAULT,
  anchor: null,
};

// Addresses from before the redesign keep working. Each entry points at a
// final address: [tab, sub, anchor].
// The hash keys below and ALIAS's keys are also listed in layout.tsx's
// NAV_PENDING script, which hides the Story while an old address resolves.
const LEGACY_TAB = {
  cohorts: ['explore', 'who'],
  literature: ['method', 'studies'],
  finances: ['explore', 'finances'],
  'public-finances': ['explore', 'finances'],
  growth: ['explore'],
  'growth/results': ['explore'],
  'growth/method': ['method'],
  methodology: ['method'],
  'methodology/how': ['method'],
  'methodology/code': ['method', 'code'],
  'methodology/coverage': ['method', 'studies'],
  'methodology/obr': ['method'],
  coverage: ['method', 'studies'],
};
const STUDY_SUBS = { coverage: 'coverage', numbers: 'numbers', sources: 'sources', matrix: 'coverage' };
const LEGACY_SUB = {
  results: { overview: ['story'], summary: ['story'], variables: ['explore', 'economy', 'explore-part-economy'], income: ['explore', 'economy', 'income'], economy: ['explore', 'economy', 'explore-part-economy'] },
  // Income and output was its own sub-tab until it joined Economy
  explore: { income: ['explore', 'economy', 'income'] },
  method: {
    built: ['method', null, 'm-closures'],
    limits: ['method', null, 'm-limits'],
    history: ['method', null, 'm-history'],
  },
  code: { reproduce: ['method', 'code'], oguk: ['method', 'code', 'use-oguk'] },
};
// The tabs before they were consolidated (November 2026): Results and Who
// gains are in Explore; Scenarios, Other studies and Code are in Method and
// sources. Used for old addresses and for links that name an old tab.
const ALIAS = {
  results: (sub, anchor) => ['explore', sub, anchor],
  who: (sub, anchor) => ['explore', 'who', anchor],
  scenarios: (sub, anchor) => ['method', 'scenarios', anchor],
  studies: (sub, anchor) => ['method', 'studies', anchor ?? STUDY_SUBS[sub] ?? null],
  literature: (sub, anchor) => ['method', 'studies', anchor ?? STUDY_SUBS[sub] ?? null],
  code: (sub, anchor) => ['method', 'code', anchor],
};
const own = (o, k) => (k != null && Object.hasOwn(o, k) ? o[k] : undefined);

// One step from any named place to a current one. An anchor on Method and
// sources with no sub-tab named is a Method section.
export function resolve(tab, sub = null, anchor = null) {
  const legacy = own(own(LEGACY_SUB, tab) ?? {}, sub);
  if (legacy) {
    anchor = legacy[2] ?? anchor;
    sub = legacy[1] ?? null;
    tab = legacy[0];
  }
  else if (own(ALIAS, tab)) [tab, sub, anchor] = ALIAS[tab](sub, anchor);
  if (tab === 'method' && anchor && !sub) sub = 'how';
  return [tab, sub, anchor];
}

const list = (text, allowed) => {
  if (text == null) return null;
  const got = text.split(',').filter((x) => allowed.includes(x));
  return allowed.filter((x) => got.includes(x));
};
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

export function parseUrl(search, hash = '') {
  const q = new URLSearchParams(search);
  const h = hash.replace(/^#/, '');
  let [tab, sub, anchor] = resolve(q.get('tab'), q.get('sub'), h || null);
  if (!tabById(tab)) {
    const old = own(LEGACY_TAB, tab) || own(LEGACY_TAB, h) || own(LEGACY_TAB, h.split('/')[0]);
    if (old) {
      [tab, sub = sub] = old;
      if (own(LEGACY_TAB, h) || own(LEGACY_TAB, h.split('/')[0])) anchor = null;
    } else if (!q.get('tab') && own(ALIAS, h.split('/')[0])) {
      // an old hash address naming a tab from before the consolidation
      // (#scenarios, #code, #who, #results, #studies)
      [tab, sub, anchor] = resolve(h.split('/')[0], null, null);
    } else tab = sub && tabById('explore').subs.some((x) => x.id === sub) ? 'explore' : DEFAULTS.tab;
  }
  const subs = tabById(tab).subs;
  if (!subs?.some((x) => x.id === sub)) sub = null;
  if (sub && sub === subs[0].id) sub = null;
  const s = q.get('s');
  const closure = q.get('closure');
  const rule = q.get('rule');
  const wrule = q.get('wrule');
  const arm = q.get('arm');
  return {
    tab,
    sub,
    s: SCENARIOS.some((x) => x.id === s) ? s : DEFAULTS.s,
    closure: CLOSURES.some((c) => c.id === closure) ? closure : DEFAULTS.closure,
    arms: list(q.get('arms'), ARM_IDS) ?? DEFAULTS.arms,
    rule: RULES.some((r) => r.id === rule && !r.disabled) ? rule : DEFAULTS.rule,
    arm: WG_ARMS.includes(arm) ? arm : DEFAULTS.arm,
    wrule: ['dn', 'common'].includes(wrule) ? wrule : DEFAULTS.wrule,
    groups: list(q.get('groups'), WG_GROUPS) ?? DEFAULTS.groups,
    anchor,
  };
}

export function formatUrl(st, pathname = '/') {
  const q = new URLSearchParams();
  if (st.tab !== DEFAULTS.tab) q.set('tab', st.tab);
  if (st.sub) q.set('sub', st.sub);
  if (st.s !== DEFAULTS.s) q.set('s', st.s);
  if (st.closure !== DEFAULTS.closure) q.set('closure', st.closure);
  if (!same(st.arms, DEFAULTS.arms)) q.set('arms', st.arms.join(','));
  if (st.rule !== DEFAULTS.rule) q.set('rule', st.rule);
  if (st.arm !== DEFAULTS.arm) q.set('arm', st.arm);
  if (st.wrule !== DEFAULTS.wrule) q.set('wrule', st.wrule);
  if (!same(st.groups, DEFAULTS.groups)) q.set('groups', st.groups.join(','));
  const text = q.toString().replace(/%2C/g, ',');
  return `${pathname}${text ? `?${text}` : ''}${st.anchor ? `#${st.anchor}` : ''}`;
}

// The sub-tab in view on a tab (its first when none is named).
export const subOf = (st, tab = st.tab) => {
  const subs = tabById(tab).subs;
  if (!subs) return null;
  return tab === st.tab && st.sub ? st.sub : subs[0].id;
};

const NavContext = createContext(null);

export function NavProvider({ children }) {
  const [st, setSt] = useState(DEFAULTS);
  const ref = useRef(DEFAULTS);
  // the sub-tab last open on each tab, restored on return
  const lastSub = useRef({});
  // false until the address has been read once on the client
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = (first) => {
      const next = parseUrl(window.location.search, window.location.hash);
      ref.current = next;
      setSt(next);
      if (first) setReady(true);
      const url = formatUrl(next, window.location.pathname);
      // an old address is rewritten to its new form
      if (first && url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(null, '', url);
      if (next.anchor) revealAnchor(next.anchor, { smooth: false });
    };
    read(true);
    const onPop = () => read(false);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // The named tab is now in the DOM: lift the head script's mark (layout.tsx),
  // which hid the content so a shared link never shows the Story first.
  useLayoutEffect(() => {
    if (ready) document.documentElement.removeAttribute('data-nav-pending');
  }, [ready]);

  // Pickers and control bars: replace the entry, keep the place on the page.
  const set = useCallback((patch) => {
    const next = { ...ref.current, ...patch, anchor: null };
    ref.current = next;
    setSt(next);
    window.history.replaceState(null, '', formatUrl(next, window.location.pathname));
  }, []);

  // A tab, a sub-tab or a section: a new history entry.
  const target = useCallback((name, { sub: named, anchor: at = null, patch } = {}) => {
    const cur = ref.current;
    const [tab, sub, anchor] = resolve(name, named ?? null, at);
    const subs = tabById(tab).subs;
    let nextSub = null;
    if (subs) {
      const want = sub ?? (tab === cur.tab ? cur.sub : lastSub.current[tab]) ?? null;
      nextSub = want && want !== subs[0].id && subs.some((x) => x.id === want) ? want : null;
    }
    return { ...cur, ...patch, tab, sub: nextSub, anchor };
  }, []);
  const go = useCallback(
    (tab, opts = {}) => {
      const cur = ref.current;
      const next = target(tab, opts);
      if (cur.sub) lastSub.current[cur.tab] = cur.sub;
      const url = formatUrl(next, window.location.pathname);
      if (url !== formatUrl(cur, window.location.pathname)) window.history.pushState(null, '', url);
      ref.current = next;
      setSt(next);
      if (next.anchor) revealAnchor(next.anchor);
      else if (next.tab !== cur.tab || next.sub !== cur.sub) window.scrollTo({ top: 0 });
    },
    [target],
  );
  const href = useCallback((tab, opts = {}) => formatUrl(target(tab, opts), '/'), [target]);

  const value = useMemo(() => ({ st, set, go, href }), [st, set, go, href]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

const fallbackHref = (name, opts = {}) => {
  const [tab, sub, anchor] = resolve(name, opts.sub ?? null, opts.anchor ?? null);
  return formatUrl({ ...DEFAULTS, tab, sub: sub && sub !== tabById(tab).subs?.[0].id ? sub : null, anchor });
};
const FALLBACK = { st: DEFAULTS, set: () => {}, go: () => {}, href: fallbackHref };
export const useNav = () => useContext(NavContext) ?? FALLBACK;

// An internal link: a real <a href> (so it opens in a new tab on request)
// that a plain click handles in place, keeping every choice the reader made.
export function NavLink({ tab, sub, anchor, patch, className = 'nav-link', children, ...rest }) {
  const { go, href, st } = useNav();
  const to = tab ?? st.tab;
  return (
    <a
      {...rest}
      className={className}
      href={href(to, { sub, anchor, patch })}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        go(to, { sub, anchor, patch });
      }}
    >
      {children}
    </a>
  );
}
