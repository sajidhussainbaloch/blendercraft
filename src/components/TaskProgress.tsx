import type { AgentEvent } from '../lib/tauri-commands';
import { Check, Loader2, AlertTriangle, X, Wrench, Camera } from 'lucide-react';

interface TaskProgressProps {
  events: AgentEvent[];
}

export default function TaskProgress({ events }: TaskProgressProps) {
  if (events.length === 0) return null;

  return (
    <div className="bg-bg-secondary border border-border-custom rounded-xl p-3.5 animate-fade-in">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center">
          <Loader2 size={13} className="text-accent animate-spin" />
        </div>
        <span className="text-xs font-semibold text-text-primary">Agent Working</span>
        <span className="text-[10px] text-text-muted ml-auto">{events.length} events</span>
      </div>

      <div className="space-y-0.5">
        {events.slice(-10).map((event, i) => (
          <EventRow key={i} event={event} />
        ))}
        {events.length > 10 && (
          <div className="text-[10px] text-text-muted pl-5 py-0.5">
            + {events.length - 10} earlier
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
        return <Wrench size={10} className="text-accent" />;
      case 'Thinking':
        return <Loader2 size={10} className="text-text-muted animate-spin" />;
      case 'ToolCall':
        return <Wrench size={10} className="text-accent" />;
      case 'ToolResult':
        if (event.status === 'success') return <Check size={10} className="text-success" />;
        if (event.status === 'error') return <X size={10} className="text-error" />;
        return <AlertTriangle size={10} className="text-warning" />;
      case 'Progress':
        return <Loader2 size={10} className="text-text-muted animate-spin" />;
      case 'ScreenshotReady':
        return <Camera size={10} className="text-info" />;
      case 'Error':
        return <X size={10} className="text-error" />;
      case 'Completed':
        return <Check size={10} className="text-success" />;
      case 'Cancelled':
        return <X size={10} className="text-text-muted" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-bg-elevated" />;
    }
  };

  const getText = () => {
    switch (event.type) {
      case 'TaskStarted':
        return event.user_request || 'Unknown task';
      case 'Thinking':
        return 'Thinking...';
      case 'ToolCall':
        return `${event.tool_name || 'tool'}...`;
      case 'ToolResult':
        return `${event.tool_name || 'Tool'}: ${event.message || event.status || 'done'}`;
      case 'Progress':
        return event.description || 'Working...';
      case 'ScreenshotReady':
        return 'Screenshot captured';
      case 'Error':
        return event.message || 'Error';
      case 'Completed':
        return event.summary || 'Done';
      case 'Cancelled':
        return 'Cancelled';
      default:
        return event.type;
    }
  };

  return (
    <div className="flex items-start gap-2 text-[11px] py-0.5">
      <span className="mt-0.5 shrink-0">{getIcon()}</span>
      <span className="text-text-secondary break-words">{getText()}</span>
    </div>
  );
}
