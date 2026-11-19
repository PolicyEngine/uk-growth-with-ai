// The pages the browser-free probes read (caption-length, label-joins):
// each tab at its default address, rendered in jsdom on the active data.
// Text inside a closed fold is in the DOM (hidden), so a probe that must
// skip More info says so with insideFold().
import fs from 'node:fs';
import { render } from '@testing-library/react';
import { NavProvider } from '@/lib/nav.jsx';
import StoryTab from '@/tabs/story/StoryTab.jsx';
import ExploreTab from '@/tabs/explore/ExploreTab.jsx';
import MethodTab from '@/tabs/method/MethodTab.jsx';
import StudiesTab from '@/tabs/literature/LiteratureTab.jsx';
import CodeTab from '@/tabs/code/CodeTab.jsx';

export const PAGES = [
  ['story', 'tab=story', StoryTab],
  ['explore economy', 'tab=explore&sub=economy', ExploreTab],
  ['explore finances', 'tab=explore&sub=finances', ExploreTab],
  ['explore who', 'tab=explore&sub=who', ExploreTab],
  ['method', 'tab=method', MethodTab],
  ['evidence', 'tab=literature', StudiesTab],
  ['data and code', 'tab=code', CodeTab],
];

export function renderPage([, query, Page]) {
  window.history.replaceState(null, '', `/?${query}`);
  return render(
    <NavProvider>
      <Page />
    </NavProvider>,
  );
}

// Inside a "More info" fold (or any disclosure body, a sources popover or
// a download table)?
export const insideFold = (el) => Boolean(el.closest('.disclosure-content, [role="dialog"], .src-pop, .dl-menu, [hidden]'));
export const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;

// scripts/ratchet.mjs runs the probes with RATCHET_OUT set and reads each
// probe's count from that file (one JSON object per line).
export function recordCount(name, n) {
  const out = typeof process !== 'undefined' ? process.env.RATCHET_OUT : null;
  if (!out) return;
  fs.appendFileSync(out, `${JSON.stringify({ name, n, data: process.env.NEXT_PUBLIC_DATA || '2028' })}\n`);
}
