import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Play } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  onExecute?: (code: string) => void;
  executable?: boolean;
}

export default function CodeBlock({ code, language = 'python', onExecute, executable = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-border-custom group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-elevated border-b border-border-custom">
        <span className="text-xs text-text-muted font-mono">{language}</span>
        <div className="flex items-center gap-1.5">
          {executable && onExecute && (
            <button
              onClick={() => onExecute(code)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              <Play size={10} />
              Run
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-border-custom transition-colors"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '12px 16px',
          background: '#1e1e1e',
          fontSize: '13px',
          lineHeight: '1.6',
          borderRadius: 0,
          border: 'none',
        }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
