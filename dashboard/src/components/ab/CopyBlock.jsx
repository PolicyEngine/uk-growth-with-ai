'use client';

import { useState } from 'react';
import { highlight } from '@/lib/highlight.js';

// A dark command block that scrolls inside itself, with a copy button.
export default function CopyBlock({ code, lang = 'bash' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="copy-block">
      <button type="button" className="copy-button" onClick={copy} aria-label="Copy the commands">
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre>
        <code className={`lang-${lang}`} dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
      </pre>
    </div>
  );
}
