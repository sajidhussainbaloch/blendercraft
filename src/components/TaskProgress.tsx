import type { AgentEvent } from '../lib/tauri-commands';
import { Check, Loader2, AlertTriangle, X, Wrench } from 'lucide-react';

interface TaskProgressProps {
  events: AgentEvent[];
}

export default function TaskProgress({ events }: TaskProgressProps) {
  if (events.length === 0) return null;

  return (
    <div className="bg-bg-secondary border border-border-custom rounded-xl p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Loader2 size={14} className="text-accent animate-spin" />
        <span className="text-sm font-medium text-text-primary">Agent Working...</span>
      </div>

      <div className="space-y-1.5">
        {events.map((event, i) => (
          <EventRow key={i} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: AgentEvent }) {
  const getIcon = () => {
    switch (event.type) {
      case 'TaskStarted':
        return <Wrench size={12} className="text-accent" />;
      case 'Planning':
      case 'Thinking':
        return <Loader2 size={12} className="text-text-muted animate-spin" />;
      case 'ToolCall':
        return <Wrench size={12} className="text-accent" />;
      case 'ToolResult':
        if (event.status === 'success') return <Check size={12} className="text-success" />;
        if (event.status === 'error') return <X size={12} className="text-error" />;
        return <AlertTriangle size={12} className="text-warning" />;
      case 'Progress':
        return <Loader2 size={12} className="text-text-muted animate-spin" />;
      case 'ScreenshotReady':
        return <Check size={12} className="text-success" />;
      case 'Warning':
        return <AlertTriangle size={12} className="text-warning" />;
      case 'Error':
        return <X size={12} className="text-error" />;
      case 'Completed':
        return <Check size={12} className="text-success" />;
      case 'Cancelled':
        return <X size={12} className="text-text-muted" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-bg-elevated" />;
    }
  };

  const getText = () => {
    switch (event.type) {
      case 'TaskStarted':
        return `Task: ${event.user_request || 'Unknown'}`;
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
        return `Error: ${event.message || 'Unknown error'}`;
      case 'Completed':
        return event.summary || 'Task completed';
      case 'Cancelled':
        return 'Task cancelled';
      default:
        return event.type;
    }
  };

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="mt-0.5 shrink-0">{getIcon()}</span>
      <span className="text-text-secondary break-words">{getText()}</span>
    </div>
  );
}
