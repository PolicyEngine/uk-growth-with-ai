'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { downloadCsv, downloadPng, downloadSvg, fromSvgEl } from '@/lib/download.js';
import { ARM_PICK, PAGE_TITLE, closureLabel, pickersFor, ruleLabel } from '@/lib/labels.js';
import { useNav, subOf } from '@/lib/nav.jsx';
import { SCEN_NAME } from '@/tabs/ai/surprise.js';

// The caption every download carries (addendum E4, copy this view): the
// settings the chart was drawn with and the model's name, from the address.
export function captionOf(st, sub) {
  const pick = pickersFor(st.tab, sub);
  if (pick.study) return 'Model: uk-ai-study (PolicyEngine-UK microsimulation), provisional';
  const parts = [];
  if (pick.scenario) parts.push(`Scenario: ${SCEN_NAME[pick.scenario === 'locked' ? 'uk_central' : st.s]}`);
  if (pick.closure) parts.push(`Closure: ${closureLabel(st.closure)}`);
  if (pick.arm) parts.push(`Arm: ${ARM_PICK.find((a) => a.id === st.armId)?.label}`);
  if (pick.rule) parts.push(`Fiscal rule: ${ruleLabel(Array.isArray(pick.rule) ? st.wrule : st.rule)}`);
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

// One download menu per chart card (AB2026 ChartDownloadMenu): an icon
// button that opens a short list. `table` gives the CSV. The image formats
// export the card's own SVG plot(s) (each panel under its caption), or, for
// a chart drawn in HTML, `svg()`: the same chart drawn from the data. CSV
// and JSON carry the data; PNG and SVG the drawing.
export default function DownloadMenu({ title, context, table, legend, svg, cardRef }) {
  const [open, setOpen] = useState(false);
  const [hasSvg, setHasSvg] = useState(false);
  const { st } = useNav();
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
          setHasSvg(Boolean(svg || cardRef.current?.querySelector('.chart-plot svg[role="img"]')));
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
        </ul>
      ) : null}
    </div>
  );
}
