// Tiny dependency-free syntax highlighter for the Code tab.
// One Private-Use-Area code-point per token (~6400 max). No digit collisions.

const PY_KEYWORDS = [
  'from', 'import', 'def', 'class', 'as', 'return', 'with', 'in', 'for', 'if',
  'elif', 'else', 'lambda', 'try', 'except', 'finally', 'raise', 'True', 'False',
  'None', 'not', 'and', 'or', 'is', 'pass', 'yield', 'async', 'await', 'global',
  'nonlocal', 'assert', 'del', 'break', 'continue',
];
const PY_KW_RE = new RegExp('\\b(' + PY_KEYWORDS.join('|') + ')\\b', 'g');

const PH_BASE = 0xE100;
const PH_RE = /[-]/g;

function makePh() {
  const tokens = [];
  const add = (text, cls) => {
    tokens.push(`<span class="tk-${cls}">${text}</span>`);
    return String.fromCharCode(PH_BASE + tokens.length - 1);
  };
  const expand = (src) =>
    src.replace(PH_RE, (c) => tokens[c.charCodeAt(0) - PH_BASE]);
  return { add, expand };
}

export function highlightPython(src) {
  const { add, expand } = makePh();
  // Comments first, then strings (so their contents are protected),
  // then numbers, keywords, function calls, capitalised names.
  src = src.replace(/#[^\n]*/g, (m) => add(m, 'com'));
  src = src.replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, (m) => add(m, 'str'));
  src = src.replace(/\b\d+(?:\.\d+)?\b/g, (m) => add(m, 'num'));
  src = src.replace(PY_KW_RE, (m) => add(m, 'kw'));
  src = src.replace(/\b([A-Za-z_][\w]*)(\s*\()/g, (_, name, paren) => add(name, 'fn') + paren);
  src = src.replace(/\b[A-Z][\w_]*\b/g, (m) => add(m, 'cls'));
  return expand(src);
}

export function highlightBash(src) {
  const { add, expand } = makePh();
  src = src.replace(/#[^\n]*/g, (m) => add(m, 'com'));
  src = src.replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, (m) => add(m, 'str'));
  // First non-whitespace token on each line is the command.
  src = src.replace(/^(\s*)([A-Za-z_][\w-]*)/gm, (_, ws, cmd) => ws + add(cmd, 'fn'));
  // Long and short CLI flags.
  src = src.replace(/(^|\s)(--?[A-Za-z][\w-]*)/g, (_, pre, flag) => pre + add(flag, 'flag'));
  return expand(src);
}

export function highlight(src, lang) {
  if (lang === 'py' || lang === 'python') return highlightPython(src);
  if (lang === 'bash' || lang === 'sh') return highlightBash(src);
  return src;
}
