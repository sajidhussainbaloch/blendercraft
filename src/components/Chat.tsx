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

  const hasMessages = messages.length > 0 || currentTaskId;

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto min-h-0">
        {hasMessages ? (
          <div className="max-w-[680px] mx-auto px-5 py-6 space-y-4">
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
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-5 animate-fade-in">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-xl gradient-accent flex items-center justify-center" style={{ boxShadow: '0 0 30px -6px rgba(232,125,13,0.4)' }}>
                <Sparkles size={30} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-text-primary mb-2">
                What do you want to create?
              </h1>
              <p className="text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
                Describe your 3D scene in plain language. BlenderCraft will build it in Blender.
              </p>
              {!blenderConnected && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                  Blender not connected. Start the addon first.
                </div>
              )}
            </div>
            <div className="mt-8">
              <PromptChips onSelect={(prompt) => sendMessage(prompt)} />
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 pb-3 pt-1">
        <div className="max-w-[680px] mx-auto">
          <div className="bg-bg-tertiary rounded-xl border border-border-custom flex items-end p-1.5 transition-colors focus-within:border-accent/40">
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
              className="flex-1 bg-transparent text-text-primary px-3 py-2 resize-none focus:outline-none text-sm placeholder:text-text-muted min-w-0 leading-relaxed"
            />
            {isLoading ? (
              <button
                onClick={handleCancel}
                className="shrink-0 w-9 h-9 rounded-lg bg-error text-white flex items-center justify-center no-shift"
                title="Stop task"
              >
                <Square size={15} />
              </button>
            ) : (
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className="shrink-0 w-9 h-9 rounded-lg gradient-accent text-white flex items-center justify-center no-shift disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send size={15} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <div className="flex items-center gap-1.5">
              {blenderConnected && (
                <span className="flex items-center gap-1 text-[10px] text-success/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  Blender connected
                </span>
              )}
            </div>
            <span className="text-[10px] text-text-muted">Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
}
