// Link ancestry (the swap): every link the site builds into this
// repository names a ref that the pushed head can serve, and the file it
// names exists there.
//   - a commit (7 to 40 hex) must be an ancestor of HEAD (this branch is the
//     pushed head);
//   - a branch name must exist on origin (rerun/surprise-2028,
//     paper/first-draft), with the file on it;
//   - "main" is skipped (the default branch, read at publish time);
//   - a commit link (/commit/<sha>) must name exactly one object
//     (`git rev-parse --verify` fails on an ambiguous short SHA, which
//     GitHub serves as a 404; review round 5, R5-02) and that object must
//     be an ancestor of HEAD.
// Read from every page in the probe set, with every sources popover opened,
// and from the URL tables the pages draw from (links.js, sources.js,
// ledger.js), under the active data flag.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent } from '@testing-library/react';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PAGES, renderPage } from '@/lib/probeTestUtils.jsx';
import { OG_RESULT_URLS, REPO, URLS } from '@/tabs/ai/links.js';
import { SRC } from '@/tabs/method/sources.js';
import { VINTAGES, ledger } from '@/tabs/code/ledger.js';
import CHANGELOG from '@/data/site-changelog.json';

afterEach(cleanup);

const ROOT = path.resolve(__dirname, '..', '..', '..');
const REPO_RE = /https:\/\/github\.com\/PolicyEngine\/uk-growth-with-ai\/(?:blob|tree)\/([^/#?]+(?:\/[^/#?]+)*?)\/((?:analysis|uk_growth_with_ai|docs|dashboard|paper|patches|tests|scripts)\/[^#?]*|[^/#?]+\.(?:md|py|json|sh|tex))(?:[#?].*)?$/;
const COMMIT_RE = /https:\/\/github\.com\/PolicyEngine\/uk-growth-with-ai\/commit\/([^/#?]+)(?:[#?].*)?$/;
const git = (...a) => {
  try {
    execFileSync('git', a, { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
// A private local path: a home folder on macOS. Built from parts so this
// file does not match itself.
const LOCAL = ['/Us', 'ers/'].join('');
const gitOut = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
const SCEN_FILE_RE = /^uk_growth_with_ai\/data\/scenarios_surprise202[78]_[a-z0-9_.]+\.json$/;
// every file a link names, as resolved by check(): { url, at, p, kind }
const RESOLVED = [];
const BRANCHES = ['rerun/surprise-2028', 'paper/first-draft', 'audit/sanity-2028-final', 'dashboard/surprise-2028', 'dashboard/story', 'dashboard/ab2026-redesign'];

function check(url) {
  const c = COMMIT_RE.exec(url);
  if (c) {
    const [, ref] = c;
    // the bare ref, not ref^{commit}: the peel would pick the commit out of
    // an ambiguous short SHA locally, where GitHub returns 404
    if (!git('rev-parse', '--verify', '--quiet', ref)) return `${url}: ${ref} is ambiguous or unknown`;
    if (!git('merge-base', '--is-ancestor', ref, 'HEAD')) return `${url}: commit not an ancestor of HEAD`;
    return null;
  }
  const m = REPO_RE.exec(url);
  if (!m) return null;
  let [, ref, file] = m;
  const kind = url.includes('/tree/') ? 'tree' : 'blob';
  // a branch name with a slash: take the longest known branch prefix
  const br = BRANCHES.find((b) => `${ref}/${file}`.startsWith(`${b}/`));
  if (br) {
    file = `${ref}/${file}`.slice(br.length + 1);
    ref = br;
  }
  if (ref === 'main') return null;
  const hex = /^[0-9a-f]{7,40}$/.test(ref);
  const at = hex ? ref : `origin/${ref}`;
  const reach = hex ? git('merge-base', '--is-ancestor', ref, 'HEAD') : git('rev-parse', '--verify', '--quiet', `${at}^{commit}`);
  if (!reach) return `${url}: ${hex ? 'commit not an ancestor of HEAD' : 'branch not on origin'}`;
  const p = decodeURIComponent(file.replace(/\/$/, ''));
  if (!git('cat-file', '-e', `${at}:${p}`)) return `${url}: ${p} not at ${ref}`;
  RESOLVED.push({ url, at, p, kind });
  return null;
}

// Every repository link the site builds: rendered pages (sources popovers
// open), the URL tables and every Site changes entry.
function collectUrls() {
  const urls = new Set();
  const add = (u) => typeof u === 'string' && u.includes('github.com/PolicyEngine/uk-growth-with-ai/') && urls.add(u);
  for (const p of PAGES) {
    const { container, unmount } = renderPage(p);
    for (const b of container.querySelectorAll('button.src-line-btn')) fireEvent.click(b);
    for (const a of document.querySelectorAll('a[href]')) add(a.getAttribute('href'));
    unmount();
  }
  for (const u of [...Object.values(OG_RESULT_URLS), ...Object.values(URLS)]) add(u);
  for (const s of Object.values(SRC)) add(s?.url);
  for (const v of VINTAGES) for (const k of ['url', 'code', 'result']) add(typeof v[k] === 'string' ? v[k] : v[k]?.url);
  for (const r of ledger()) add(r.url);
  // every Site changes entry, recent or folded away
  for (const e of CHANGELOG.entries) add(`${REPO}/commit/${e.commit}`);
  return urls;
}

let URLS_ALL;
let BAD;
beforeAll(() => {
  URLS_ALL = collectUrls();
  BAD = [...URLS_ALL].map(check).filter(Boolean);
}, 180000);

describe('link ancestry', () => {
  it('every repository link the pages build resolves on the pushed head', () => {
    expect(URLS_ALL.size).toBeGreaterThan(20);
    expect([...URLS_ALL].filter((u) => COMMIT_RE.test(u)).length).toBeGreaterThan(10);
    expect(BAD, BAD.join('\n')).toEqual([]);
  });
});

// No private local path in anything that ships or that the site links to
// (coordinator's ruling after review round 5, R5-11). Solve logs and
// records the site does not link to are allowed.
describe('no private local paths', () => {
  it('none in the shipped tree (dashboard/src, dashboard/public, a built app if present)', () => {
    let hits = '';
    try {
      hits = gitOut('grep', '-n', '-I', '--untracked', '-F', LOCAL, '--', 'dashboard/src', 'dashboard/public');
    } catch {
      hits = ''; // git grep exits 1 on no match
    }
    const built = path.join(ROOT, 'dashboard', '.next', 'server', 'app');
    const builtHits = [];
    if (fs.existsSync(built)) {
      const walk = (d) => {
        for (const f of fs.readdirSync(d, { withFileTypes: true })) {
          const q = path.join(d, f.name);
          if (f.isDirectory()) walk(q);
          else if (/\.(html|rsc|txt|json|body)$/.test(f.name) && fs.readFileSync(q, 'utf8').includes(LOCAL)) builtHits.push(path.relative(ROOT, q));
        }
      };
      walk(built);
    }
    expect(hits.trim(), hits).toBe('');
    expect(builtHits, builtHits.join('\n')).toEqual([]);
  });

  it('none in any repository file the site links to, at the linked ref', () => {
    const files = RESOLVED.filter((r) => r.kind === 'blob');
    expect(files.length).toBeGreaterThan(20);
    const bad = [];
    const allowed = [];
    for (const r of files) {
      const type = gitOut('cat-file', '-t', `${r.at}:${r.p}`).trim();
      if (type !== 'blob') continue;
      const lines = gitOut('cat-file', '-p', `${r.at}:${r.p}`).split('\n').filter((l) => l.includes(LOCAL));
      // Known exception, pending a ruling: the scenario files (2027, 2028) carry
      // the generator's provenance field ("source": a local path to
      // uk_targets.json). They are model data, never hand-edited; only that
      // field, only in those files, is allowed.
      const provenance = SCEN_FILE_RE.test(r.p) && lines.every((l) => /^\s*"source": "/.test(l) && l.includes('/analysis/surprise/uk_targets.json'));
      if (lines.length && !provenance) bad.push(`${r.url} (${r.p} at ${r.at}): ${lines[0].trim().slice(0, 120)}`);
      if (lines.length && provenance) allowed.push(r.p);
    }
    expect(bad, bad.join('\n')).toEqual([]);
    // the exception stays narrow: at most the scenario files
    expect(allowed.every((f) => SCEN_FILE_RE.test(f))).toBe(true);
  });
});
