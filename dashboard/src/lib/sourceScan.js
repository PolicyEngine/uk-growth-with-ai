// Source scans for the browser-free probes (claims-and-years.test.jsx,
// scripts/ratchet.mjs). Node only: never imported by a page.
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// Every page source file under src: .js/.jsx/.ts/.tsx, not tests, not test
// helpers, not the data folder.
export function sourceFiles(root = SRC) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules') walk(p);
      } else if (/\.(jsx?|tsx?)$/.test(e.name) && !/\.test\.|TestUtils\.jsx?$|^fixtureBase\.js$|^sourceScan\.js$/.test(e.name)) out.push(p);
    }
  };
  walk(root);
  return out.map((p) => path.relative(root, p)).filter((p) => !p.startsWith(`data${path.sep}`)).sort();
}

// The file with its comments blanked (kept as spaces, so line numbers hold).
// A small scanner: strings, template literals and JSX text are kept; // and
// /* */ comments, and {/* */} JSX comments, are blanked. A regex literal
// is not parsed, which only matters if one holds a quote.
export function stripComments(src) {
  const n = src.length;
  const blank = (t) => t.replace(/[^\n]/g, ' ');
  // code from i until the closing brace at depth 0 (when `inExpr`) or EOF;
  // returns [text, next index]
  function code(i, inExpr) {
    let out = '';
    let depth = 0;
    while (i < n) {
      const c = src[i];
      const d = src[i + 1];
      if (c === '/' && d === '/') {
        const j = src.indexOf('\n', i);
        const e = j < 0 ? n : j;
        out += blank(src.slice(i, e));
        i = e;
      } else if (c === '/' && d === '*') {
        const j = src.indexOf('*/', i + 2);
        const e = j < 0 ? n : j + 2;
        out += blank(src.slice(i, e));
        i = e;
      } else if (c === "'" || c === '"') {
        let j = i + 1;
        while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
        out += src.slice(i, j + 1);
        i = j + 1;
      } else if (c === '`') {
        const [t, j] = template(i + 1);
        out += `\`${t}`;
        i = j;
      } else if (inExpr && c === '{') {
        depth += 1;
        out += c;
        i += 1;
      } else if (inExpr && c === '}') {
        if (depth === 0) return [out, i];
        depth -= 1;
        out += c;
        i += 1;
      } else {
        out += c;
        i += 1;
      }
    }
    return [out, i];
  }
  // a template literal's body from i (after the backtick), with ${ } nesting
  function template(i) {
    let out = '';
    while (i < n) {
      const c = src[i];
      if (c === '\\') {
        out += src.slice(i, i + 2);
        i += 2;
      } else if (c === '`') return [`${out}\``, i + 1];
      else if (c === '$' && src[i + 1] === '{') {
        const [t, j] = code(i + 2, true);
        out += `\${${t}${j < n ? '}' : ''}`;
        i = j + 1;
      } else {
        out += c;
        i += 1;
      }
    }
    return [out, i];
  }
  return code(0, false)[0];
}

const read = (rel, root = SRC) => stripComments(fs.readFileSync(path.join(root, rel), 'utf8'));

// Year-suffixed names outside the key-map: a data key (foreign_share_dK_2031,
// profile_2028, income_2028_35_age45), a pinned file (nics_2028.json,
// surprise_2028.md, results_sanity_2028.md, scenarios_surprise2028_) or a
// data file name (surprise2028.json, cohorts2028.json). Constants that are
// not data keys are exempt by name.
// ...and a branch or audit name (rerun/surprise-2028, sanity-2028-final).
const KEY_RE = /\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*?_(?:19|20)\d\d(?:_[A-Za-z0-9]+)*\b|\b(?:surprise|cohorts|nics|methodFacts)(?:19|20)\d\d\b|\b(?:surprise|sanity|rerun|results|cohorts)-(?:19|20)\d\d\b/g;
const KEY_EXEMPT = /(?:^|_)(?:MARCH_2026|FRS_2026_Accessible|capabilities_2026)$/;
export function yearKeys(files = sourceFiles()) {
  const hits = [];
  for (const f of files) {
    if (f === path.join('lib', 'dataKeys.js') || f === path.join('lib', 'activeData.js')) continue;
    read(f)
      .split('\n')
      .forEach((line, k) => {
        for (const m of line.matchAll(KEY_RE)) if (!KEY_EXEMPT.test(m[0])) hits.push({ file: f, line: k + 1, key: m[0] });
      });
  }
  return hits;
}

// Year literals (2026-2039) in page code outside comments and the year
// constants. Each hit is { file, line, year, text }; the allowlist (in the
// test) names a file and an exact phrase, so a new typed year in an
// allowlisted file still fails.
const YEAR_RE = /(?<![\d.\w/-])20(?:2[6-9]|3\d)(?![\d\w])/g;
export function typedYears(files = sourceFiles()) {
  const hits = [];
  for (const f of files) {
    read(f)
      .split('\n')
      .forEach((line, k) => {
        for (const m of line.matchAll(YEAR_RE)) hits.push({ file: f, line: k + 1, year: Number(m[0]), text: line.trim() });
      });
  }
  return hits;
}

// Year arithmetic: a year constant or field plus or minus a number
// (SURPRISE_YEAR + 1, D.shock_year - 20, headline_year + 5). Each use must
// be named in the probe's list with what it means, so an off-by-one
// derivation (R2-01: SURPRISE_YEAR + 1 where the shock year is meant) is a
// decision someone wrote down.
const ARITH_RE = /\b(?:SURPRISE_YEAR|HEADLINE_YEAR|LATE_YEAR|FIRST_YEAR|COHORT_YEAR|shock_year|headline_year|late_year|surprise_year|shockYear|lastFlowYear|debtRuleYear)\s*[+-]\s*\d+\b/g;
export function yearArithmetic(files = sourceFiles()) {
  const hits = [];
  for (const f of files)
    read(f)
      .split('\n')
      .forEach((line, k) => {
        for (const m of line.matchAll(ARITH_RE)) hits.push({ file: f, line: k + 1, expr: m[0].replace(/\s+/g, ' '), text: line.trim() });
      });
  return hits;
}

// Lines that build one sentence from both data files: an active-set year
// (SURPRISE_YEAR, HEADLINE_YEAR, FIRST_YEAR) beside a cohort-file value
// (COHORT_YEAR, the cohort file's shock_year or a COHORTS read). R2-03.
const ACTIVE_RE = /\b(?:SURPRISE_YEAR|HEADLINE_YEAR|FIRST_YEAR)\b/;
const COHORT_RE = /\bCOHORT_YEAR\b|\bCOHORTS\b|\b(?:D|CO|COH|C)\.(?:shock_year|closures|dnfull|birth_year)\b/;
export function mixedLines(files = sourceFiles()) {
  const hits = [];
  for (const f of files) {
    const src = read(f);
    // only files that read the cohort file
    if (!/COHORTS|COHORT_YEAR/.test(src)) continue;
    src.split('\n').forEach((line, k) => {
      if (ACTIVE_RE.test(line) && COHORT_RE.test(line) && !/^\s*import\b/.test(line)) hits.push({ file: f, line: k + 1, text: line.trim() });
    });
  }
  return hits;
}
