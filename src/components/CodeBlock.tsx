import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  onExecute?: (code: string) => void;
  executable?: boolean;
}

export default function CodeBlock({ code, language = 'python' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-border-custom group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-elevated border-b border-border-custom">
        <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-bg-tertiary text-text-muted hover:text-text-secondary no-shift opacity-0 group-hover:opacity-100"
        >
          {copied ? <Check size={9} className="text-success" /> : <Copy size={9} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '12px 16px',
          background: '#0a0a10',
          fontSize: '12.5px',
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
