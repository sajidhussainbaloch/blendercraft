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
    <div className="my-3 rounded-xl overflow-hidden border border-border-custom group">
      <div className="flex items-center justify-between px-3.5 py-2 bg-bg-elevated/80 border-b border-border-custom">
        <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-lg bg-bg-tertiary/80 text-text-muted hover:text-text-primary hover:bg-bg-glass-hover transition-all opacity-0 group-hover:opacity-100"
        >
          {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '14px 18px',
          background: '#0d0d12',
          fontSize: '13px',
          lineHeight: '1.65',
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
