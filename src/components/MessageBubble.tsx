import { useState } from 'react';
import type { ChatMessageUI } from '../lib/types';
import { Copy, Check, Bot, User } from 'lucide-react';
import CodeBlock from './CodeBlock';

interface MessageBubbleProps {
  message: ChatMessageUI;
  onExecuteCode?: (code: string) => void;
  onUndo?: () => void;
}

function extractCodeBlocks(content: string): Array<{ type: 'text' | 'code'; content: string; language?: string }> {
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) parts.push({ type: 'text', content: text });
    }
    parts.push({
      type: 'code',
      content: match[2].trim(),
      language: match[1] || 'python',
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) parts.push({ type: 'text', content: remaining });
  }

  return parts;
}

function isPythonCode(content: string): boolean {
  const trimmed = content.trim();
  return (
    trimmed.startsWith('import bpy') ||
    trimmed.startsWith('import math') ||
    trimmed.includes('bpy.ops') ||
    trimmed.includes('bpy.data') ||
    trimmed.includes('bpy.context')
  );
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = () => {
    if (message.isLoading) {
      return (
        <div className="flex items-center gap-3 py-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-accent"
                style={{
                  animation: 'pulse-dot 1.4s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
          <span className="text-sm text-text-muted">{message.content}</span>
        </div>
      );
    }

    if (isPythonCode(message.content) && !isUser) {
      return (
        <div>
          <CodeBlock code={message.content} language="python" />
          {message.executedCode && (
            <div className="flex items-center gap-2 mt-2 px-1">
              <span className="text-[10px] text-success/70 bg-success/10 px-2 py-0.5 rounded-md font-medium">
                Executed in Blender
              </span>
            </div>
          )}
        </div>
      );
    }

    const parts = extractCodeBlocks(message.content);
    if (parts.length === 0) {
      return (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {parts.map((part, i) =>
          part.type === 'code' ? (
            <CodeBlock key={i} code={part.content} language={part.language || 'python'} />
          ) : (
            <div key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
              {part.content}
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 ${
          isUser
            ? 'gradient-accent text-white'
            : 'bg-bg-elevated text-text-muted border border-border-custom'
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      <div className={`flex flex-col max-w-[85%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 min-w-0 break-words ${
            isUser
              ? 'gradient-accent text-white rounded-br-lg'
              : message.error
              ? 'bg-error/10 border border-error/20 text-error rounded-bl-lg'
              : 'glass rounded-bl-lg'
          }`}
        >
          {renderContent()}
        </div>

        {message.screenshot && (
          <div className="mt-2 rounded-xl overflow-hidden border border-border-custom max-w-md">
            <img
              src={message.screenshot}
              alt="Blender viewport"
              className="w-full h-auto"
            />
          </div>
        )}

        <div className="flex items-center gap-2 mt-1 px-1">
          <span className="text-[10px] text-text-muted">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && !message.isLoading && (
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors"
            >
              {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
