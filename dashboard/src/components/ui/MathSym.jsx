// Maths-style parameter symbols (Vahid, 22 Nov: "these things should be
// math style ζK = 0.1"). One shared component, no maths library:
//
//   <MathSym name="zetaK" value={0.1} />  ->  <i>ζ</i><sub>K</sub> = 0.1
//
// The symbol is an italic serif letter with a real subscript; a number
// stays upright, with a true minus (−). Spaces round "=" are ordinary
// spaces (the CSS keeps the whole symbol on one line), and there is no
// whitespace between the letter and its subscript, so textContent reads
// exactly as the plain text did ("ζK = 0.1"): word counts, number checks
// and the label-join probes see what they saw before. No role and no
// aria-label: the plain text reads as "zeta K equals 0.1" unaided. symSay()
// gives the spoken form for labels built as strings (charts, tooltips).
// One symbol with one value always prints " = ", lists included
// ("at ζK = 0 and 0.1").
//
// JSX only. A string built in plain JS (a title, an aria-label, an SVG
// <text>, a download's CSV) keeps the plain form; symText() gives it.
// <MathText> turns a plain sentence into nodes at a JSX render site, so
// data files and copy constants stay plain strings.
import './MathSym.css';

// The forms follow the model's own docs (OG-Core, docs/book/content/theory):
// \zeta_K, \zeta_D, \gamma, \varepsilon, \delta, T_{G1}, Z_t, K.
export const SYMBOLS = {
  zetaK: { base: 'ζ', sub: 'K', say: 'zeta K' },
  zetaD: { base: 'ζ', sub: 'D', say: 'zeta D' },
  gamma: { base: 'γ', say: 'gamma' },
  epsilon: { base: 'ε', say: 'epsilon' },
  delta: { base: 'δ', say: 'delta' },
  // OG-Core's tG1: T with subscript G1 in the theory docs (government.md)
  tG1: { base: 'T', sub: 'G1', say: 'T G 1', plain: 'tG1' },
  Z: { base: 'Z', say: 'Z' },
  K: { base: 'K', say: 'K' },
};

const MINUS = '−';
// a number as printed: upright, a true minus
export const numText = (v) => {
  if (v == null) return '';
  const s = String(v);
  return s.startsWith('-') ? `${MINUS}${s.slice(1)}` : s;
};
const sayNum = (v) => numText(v).replace(MINUS, 'minus ');

// the plain-text form, for strings built in JS ("ζK = 0.1")
export function symText(name, value) {
  const s = SYMBOLS[name];
  const sym = s.plain ?? `${s.base}${s.sub ?? ''}`;
  return value == null ? sym : `${sym} = ${numText(value)}`;
}
// the spoken form ("zeta K equals 0.1")
export function symSay(name, value) {
  const s = SYMBOLS[name];
  return value == null ? s.say : `${s.say} equals ${sayNum(value)}`;
}

function Glyph({ s }) {
  return (
    <>
      <i>{s.base}</i>
      {s.sub ? <sub>{s.sub}</sub> : null}
    </>
  );
}

// One symbol, with an optional value after " = ".
export default function MathSym({ name, value, className = '' }) {
  const s = SYMBOLS[name];
  if (!s) return null;
  return (
    <span className={`math-sym${className ? ` ${className}` : ''}`} data-sym={name}>
      <Glyph s={s} />
      {value == null ? null : ` = ${numText(value)}`}
    </span>
  );
}

// A product of symbols written together ("δK": δ times K): each letter
// italic, read as "delta K".
function Product({ names }) {
  return (
    <span className="math-sym" data-sym={names.join(' ')}>
      {names.map((n) => (
        <Glyph key={n} s={SYMBOLS[n]} />
      ))}
    </span>
  );
}

// The tokens MathText finds in a plain sentence, longest first. Each may
// take " = <number>" after it, which then joins the symbol. Z is a symbol
// only beside "productivity " or "γ and " (the word Z alone is not maths);
// K only in "δK".
const NUM = '[−-]?\\d+(?:\\.\\d+)?';
const TOKEN = new RegExp(`(δK)|(ζK|ζ_K)|(ζD|ζ_D)|(tG1)|(γ)|(ε)|(δ)|((?<=productivity |γ and )Z\\b)`, 'g');
const NAMES = [null, 'deltaK', 'zetaK', 'zetaD', 'tG1', 'gamma', 'epsilon', 'delta', 'Z'];
const EQ = new RegExp(`^ = (${NUM})(?![\\d.]*%)`);

// A plain string as nodes: each symbol found becomes a MathSym; the rest
// stays text. Not a string: returned as it is.
export function mathNodes(text) {
  if (typeof text !== 'string' || !/[ζγεδ]|tG1|Z\b/.test(text)) return text;
  const out = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index < last) continue;
    const name = NAMES[m.slice(1).findIndex((g) => g != null) + 1];
    let end = m.index + m[0].length;
    if (m.index > last) out.push(text.slice(last, m.index));
    if (name === 'deltaK') out.push(<Product key={k++} names={['delta', 'K']} />);
    else {
      const eq = name === 'Z' ? null : EQ.exec(text.slice(end));
      if (eq) end += eq[0].length;
      out.push(<MathSym key={k++} name={name} value={eq ? eq[1].replace('-', '−') : undefined} />);
    }
    last = end;
  }
  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MathText({ children }) {
  if (Array.isArray(children)) return <>{children.map((c) => (typeof c === 'string' ? mathNodes(c) : c))}</>;
  return <>{mathNodes(children)}</>;
}
