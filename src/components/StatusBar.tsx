import { Monitor, Cpu, Wifi, WifiOff } from 'lucide-react';

interface StatusBarProps {
  blenderConnected: boolean;
  providerName: string;
  modelName: string;
}

export default function StatusBar({ blenderConnected, providerName, modelName }: StatusBarProps) {
  return (
    <footer className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-bg-secondary border-t border-border-custom text-xs text-text-muted">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {blenderConnected ? (
            <Wifi size={12} className="text-success" />
          ) : (
            <WifiOff size={12} className="text-error" />
          )}
          <span className={blenderConnected ? 'text-success' : 'text-error'}>
            Blender {blenderConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Cpu size={12} />
          <span>{providerName}</span>
          {modelName && (
            <>
              <span className="text-border-custom">|</span>
              <span className="text-text-secondary">{modelName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Monitor size={12} />
          <span>BlenderCraft v1.0</span>
        </div>
      </div>
    </footer>
  );
}
