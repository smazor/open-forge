import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * Syntax-highlighted JSON block with copy-to-clipboard.
 */
export default function JsonBlock({ data }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-surface-overlay/80 text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-success" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
      <pre className="text-xs font-mono bg-surface border border-border rounded-lg p-4 overflow-x-auto">
        <JsonHighlighted json={json} />
      </pre>
    </div>
  );
}

function JsonHighlighted({ json }) {
  const parts = [];
  let i = 0;

  for (const line of json.split("\n")) {
    if (i > 0) parts.push(<br key={`br-${i}`} />);

    const regex =
      /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(true|false|null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\]:,])|(\s+)/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }

      if (match[1] !== undefined) {
        parts.push(
          <span key={`k-${i}-${match.index}`} className="text-accent">
            {match[1]}
          </span>,
        );
        parts.push(": ");
      } else if (match[2] !== undefined) {
        parts.push(
          <span key={`s-${i}-${match.index}`} className="text-success">
            {match[2]}
          </span>,
        );
      } else if (match[3] !== undefined) {
        parts.push(
          <span key={`b-${i}-${match.index}`} className="text-warning">
            {match[3]}
          </span>,
        );
      } else if (match[4] !== undefined) {
        parts.push(
          <span key={`n-${i}-${match.index}`} className="text-warning">
            {match[4]}
          </span>,
        );
      } else if (match[5] !== undefined) {
        parts.push(
          <span key={`p-${i}-${match.index}`} className="text-text-muted">
            {match[5]}
          </span>,
        );
      } else if (match[6] !== undefined) {
        parts.push(match[6]);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    i++;
  }

  return <>{parts}</>;
}
