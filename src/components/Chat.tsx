import { useState, useEffect, useRef } from 'react';
import type { ChatMessageUI, AppSettings } from '../lib/types';
import {
  sendChatMessage,
  executeBlenderCode,
  takeBlenderScreenshot,
  undoBlender,
  getSceneContext,
} from '../lib/tauri-commands';
import MessageBubble from './MessageBubble';
import PromptChips from './PromptChips';
import { Send, Loader2 } from 'lucide-react';

interface ChatProps {
  settings: AppSettings;
  blenderConnected: boolean;
}

export default function Chat({ settings, blenderConnected }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const sendMessage = async (overrideInput?: string) => {
    const text = overrideInput || input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessageUI = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!overrideInput) setInput('');
    setIsLoading(true);

    const loadingId = (Date.now() + 1).toString();
    const loadingMsg: ChatMessageUI = {
      id: loadingId,
      role: 'assistant',
      content: 'Thinking...',
      timestamp: Date.now(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      let sceneContext = '';
      if (blenderConnected) {
        try {
          sceneContext = await getSceneContext();
        } catch {
          // optional
        }
      }

      const systemMessage = settings.system_prompt + (sceneContext ? `\n\n## Current Blender Scene\n${sceneContext}` : '');

      const chatHistory = [
        { role: 'system' as const, content: systemMessage },
        ...messages.slice(-20).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: text },
      ];

      const aiResponse = await sendChatMessage(chatHistory);

      const isCode =
        aiResponse.includes('import bpy') ||
        aiResponse.includes('bpy.ops') ||
        aiResponse.includes('bpy.data');

      if (isCode && blenderConnected) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? { ...m, content: 'Executing code in Blender...', isLoading: true }
              : m
          )
        );

        const execResult = await executeBlenderCode(aiResponse);

        let screenshot: string | undefined;
        try {
          const ssResult = await takeBlenderScreenshot(800);
          if (ssResult.status === 'success' && ssResult.result) {
            const r = ssResult.result as { image?: string };
            if (r.image) {
              screenshot = `data:image/png;base64,${r.image}`;
            }
          }
        } catch {
          // screenshot optional
        }

        const output = (execResult as { result?: { output?: string } }).result
          ?.output;
        let finalContent = aiResponse;
        if (output && output.trim()) {
          finalContent += `\n\n---\n**Blender output:** ${output.trim()}`;
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
                  content: finalContent,
                  screenshot,
                  isLoading: false,
                  executedCode: aiResponse,
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? { ...m, content: aiResponse, isLoading: false }
              : m
          )
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, content: `Error: ${errorMsg}`, isLoading: false, error: true }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteCode = async (code: string) => {
    if (!blenderConnected) return;

    const execId = Date.now().toString();
    const execMsg: ChatMessageUI = {
      id: execId,
      role: 'assistant',
      content: 'Executing code in Blender...',
      timestamp: Date.now(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, execMsg]);
    setIsLoading(true);

    try {
      const execResult = await executeBlenderCode(code);
      let screenshot: string | undefined;
      try {
        const ssResult = await takeBlenderScreenshot(800);
        if (ssResult.status === 'success' && ssResult.result) {
          const r = ssResult.result as { image?: string };
          if (r.image) screenshot = `data:image/png;base64,${r.image}`;
        }
      } catch {}

      const output = (execResult as { result?: { output?: string } }).result?.output;
      let content = 'Code executed successfully.';
      if (output && output.trim()) content += `\n\n**Output:** ${output.trim()}`;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === execId
            ? { ...m, content, screenshot, isLoading: false, executedCode: code }
            : m
        )
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === execId
            ? { ...m, content: `Execution error: ${errorMsg}`, isLoading: false, error: true }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!blenderConnected) return;
    try {
      await undoBlender();
      const undoMsg: ChatMessageUI = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Last operation undone.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, undoMsg]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Undo failed: ${errorMsg}`,
          timestamp: Date.now(),
          error: true,
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-dim flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-accent">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                What do you want to create?
              </h2>
              <p className="text-sm text-text-muted max-w-md">
                Describe your 3D scene, object, or idea. BlenderCraft will generate and execute the code in Blender.
              </p>
              {!blenderConnected && (
                <p className="text-xs text-warning mt-3 bg-warning/10 px-3 py-2 rounded-lg">
                  Blender is not connected. Start the BlenderCraft addon in Blender first.
                </p>
              )}
            </div>
            <PromptChips onSelect={(prompt) => sendMessage(prompt)} />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className="group animate-fade-in">
                <MessageBubble
                  message={msg}
                  onExecuteCode={blenderConnected ? handleExecuteCode : undefined}
                  onUndo={blenderConnected ? handleUndo : undefined}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border-custom bg-bg-secondary px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                blenderConnected
                  ? 'Describe what to create in Blender...'
                  : 'Connect to Blender first...'
              }
              disabled={isLoading}
              rows={1}
              className="w-full bg-bg-tertiary text-text-primary rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 text-sm placeholder:text-text-muted border border-border-custom focus:border-accent transition-colors"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {blenderConnected && (
                <span className="w-2 h-2 rounded-full bg-success" title="Blender connected" />
              )}
            </div>
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="shrink-0 w-10 h-10 rounded-xl bg-accent hover:bg-accent-hover disabled:bg-bg-elevated disabled:text-text-muted text-white flex items-center justify-center transition-colors"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
