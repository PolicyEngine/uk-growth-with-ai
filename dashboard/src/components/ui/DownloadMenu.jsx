'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { downloadCsv, downloadPng, downloadSvg, fromSvgEl } from '@/lib/download.js';
import { ARM_PICK, PAGE_TITLE, closureLabel, pickersFor, ruleLabel } from '@/lib/labels.js';
import { useNav, subOf } from '@/lib/nav.jsx';
import { iconFor } from '@/lib/concepts.js';
import AI from '@/data/aiStudy2425.json';
import { SCEN_NAME } from '@/tabs/ai/surprise.js';

// uk-ai-study's caption from its data file: the model year, and
// "provisional" only while the study is (status merged: not provisional).
export const studyCaption = (d) => ['Model: the household study (PolicyEngine UK microsimulation)', d.model_year_label, d.provisional ? 'provisional' : null].filter(Boolean).join(', ');

// The caption every download carries (addendum E4, copy this view): the
// settings the chart was drawn with and the model's name, from the address.
export function captionOf(st, sub) {
  const pick = pickersFor(st.tab, sub);
  if (pick.study) return studyCaption(AI);
  const parts = [];
  if (pick.scenario) parts.push(`Scenario: ${SCEN_NAME[pick.scenario === 'locked' ? 'uk_central' : st.s]}`);
  if (pick.closure) parts.push(`Foreign capital: ${{ central: 'some', closed: 'none', both: 'both' }[st.closure] ?? closureLabel(st.closure)}`);
  if (pick.arm) parts.push(`Version: ${ARM_PICK.find((a) => a.id === st.armId)?.label}`);
  if (pick.rule) parts.push(`Budget assumption: ${ruleLabel(Array.isArray(pick.rule) ? st.wrule : st.rule)}`);
  parts.push('Model: OG-UK');
  return parts.join(' · ');
}

const FORMATS = [
  { id: 'csv', name: 'CSV', detail: 'Data' },
  { id: 'json', name: 'JSON', detail: 'Data, with its context' },
  { id: 'png', name: 'PNG', detail: 'Image' },
  { id: 'svg', name: 'SVG', detail: 'Vector image' },
];

// The chart's data as JSON: the same context as the CSV's "#" lines, then
// one object per row keyed by the column names.
export function jsonOf({ title, context, caption, table }) {
  return {
    title,
    context: context ?? null,
    settings: caption ?? null,
    source: `PolicyEngine, ${PAGE_TITLE}`,
    downloaded: new Date().toISOString().slice(0, 10),
    columns: table.columns,
    rows: table.rows.map((r) => Object.fromEntries(table.columns.map((c, i) => [c, r[i] ?? null]))),
  };
}
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'chart';
function saveJson(frame) {
  const blob = new Blob([`${JSON.stringify(jsonOf(frame), null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(frame.title)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// A link to this chart: the page address with every choice the reader made
// (scenario, closure, arm, rule, sub-tab) and the chart's anchor.
export function chartLink(href, st, anchor, base) {
  return new URL(href(st.tab, { sub: subOf(st), anchor: anchor || undefined }), base).toString();
}

// The chart as a PNG blob (for the clipboard): the plot(s) stacked under the
// title, with the settings line and the source, at 2x.
export function pngBlobOf(plots, { title, caption }) {
  const list = Array.isArray(plots) ? plots : [plots];
  const pad = 20;
  const W = Math.round(Math.max(...list.map((p) => p.w)) + pad * 2);
  let y = pad + 18;
  const head = `<text x="${pad}" y="${y}" font-size="16" font-weight="600" fill="#101828">${esc(title ?? '')}</text>`;
  y += 12;
  let body = '';
  for (const p of list) {
    if (p.label) {
      y += 18;
      body += `<text x="${pad}" y="${y}" font-size="13" font-weight="600" fill="#344054">${esc(p.label)}</text>`;
    }
    y += 8;
    body += `<svg x="${pad}" y="${y}" width="${p.w}" height="${p.h}" viewBox="0 0 ${p.w} ${p.h}">${p.markup}</svg>`;
    y += p.h;
  }
  const foot = [caption, `Source: PolicyEngine, ${PAGE_TITLE}`].filter(Boolean);
  for (const line of foot) {
    y += 18;
    body += `<text x="${pad}" y="${y}" font-size="11" fill="#667085">${esc(line)}</text>`;
  }
  const H = Math.round(y + pad);
  const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter, system-ui, sans-serif"><rect width="100%" height="100%" fill="#fff"/>${head}${body}</svg>`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = W * 2;
      canvas.height = H * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png');
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  });
}
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const COPIES = [
  { id: 'link', name: 'Copy link to this chart', detail: 'With your settings', icon: 'copyLink' },
  { id: 'image', name: 'Copy chart image', detail: 'PNG', icon: 'copyImage' },
];
const canCopyImage = () => typeof window !== 'undefined' && typeof window.ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;

// One download menu per chart card (AB2026 ChartDownloadMenu): an icon
// button that opens a short list. `table` gives the CSV. The image formats
// export the card's own SVG plot(s) (each panel under its caption), or, for
// a chart drawn in HTML, `svg()`: the same chart drawn from the data. CSV
// and JSON carry the data; PNG and SVG the drawing.
// Two copy actions follow: "Copy link to this chart" (the address with the
// current choices and the card's anchor: `anchor`, else the card's id) and
// "Copy chart image" (a PNG on the clipboard, where the browser allows it).
// A status line says what was copied (aria-live).
export default function DownloadMenu({ title, context, table, legend, svg, cardRef, anchor }) {
  const [open, setOpen] = useState(false);
  const [hasSvg, setHasSvg] = useState(false);
  const [status, setStatus] = useState('');
  const [canCopy, setCanCopy] = useState({ link: false, image: false });
  const { st, href } = useNav();
  const root = useRef(null);
  const button = useRef(null);
  const menuId = useId();
  const plots = () => {
    if (svg) return svg();
    const els = [...(cardRef.current?.querySelectorAll('.chart-plot svg[role="img"]') ?? [])];
    if (!els.length) return null;
    return els.map((el) => {
      const p = fromSvgEl(el, els.length > 1 ? el.closest('figure')?.querySelector('[data-panel-title]')?.textContent.trim() : undefined);
      // a chart drawn in a viewBox: its markup is in viewBox units
      const vb = el.viewBox?.baseVal;
      return vb && vb.width ? { ...p, w: vb.width, h: vb.height } : p;
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!table) return null;
  const run = async (id) => {
    const frame = { title, context: typeof context === 'function' ? context() : context, caption: captionOf(st, subOf(st)), legend: typeof legend === 'function' ? legend() : legend };
    try {
      const data = () => ({ ...frame, table: typeof table === 'function' ? table() : table });
      if (id === 'csv') downloadCsv(data());
      else if (id === 'json') saveJson(data());
      else if (id === 'svg') downloadSvg(plots(), frame);
      else await downloadPng(plots(), frame);
    } finally {
      setOpen(false);
    }
  };
  const formats = FORMATS.filter((f) => f.id === 'csv' || f.id === 'json' || hasSvg);
  const done = (msg) => {
    setStatus(msg);
    setTimeout(() => {
      setStatus('');
      setOpen(false);
    }, 1400);
  };
  const copyLink = async () => {
    try {
      const chartId = anchor ?? cardRef?.current?.id ?? cardRef?.current?.closest('[id]')?.id;
      await navigator.clipboard.writeText(chartLink(href, st, chartId, window.location.href));
      done('Link copied');
    } catch {
      done('Could not copy the link');
    }
  };
  const copyImage = async () => {
    try {
      const frame = { title, caption: captionOf(st, subOf(st)) };
      // the blob as a promise inside the ClipboardItem keeps the user gesture (Safari)
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': pngBlobOf(plots(), frame) })]);
      done('Image copied');
    } catch {
      done('Could not copy the image');
    }
  };
  const copies = COPIES.filter((c) => (c.id === 'link' ? canCopy.link : canCopy.image));
  const runCopy = (id) => (id === 'link' ? copyLink() : copyImage());

  return (
    <div className="download" ref={root}>
      <button
        ref={button}
        type="button"
        className="icon-button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Download: ${title}`}
        title="Download"
        onClick={() => {
          const drawn = Boolean(svg || cardRef.current?.querySelector('.chart-plot svg[role="img"]'));
          setHasSvg(drawn);
          setCanCopy({ link: !!navigator.clipboard?.writeText, image: drawn && canCopyImage() });
          setOpen((o) => !o);
        }}
      >
        <Icon name="download" size={16} strokeWidth={2} />
      </button>
      {open ? (
        <ul className="download-menu" id={menuId}>
          {formats.map((f) => (
            <li key={f.id}>
              <button type="button" className="download-item" onClick={() => run(f.id)}>
                <span className="download-format">{f.name}</span>
                <span className="download-detail">{f.detail}</span>
              </button>
            </li>
          ))}
          {copies.map((c, i) => (
            <li key={c.id} className={i === 0 ? 'download-sep' : undefined}>
              <button type="button" className="download-item" onClick={() => runCopy(c.id)}>
                <span className="download-format">
                  <Icon name={iconFor(c.icon)} size={14} className="download-item-icon" />
                  {c.name}
                </span>
                <span className="download-detail">{c.detail}</span>
              </button>
            </li>
          ))}
          <li className="download-status" role="status" aria-live="polite">
            {status}
          </li>
        </ul>
      ) : null}
    </div>
  );
}
