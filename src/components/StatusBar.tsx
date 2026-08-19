import { Monitor, Cpu, Wifi, WifiOff } from 'lucide-react';

interface StatusBarProps {
  blenderConnected: boolean;
  providerName: string;
  modelName: string;
}

export default function StatusBar({ blenderConnected, providerName, modelName }: StatusBarProps) {
  return (
    <footer className="shrink-0 flex items-center justify-between px-5 py-1.5 bg-bg-secondary/50 border-t border-border-custom text-[11px] text-text-muted">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          {blenderConnected ? (
            <Wifi size={11} className="text-success" />
          ) : (
            <WifiOff size={11} className="text-error" />
          )}
          <span className={blenderConnected ? 'text-success/80' : 'text-error/80'}>
            {blenderConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <Cpu size={11} />
          <span>{providerName}</span>
          {modelName && (
            <>
              <span className="text-border-hover">·</span>
              <span className="text-text-secondary">{modelName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Monitor size={11} />
          <span>BlenderCraft v1.0</span>
        </div>
      </div>
    </footer>
  );
}
