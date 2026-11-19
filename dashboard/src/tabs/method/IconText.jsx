// A short line on the Method and sources pages (section sub-lines, card
// findings, notes, links). Round 1 icon rule: an icon marks a kind of thing,
// not every line, so the line is text only; `icon` is kept so callers keep
// naming the concept the line is about.
//   <IconText icon="source">Derivations: …</IconText>
// eslint-disable-next-line no-unused-vars
export default function IconText({ icon, children, className = '' }) {
  return <span className={`mx-it ${className}`}>{children}</span>;
}
