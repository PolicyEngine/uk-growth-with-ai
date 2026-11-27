'use client';

import { useState } from 'react';
import { highlight } from '@/lib/highlight.js';
import Icon from './Icon.jsx';

// A light code block (the page's surface, a hairline border, dark mono
// text; checks-words2.md item 26) that scrolls inside itself, with a plain
// copy icon in its corner (no box), which turns to a check once copied.
// The copy icon on its own (CopyBlock's corner button; the "Cite this page"
// line at each Method page's foot uses it beside its text).
export function CopyButton({ text, label = 'Copy the text', className = 'copy-button' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" className={className} onClick={copy} aria-label={copied ? 'Copied' : label} title={copied ? 'Copied' : 'Copy'}>
      <Icon name={copied ? 'check' : 'copy'} size={16} strokeWidth={2} />
    </button>
  );
}

export default function CopyBlock({ code, lang = 'bash', label = lang === 'text' ? 'Copy the text' : 'Copy the commands' }) {
  return (
    <div className="copy-block">
      <CopyButton text={code} label={label} />
      <pre>
        <code className={`lang-${lang}`} dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
      </pre>
    </div>
  );
}
