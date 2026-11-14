'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { downloadCsv, downloadPng, downloadSvg } from '@/lib/download.js';

const FORMATS = [
  { id: 'csv', name: 'CSV', detail: 'Data' },
  { id: 'png', name: 'PNG', detail: 'Image' },
  { id: 'svg', name: 'SVG', detail: 'Vector image' },
];

// One download menu per chart card (AB2026 ChartDownloadMenu): an icon
// button that opens a short list. `table` gives the CSV; the image formats
// export the card's own SVG plot, so they show only when it has one.
export default function DownloadMenu({ title, context, table, legend, cardRef }) {
  const [open, setOpen] = useState(false);
  const [hasSvg, setHasSvg] = useState(false);
  const root = useRef(null);
  const button = useRef(null);
  const menuId = useId();
  const plot = () => cardRef.current?.querySelector('.chart-plot svg[role="img"]');

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
    const frame = { title, context: typeof context === 'function' ? context() : context, legend: typeof legend === 'function' ? legend() : legend };
    try {
      if (id === 'csv') downloadCsv({ ...frame, table: typeof table === 'function' ? table() : table });
      else if (id === 'svg') downloadSvg(plot(), frame);
      else await downloadPng(plot(), frame);
    } finally {
      setOpen(false);
    }
  };
  const formats = FORMATS.filter((f) => f.id === 'csv' || hasSvg);

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
          setHasSvg(Boolean(plot()));
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
