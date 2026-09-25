'use client';

// Terminal-style output. `lines` is an array of arrays; each inner array is
// a sequence of [text, className?] pairs that render as <span> chunks.
// A line that is just a string renders as plain dimmed prompt text.
export default function TerminalBlock({ lines }) {
  return (
    <div className="terminal-block">
      <pre>
        {lines.map((line, i) => {
          if (typeof line === 'string') {
            return (
              <span key={i}>
                {line}
                {'\n'}
              </span>
            );
          }
          return (
            <span key={i}>
              {line.map(([text, cls], j) =>
                cls ? (
                  <span key={j} className={cls}>
                    {text}
                  </span>
                ) : (
                  <span key={j}>{text}</span>
                ),
              )}
              {'\n'}
            </span>
          );
        })}
      </pre>
    </div>
  );
}
