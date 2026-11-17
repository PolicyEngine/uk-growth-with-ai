// Per-chart downloads. Each file carries its own context: the title, what
// was selected (scenario, closure, control-bar choices), the source and the
// date. CSV writes it as "#" lines; SVG and PNG draw it round the plot.
import { CHART_COLOURS, CHART_FONT } from '@/lib/chartTheme.js';
import { PAGE_TITLE } from '@/lib/labels.js';

const SOURCE = `Source: PolicyEngine, ${PAGE_TITLE}`;
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'chart';
const today = () => new Date().toISOString().slice(0, 10);

function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const cell = (v) => {
  if (v == null) return '';
  const t = typeof v === 'number' ? String(Number(v.toFixed(6))) : String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

// table: { columns: [..], rows: [[..]] }
// caption: the view's settings line (scenario, closure, arm, rule, model),
// from DownloadMenu's captionOf
export function downloadCsv({ title, context, caption, table }) {
  const head = [`# ${title}`, context ? `# ${context}` : null, caption ? `# ${caption}` : null, `# ${SOURCE}`, `# Downloaded ${today()}`].filter(Boolean);
  const body = [table.columns, ...table.rows].map((r) => r.map(cell).join(','));
  save(new Blob([[...head, ...body].join('\n') + '\n'], { type: 'text/csv;charset=utf-8' }), `${slug(title)}.csv`);
}

const STYLE_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linejoin', 'stroke-linecap', 'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor'];
function inlineStyles(clone, original) {
  const a = [clone, ...clone.querySelectorAll('*')];
  const b = [original, ...original.querySelectorAll('*')];
  a.forEach((el, i) => {
    const cs = getComputedStyle(b[i]);
    STYLE_PROPS.forEach((p) => {
      const v = cs.getPropertyValue(p);
      if (v) el.style.setProperty(p, v);
    });
  });
}
// A colour as the page resolves it: 'var(--series-1)' -> '#319795'
export function cssColour(c) {
  const m = /^var\((--[^)]+)\)$/.exec(String(c));
  if (!m || typeof document === 'undefined') return c;
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || c;
}
export const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A plot as { w, h, markup }: the inner markup of an SVG of that size.
// From the card's own <svg> (styles inlined from the page) ...
export function fromSvgEl(svgEl, label) {
  const w = svgEl.width.baseVal.value || svgEl.getBoundingClientRect().width;
  const h = svgEl.height.baseVal.value || svgEl.getBoundingClientRect().height;
  const clone = svgEl.cloneNode(true);
  inlineStyles(clone, svgEl);
  clone.querySelectorAll('title').forEach((t) => t.remove());
  const markup = new XMLSerializer().serializeToString(clone).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return { w, h, markup, label };
}
// ... or drawn from the data by the card (download.svg(), for charts the
// page draws in HTML): the same object.

// The plot(s) as one standalone SVG with a title, context, legend and
// source line. Several plots (panels) stack, each under its own label.
function framedSvg(plots, { title, context, caption, legend = [] }) {
  const list = Array.isArray(plots) ? plots : [plots];
  const pad = 24;
  const w = Math.max(...list.map((p) => p.w));
  const W = Math.round(Math.max(w + pad * 2, 720));
  // context: one part per line when it would run past the frame
  const ctx = context ? (context.length * 6.8 > W - pad * 2 ? context.split(' · ') : [context]) : [];
  // the settings caption: one more line (two when it would run past the frame)
  const halves = (t) => {
    const parts = t.split(' · ');
    const k = Math.ceil(parts.length / 2);
    return [parts.slice(0, k).join(' · '), parts.slice(k).join(' · ')].filter(Boolean);
  };
  if (caption) ctx.push(...(caption.length * 6.8 > W - pad * 2 ? halves(caption) : [caption]));
  // legend entries wrap onto rows
  const rows = [[]];
  let lx = pad;
  for (const k of legend) {
    const kw = 24 + k.label.length * 6.6 + 18;
    if (lx + kw > W - pad && rows[rows.length - 1].length) {
      rows.push([]);
      lx = pad;
    }
    rows[rows.length - 1].push({ ...k, x: lx });
    lx += kw;
  }
  const nRows = legend.length ? rows.length : 0;
  const legendTop = pad + 24 + ctx.length * 20 + 14;
  const keys = rows
    .flatMap((row, ri) =>
      row.map((k) => {
        const y = legendTop + ri * 22;
        const mark = k.shape === 'ring'
          ? `<circle cx="${k.x + 9}" cy="${y}" r="5" fill="${CHART_COLOURS.surface}" stroke="${k.color}" stroke-width="2.5"/>`
          : k.shape === 'tick'
            ? `<rect x="${k.x + 7.5}" y="${y - 8}" width="3" height="16" rx="1" fill="${k.color}"/>`
            : k.shape === 'dot'
          ? `<circle cx="${k.x + 9}" cy="${y}" r="5" fill="${k.color}"/>`
          : k.shape === 'box'
            ? `<rect x="${k.x + 2}" y="${y - 6}" width="14" height="12" rx="2" fill="${k.color}"/>`
            : `<line x1="${k.x}" x2="${k.x + 18}" y1="${y}" y2="${y}" stroke="${k.color}" stroke-width="2.5"${k.dashed ? ' stroke-dasharray="6 4"' : ''}/>`;
        return `${mark}<text x="${k.x + 24}" y="${y + 4}" font-size="12" fill="${CHART_COLOURS.ink}">${esc(k.label)}</text>`;
      }),
    )
    .join('');
  let y = legendTop + nRows * 22 + 8;
  const body = list
    .map((p) => {
      let out = '';
      if (p.label) {
        out += `<text x="${pad}" y="${y + 14}" font-size="14" font-weight="600" fill="${CHART_COLOURS.ink}">${esc(p.label)}</text>`;
        y += 26;
      }
      out += `<g transform="translate(${pad}, ${y})">${p.markup}</g>`;
      y += p.h + 16;
      return out;
    })
    .join('');
  const H = Math.round(y + 18 + pad);
  return {
    W,
    H,
    text:
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${CHART_FONT}">` +
      `<rect width="${W}" height="${H}" fill="${CHART_COLOURS.surface}"/>` +
      `<text x="${pad}" y="${pad + 14}" font-size="18" font-weight="600" fill="${CHART_COLOURS.ink}">${esc(title)}</text>` +
      ctx.map((line, i) => `<text x="${pad}" y="${pad + 38 + i * 20}" font-size="13" fill="${CHART_COLOURS.axisTitle}">${esc(line)}</text>`).join('') +
      keys +
      body +
      `<text x="${pad}" y="${H - pad}" font-size="12" fill="${CHART_COLOURS.muted}">${esc(SOURCE)}. Downloaded ${today()}.</text>` +
      '</svg>',
  };
}

export function downloadSvg(plots, frame) {
  const { text } = framedSvg(plots, frame);
  save(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }), `${slug(frame.title)}.svg`);
}

export function downloadPng(plots, frame) {
  const { text, W, H } = framedSvg(plots, frame);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = W * 2;
      canvas.height = H * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('PNG export failed'));
        save(blob, `${slug(frame.title)}.png`);
        resolve();
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  });
}
