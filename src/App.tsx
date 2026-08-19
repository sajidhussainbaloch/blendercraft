import { useState, useEffect } from 'react';
import Chat from './components/Chat';
import Settings from './components/Settings';
import StatusBar from './components/StatusBar';
import { getSettings, isBlenderConnected } from './lib/tauri-commands';
import type { AppSettings } from './lib/types';
import { MessageSquare, Settings2, Box } from 'lucide-react';

type View = 'chat' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('chat');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [blenderConnected, setBlenderConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setSettings(s);
        const bc = await isBlenderConnected();
        setBlenderConnected(bc);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !settings) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl gradient-accent flex items-center justify-center glow-accent">
            <Box size={30} className="text-white" />
          </div>
          <div className="text-text-secondary text-sm font-medium">Loading BlenderCraft</div>
          <div className="mt-2 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full bg-accent"
                style={{
                  animation: 'pulse-dot 1.4s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeProvider = settings.providers.find(
    (p) => p.id === settings.active_provider_id
  );

  return (
    <div className="w-full h-full flex flex-col bg-bg-primary">
      <div className="flex-1 flex min-h-0">
        <nav className="w-14 bg-bg-secondary/80 backdrop-blur-xl border-r border-border-custom flex flex-col items-center py-4 gap-1.5 shrink-0">
          <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center mb-3 glow-accent" title="BlenderCraft">
            <Box size={18} className="text-white" />
          </div>

          <div className="w-6 h-px bg-border-custom mb-2" />

          <NavButton
            active={view === 'chat'}
            onClick={() => setView('chat')}
            icon={<MessageSquare size={18} />}
            label="Chat"
          />
          <NavButton
            active={view === 'settings'}
            onClick={() => setView('settings')}
            icon={<Settings2 size={18} />}
            label="Settings"
          />

          <div className="flex-1" />

          <div className="relative" title={blenderConnected ? 'Blender connected' : 'Blender disconnected'}>
            <div className={`w-2.5 h-2.5 rounded-full ${blenderConnected ? 'bg-success' : 'bg-error'}`} />
            {blenderConnected && (
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-success animate-ping opacity-30" />
            )}
          </div>
        </nav>

        <main className="flex-1 min-w-0 min-h-0">
          {view === 'chat' ? (
            <Chat settings={settings} blenderConnected={blenderConnected} />
          ) : (
            <Settings
              settings={settings}
              onSettingsChange={setSettings}
              blenderConnected={blenderConnected}
              onBlenderConnectionChange={setBlenderConnected}
            />
          )}
        </main>
      </div>

      <StatusBar
        blenderConnected={blenderConnected}
        providerName={activeProvider?.name ?? 'None'}
        modelName={activeProvider?.model_id ?? ''}
      />
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
        active
          ? 'bg-accent/15 text-accent glow-accent'
          : 'text-text-muted hover:text-text-secondary hover:bg-bg-glass-hover'
      }`}
      title={label}
    >
      {icon}
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[7px] w-1 h-4 rounded-full bg-accent" />
      )}
    </button>
  );
}
