#!/usr/bin/env bun
// The failure-count ratchet (consolidated-design-fable.md section 6): a red
// suite's count may not rise above its recorded baseline, and baselines may
// only fall.
//
//   bun scripts/ratchet.mjs                  measure the browser-free counts
//                                             (vitest on both data files, the
//                                             probes, the ugai lint rules) and
//                                             compare
//   bun scripts/ratchet.mjs --counts c.json  also compare browser-suite
//                                             counts measured by hand,
//                                             {"check_sticky": 120, ...}
//   bun scripts/ratchet.mjs --set check_orphans=50   the same, inline
//   bun scripts/ratchet.mjs --update         lower each baseline to its
//                                             measured count (never raise)
//   bun scripts/ratchet.mjs --no-vitest      lint counts only (fast)
//
// Exit 1 when any count is above its baseline. A count not measured this
// run is listed, never passed.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const APP = path.resolve(HERE, '..');
const BASE_FILE = path.join(HERE, 'ratchet-baselines.json');
const base = JSON.parse(fs.readFileSync(BASE_FILE, 'utf8'));
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const counts = {};

// browser counts passed in
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--counts') Object.assign(counts, JSON.parse(fs.readFileSync(args[(i += 1)], 'utf8')));
  if (args[i] === '--set') {
    const [k, v] = args[(i += 1)].split('=');
    counts[k] = Number(v);
  }
}

// vitest on each data file: failed tests, and each probe's count
if (!has('--no-vitest')) {
  for (const data of ['2028', '2027']) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ratchet-'));
    const report = path.join(tmp, 'vitest.json');
    const probes = path.join(tmp, 'probes.jsonl');
    spawnSync('bunx', ['vitest', 'run', '--reporter=json', `--outputFile=${report}`], {
      cwd: APP,
      env: { ...process.env, NEXT_PUBLIC_DATA: data, RATCHET_OUT: probes },
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    if (fs.existsSync(report)) {
      const r = JSON.parse(fs.readFileSync(report, 'utf8'));
      // failed tests, plus suites that failed to load (no test ran)
      counts[`vitest_failures_${data}`] = r.numFailedTests + r.testResults.filter((t) => t.status === 'failed' && t.assertionResults.length === 0).length;
    }
    if (fs.existsSync(probes))
      for (const line of fs.readFileSync(probes, 'utf8').trim().split('\n').filter(Boolean)) {
        const { name, n } = JSON.parse(line);
        // the worse of the two data files
        counts[name] = Math.max(counts[name] ?? 0, n);
      }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// the ugai lint rules
{
  const out = execFileSync('bunx', ['eslint', '.', '-f', 'json'], { cwd: APP, maxBuffer: 64 << 20 }).toString();
  const per = {};
  for (const f of JSON.parse(out)) for (const m of f.messages) if (m.ruleId?.startsWith('ugai/')) per[m.ruleId] = (per[m.ruleId] ?? 0) + 1;
  for (const k of Object.keys(base.probes).filter((k) => k.startsWith('eslint_ugai_'))) counts[k] = per[`ugai/${k.slice('eslint_ugai_'.length).replaceAll('_', '-')}`] ?? 0;
}

// compare
let bad = 0;
const rows = [];
for (const group of ['probes', 'browser'])
  for (const [k, e] of Object.entries(base[group])) {
    const n = counts[k];
    const b = e.baseline;
    let verdict;
    if (n == null) verdict = 'not measured';
    else if (b == null) verdict = 'no baseline';
    else if (n > b) {
      verdict = 'ROSE';
      bad += 1;
    } else if (n < b) verdict = 'fell';
    else verdict = 'held';
    rows.push([group, k, n ?? '—', b ?? '—', verdict]);
    if (has('--update') && n != null && (b == null || n < b)) e.baseline = n;
  }
for (const k of Object.keys(counts).filter((k) => !base.probes[k] && !base.browser[k])) rows.push(['?', k, counts[k], '—', 'unknown name']);
const w = [7, 30, 8, 8, 12];
console.log(rows.map((r) => r.map((c, i) => String(c).padEnd(w[i])).join(' ')).join('\n'));
if (has('--update')) {
  fs.writeFileSync(BASE_FILE, `${JSON.stringify(base, null, 2)}\n`);
  console.log('baselines lowered where a count fell');
}
console.log(bad ? `RATCHET FAIL: ${bad} count(s) above baseline` : 'RATCHET PASS');
process.exit(bad ? 1 : 0);
