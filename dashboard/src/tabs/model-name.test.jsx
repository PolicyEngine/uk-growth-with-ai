// The macro model's name (push D, Q1): readers meet "the macro model" or
// "the overlapping-generations model", never the package name "OG-UK".
// The name stays only where it points at the OG-UK code or package (a
// link to PSLmodels/OG-UK or its documentation, the install commands) and
// in data keys, ids and file paths. Two layers:
//   A. every string in the source (comments stripped), which covers what
//      the page probes cannot reach: hover tips, download captions and
//      columns, export SVG text, the meta description;
//   B. the rendered pages (text, aria-label, title), More info included.
// Each tab that names the model explains it once, in plain words
// (lib/labels.js MACRO_ABOUT).
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent } from '@testing-library/react';
import { PAGES, renderPage } from '@/lib/probeTestUtils.jsx';
import MethodSourcesTab from '@/tabs/method/MethodSourcesTab.jsx';
import { MACRO_ABOUT } from '@/lib/labels.js';

afterEach(cleanup);

const SRC = path.resolve(__dirname, '..');
const NAME = 'OG-UK';

// Layer A's allow-list: file (from src/) and a substring of the line.
const ALLOW = [
  // links and citations that point at the OG-UK code or package
  ['tabs/ai/links.js', 'github.com/PSLmodels/OG-UK'],
  ['tabs/method/sources.js', 'github.com/PSLmodels/OG-UK'],
  ['tabs/method/sources.js', "label: 'OG-UK default parameters'"],
  ['tabs/method/sources.js', "label: 'OG-UK'"],
  ['tabs/code/CodeTab.jsx', 'PSLmodels/OG-UK'],
  ['tabs/code/CodeTab.jsx', 'OG-UK checkout'],
  ['tabs/code/CodeTab.jsx', 'pip install -e OG-UK'],
  ['tabs/code/CodeTab.jsx', 'cd OG-UK'],
  ['tabs/code/CodeTab.jsx', "'OG-UK')} documentation"],
  ['tabs/code/CodeTab.jsx', 'OG-Core 0.17.0, OG-UK d0e6ae5</span>'],
  ['tabs/method/MethodTab.jsx', "ext(URLS.ogUkFork, 'OG-UK')"],
  ['tabs/method/MethodTab.jsx', "docItem('OG-UK, the UK calibration', URLS.ogUkFork, 'OG-UK')"],
  ['tabs/explore/SensitivityTable.jsx', "docItem('OG-UK default parameters', URLS.ogUkDefaults, 'OG-UK')"],
  ['tabs/story/part2/sources.jsx', "docItem('OG-UK, the model', SRC.ogUk, 'OG-UK')"],
  ['tabs/story/part2/sources.jsx', '<A href={OG_DEFAULTS}>OG-UK&rsquo;s calibration</A>'],
  ['tabs/story/part3/sources.jsx', 'OG-Core, the overlapping-generations model OG-UK is built on'],
];
const allowed = (file, line) => ALLOW.some(([f, s]) => f === file && line.includes(s));

// Comments out, strings and JSX text kept. A "//" after ":" is a URL.
const strip = (t) => t.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}

export function sourceHits() {
  const hits = [];
  for (const p of walk(SRC)) {
    const file = path.relative(SRC, p);
    strip(fs.readFileSync(p, 'utf8'))
      .split('\n')
      .forEach((line, i) => {
        if (line.includes(NAME) && !allowed(file, line)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 140)}`);
      });
  }
  return hits;
}

// Past entries keep their words (Vahid, 21 Nov: "Keep past entries"): the
// site changelog and the versions file are a historical record, so the
// entries written before push D keep "OG-UK" as they were. Listed one by
// one; any other entry, and every new one, says "the macro model".
//   site-changelog.json: by date and commit
const PAST_CHANGELOG = [
  ['2026-11-19', 'e57ab37'],
  ['2026-11-12', '55a929e'],
];
//   site-versions.json: by id ("oguk" is the package itself, its link)
const PAST_VERSIONS = ['solves', 'oguk'];
const pastCommit = new Set(PAST_CHANGELOG.map(([, c]) => c));
// a text node inside a listed changelog entry, as the Code tab renders it
// (Entry: one li per entry, its commit as the link text)
const inPastEntry = (el) => {
  const li = el?.closest('.mx-history-list > li');
  return !!li && pastCommit.has(li.querySelector('a')?.textContent.trim());
};

// Layer B: rendered text outside a link to the OG-UK code, code and pre.
const OK_LINK = 'a[href*="PSLmodels/OG-UK"], a[href*="pslmodels.github.io/OG-UK"], code, pre, [data-package]';
export function renderedHits(root, page) {
  const out = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.includes(NAME)) continue;
    if (n.parentElement?.closest(OK_LINK)) continue;
    if (inPastEntry(n.parentElement)) continue;
    out.push(`${page}: "${n.nodeValue.trim().slice(0, 120)}"`);
  }
  for (const el of root.querySelectorAll('[aria-label], [title]')) {
    for (const a of ['aria-label', 'title']) {
      const v = el.getAttribute(a);
      if (v?.includes(NAME)) out.push(`${page}: ${a} "${v.slice(0, 120)}"`);
    }
  }
  return out;
}

const MORE = [
  ['method households', 'tab=method&sub=households', MethodSourcesTab],
  ['method detail', 'tab=method&sub=detail', MethodSourcesTab],
];

describe('the macro model is not called OG-UK', () => {
  it('no source string names OG-UK outside the allow-list', () => {
    const hits = sourceHits();
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('past changelog and versions entries keep OG-UK; only the listed ones, and no new entry', () => {
    const changelog = JSON.parse(fs.readFileSync(path.join(SRC, 'data/site-changelog.json'), 'utf8'));
    const versions = JSON.parse(fs.readFileSync(path.join(SRC, 'data/site-versions.json'), 'utf8'));
    const named = changelog.entries.filter((e) => JSON.stringify(e).includes(NAME)).map((e) => [e.date, e.commit]);
    expect(named).toEqual(PAST_CHANGELOG);
    expect(versions.entries.filter((e) => JSON.stringify(e).includes(NAME)).map((e) => e.id)).toEqual(PAST_VERSIONS);
    // the listed entries are past ones: older than push D's first day on the name
    for (const [d] of PAST_CHANGELOG) expect(d < '2026-11-21', d).toBe(true);
  });

  it('no rendered text names OG-UK outside links to its code', () => {
    const all = [];
    for (const p of [...PAGES, ...MORE]) {
      const { container, unmount } = renderPage(p);
      all.push(...renderedHits(container, p[0]));
      unmount();
    }
    expect(all, all.join('\n')).toEqual([]);
  }, 60000);

  it('each tab that names the model explains it in plain words', () => {
    for (const p of [PAGES[0], PAGES[1], PAGES[5], PAGES[6], PAGES[7]]) {
      const { container, unmount } = renderPage(p);
      // Explore says it in the scope's "Which model is this?" tip (the
      // Story's part opener has the same tip)
      const tip = container.querySelector('.model-scope .tip-target');
      if (tip) fireEvent.focus(tip);
      const t = container.textContent;
      if (/macro model|overlapping-generations model/i.test(t)) expect(t.toLowerCase(), p[0]).toContain(MACRO_ABOUT.toLowerCase());
      unmount();
    }
  }, 60000);
});
