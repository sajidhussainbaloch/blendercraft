import type { AgentEvent } from '../lib/tauri-commands';
import { Check, Loader2, AlertTriangle, X, Wrench, Search, Camera } from 'lucide-react';

interface TaskProgressProps {
  events: AgentEvent[];
}

export default function TaskProgress({ events }: TaskProgressProps) {
  if (events.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 animate-fade-in gradient-subtle">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
          <Loader2 size={14} className="text-accent animate-spin" />
        </div>
        <div>
          <span className="text-sm font-semibold text-text-primary">Agent Working</span>
          <div className="text-[10px] text-text-muted">{events.length} events</div>
        </div>
      </div>

      <div className="space-y-1">
        {events.slice(-12).map((event, i) => (
          <EventRow key={i} event={event} />
        ))}
        {events.length > 12 && (
          <div className="text-[10px] text-text-muted pl-5 py-0.5">
            + {events.length - 12} earlier events
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: AgentEvent }) {
  const getIcon = () => {
    switch (event.type) {
      case 'TaskStarted':
        return <Wrench size={11} className="text-accent" />;
      case 'Planning':
        return <Search size={11} className="text-info" />;
      case 'Thinking':
        return <Loader2 size={11} className="text-text-muted animate-spin" />;
      case 'ToolCall':
        return <Wrench size={11} className="text-accent" />;
      case 'ToolResult':
        if (event.status === 'success') return <Check size={11} className="text-success" />;
        if (event.status === 'error') return <X size={11} className="text-error" />;
        return <AlertTriangle size={11} className="text-warning" />;
      case 'Progress':
        return <Loader2 size={11} className="text-text-muted animate-spin" />;
      case 'ScreenshotReady':
        return <Camera size={11} className="text-info" />;
      case 'Warning':
        return <AlertTriangle size={11} className="text-warning" />;
      case 'Error':
        return <X size={11} className="text-error" />;
      case 'Completed':
        return <Check size={11} className="text-success" />;
      case 'Cancelled':
        return <X size={11} className="text-text-muted" />;
      default:
        return <div className="w-2.5 h-2.5 rounded-full bg-bg-elevated" />;
    }
  };

  const getText = () => {
    switch (event.type) {
      case 'TaskStarted':
        return event.user_request || 'Unknown task';
      case 'Planning':
        return 'Planning approach...';
      case 'Thinking':
        return 'Reasoning...';
      case 'ToolCall':
        return `Calling ${event.tool_name || 'tool'}...`;
      case 'ToolResult':
        return `${event.tool_name || 'Tool'}: ${event.message || event.status || 'done'}`;
      case 'Progress':
        return event.description || 'Working...';
      case 'ScreenshotReady':
        return 'Screenshot captured';
      case 'Warning':
        return event.message || 'Warning';
      case 'Error':
        return event.message || 'Unknown error';
      case 'Completed':
        return event.summary || 'Task completed';
      case 'Cancelled':
        return 'Task cancelled';
      default:
        return event.type;
    }
  };

  return (
    <div className="flex items-start gap-2 text-xs py-0.5">
      <span className="mt-0.5 shrink-0">{getIcon()}</span>
      <span className="text-text-secondary break-words leading-relaxed">{getText()}</span>
    </div>
  );
}
