// Local lint rules that hold the design system (consolidated-design-fable.md
// section 6, "One chooser, one fold"). Each is a warning; scripts/ratchet.mjs
// counts the warnings per rule against scripts/ratchet-baselines.json, so the
// count can only fall.
import path from 'node:path';

const base = (ctx) => path.basename(ctx.filename ?? ctx.getFilename());
const attr = (node, name) => node.attributes.find((a) => a.type === 'JSXAttribute' && a.name?.name === name);
const literal = (a) => {
  if (!a?.value) return null;
  if (a.value.type === 'Literal') return String(a.value.value);
  if (a.value.type === 'JSXExpressionContainer' && a.value.expression.type === 'Literal') return String(a.value.expression.value);
  if (a.value.type === 'JSXExpressionContainer' && a.value.expression.type === 'TemplateLiteral' && a.value.expression.expressions.length === 0) return a.value.expression.quasis[0].value.cooked;
  return null;
};
const elName = (n) => (n.name.type === 'JSXIdentifier' ? n.name.name : n.name.type === 'JSXMemberExpression' ? n.name.property.name : null);

// One chooser: only the pill (components/ui/Pill.jsx) renders a choice. The
// "Jump to" select in OnThisPage.jsx is navigation (review round 1, R1-20).
const NAVIGATION = new Set(['OnThisPage.jsx']);
const oneChooser = {
  meta: { type: 'problem', docs: { description: 'Only Pill.jsx renders a chooser' }, schema: [] },
  create(ctx) {
    const file = base(ctx);
    if (file === 'Pill.jsx') return {};
    return {
      JSXOpeningElement(node) {
        const name = elName(node);
        if (name === 'select' && !NAVIGATION.has(file)) ctx.report({ node, message: 'A <select> outside the pill: choices go in Pill.jsx.' });
        if (name === 'ControlBar') ctx.report({ node, message: 'ControlBar outside the pill: fold it into Pill.jsx.' });
        const role = literal(attr(node, 'role'));
        if (role === 'radiogroup' || role === 'switch') ctx.report({ node, message: `role="${role}" outside the pill: choices go in Pill.jsx.` });
      },
    };
  },
};

// One fold: every Disclosure or <summary> is titled "More info".
const oneFold = {
  meta: { type: 'problem', docs: { description: 'Every fold is titled "More info"' }, schema: [] },
  create(ctx) {
    return {
      JSXOpeningElement(node) {
        const name = elName(node);
        if (name === 'Disclosure') {
          const t = attr(node, 'title');
          const v = literal(t);
          if (t && v != null && v !== 'More info') ctx.report({ node, message: `Disclosure titled "${v}": a fold is "More info".` });
        }
      },
      JSXElement(node) {
        if (elName(node.openingElement) !== 'summary') return;
        const text = node.children.filter((c) => c.type === 'JSXText').map((c) => c.value).join('').trim();
        if (text !== 'More info') ctx.report({ node, message: `<summary>${text || '…'}</summary>: a fold is "More info".` });
      },
    };
  },
};

// One card shell: components/ui/Card.jsx. Any other card component imported
// (components/ab/InfoCard.jsx, or another *Card.jsx) is a second shell.
const oneCardShell = {
  meta: { type: 'problem', docs: { description: 'Only components/ui/Card.jsx is a card shell' }, schema: [] },
  create(ctx) {
    return {
      ImportDeclaration(node) {
        const src = String(node.source.value);
        if (/(?:^|\/)[A-Za-z]*Card\.jsx$/.test(src) && !/(?:^@\/components\/ui\/|^\.\/|\/ui\/)Card\.jsx$/.test(src) && !(base(ctx) !== 'Card.jsx' && /components\/ui\/Card\.jsx$/.test(src)))
          ctx.report({ node, message: `${src}: a second card shell; use components/ui/Card.jsx.` });
      },
    };
  },
};

const plugin = { rules: { 'one-chooser': oneChooser, 'one-fold': oneFold, 'one-card-shell': oneCardShell } };
export default plugin;
