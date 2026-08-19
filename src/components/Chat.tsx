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
import { Send, Square } from 'lucide-react';

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
            // Check if task completed
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
      <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
        {messages.length === 0 && !currentTaskId ? (
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
                Describe your 3D scene, object, or idea. BlenderCraft will plan, create, and verify in Blender.
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
              {blenderConnected && !isLoading && (
                <span className="w-2 h-2 rounded-full bg-success" title="Blender connected" />
              )}
            </div>
          </div>
          {isLoading ? (
            <button
              onClick={handleCancel}
              className="shrink-0 w-10 h-10 rounded-xl bg-error hover:bg-red-600 text-white flex items-center justify-center transition-colors"
              title="Stop task"
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-accent hover:bg-accent-hover disabled:bg-bg-elevated disabled:text-text-muted text-white flex items-center justify-center transition-colors"
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
