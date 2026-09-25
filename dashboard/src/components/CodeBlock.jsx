'use client';

import { useMemo } from 'react';
import { highlight } from '../lib/highlight.js';

export default function CodeBlock({ filename, lang, children }) {
  const html = useMemo(() => highlight(children ?? '', lang), [children, lang]);
  return (
    <div className="code-block">
      {filename && <span className="filename">{filename}</span>}
      <pre>
        <code className={`lang-${lang}`} dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
