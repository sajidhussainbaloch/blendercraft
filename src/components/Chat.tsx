import { useState, useEffect, useRef } from 'react';
import type { ChatMessageUI, AppSettings } from '../lib/types';
import {
  runAgentTask,
  cancelAgentTask,
  getAgentEvents,
  type AgentEvent,
} from '../lib/tauri-commands';
import MessageBubble from './MessageBubble';
import PromptChips from './PromptChips';
import TaskProgress from './TaskProgress';
import { Send, Square, Sparkles } from 'lucide-react';

interface ChatProps {
  settings: AppSettings;
  blenderConnected: boolean;
}

export default function Chat({ blenderConnected }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const eventPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentEvents]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  useEffect(() => {
    if (currentTaskId) {
      eventPollRef.current = setInterval(async () => {
        try {
          const events = await getAgentEvents();
          if (events.length > 0) {
            setAgentEvents((prev) => [...prev, ...events]);
            const completed = events.find(
              (e) => e.type === 'Completed' || e.type === 'Cancelled' || e.type === 'Error'
            );
            if (completed) {
              setIsLoading(false);
              setCurrentTaskId(null);
              if (eventPollRef.current) {
                clearInterval(eventPollRef.current);
                eventPollRef.current = null;
              }
            }
          }
        } catch {
          // ignore
        }
      }, 500);
    }

    return () => {
      if (eventPollRef.current) {
        clearInterval(eventPollRef.current);
        eventPollRef.current = null;
      }
    };
  }, [currentTaskId]);

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
    setAgentEvents([]);

    try {
      const taskId = `task_${Date.now()}`;
      setCurrentTaskId(taskId);

      const result = await runAgentTask(text);

      const assistantMessage: ChatMessageUI = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${errorMsg}`,
          timestamp: Date.now(),
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      setCurrentTaskId(null);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelAgentTask();
      setIsLoading(false);
      setCurrentTaskId(null);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Task cancelled.',
          timestamp: Date.now(),
        },
      ]);
    } catch {
      // ignore
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
      <div className="flex-1 overflow-y-auto px-6 py-8 min-h-0">
        {messages.length === 0 && !currentTaskId ? (
          <div className="flex flex-col items-center justify-center h-full gap-10 animate-fade-in">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl gradient-accent flex items-center justify-center glow-accent">
                <Sparkles size={36} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-3 tracking-tight">
                What do you want to create?
              </h1>
              <p className="text-sm text-text-secondary max-w-md leading-relaxed">
                Describe your 3D scene, object, or idea in plain language.
                <br />
                BlenderCraft will plan, build, and verify it in Blender.
              </p>
              {!blenderConnected && (
                <div className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                  Blender is not connected. Start the addon first.
                </div>
              )}
            </div>
            <PromptChips onSelect={(prompt) => sendMessage(prompt)} />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className="animate-fade-in">
                <MessageBubble message={msg} />
              </div>
            ))}

            {currentTaskId && (
              <TaskProgress events={agentEvents} />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 px-6 pb-4 pt-2">
        <div className="max-w-3xl mx-auto">
          <div className="glass-strong rounded-2xl p-2 flex items-end gap-2 transition-all focus-within:border-accent/30 focus-within:glow-accent">
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
              className="flex-1 bg-transparent text-text-primary px-3 py-2.5 resize-none focus:outline-none text-sm placeholder:text-text-muted min-w-0"
            />
            {isLoading ? (
              <button
                onClick={handleCancel}
                className="shrink-0 w-10 h-10 rounded-xl bg-error/90 hover:bg-error text-white flex items-center justify-center transition-all duration-200 hover:scale-105"
                title="Stop task"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className="shrink-0 w-10 h-10 rounded-xl gradient-accent text-white flex items-center justify-center transition-all duration-200 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-1.5">
              {blenderConnected && (
                <span className="flex items-center gap-1.5 text-[10px] text-success/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  Blender connected
                </span>
              )}
            </div>
            <span className="text-[10px] text-text-muted">Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
