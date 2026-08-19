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
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl gradient-accent flex items-center justify-center" style={{ boxShadow: '0 0 30px -6px rgba(232,125,13,0.4)' }}>
            <Box size={26} className="text-white" />
          </div>
          <div className="text-text-secondary text-sm font-medium">Loading BlenderCraft</div>
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
        <nav className="w-[52px] bg-bg-secondary border-r border-border-custom flex flex-col items-center py-3 gap-1 shrink-0">
          <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center mb-2" title="BlenderCraft" style={{ boxShadow: '0 0 20px -4px rgba(232,125,13,0.35)' }}>
            <Box size={16} className="text-white" />
          </div>

          <div className="w-5 h-px bg-border-custom mb-1.5" />

          <button
            onClick={() => setView('chat')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center no-shift ${
              view === 'chat'
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-glass-hover'
            }`}
            title="Chat"
          >
            <MessageSquare size={17} />
          </button>
          <button
            onClick={() => setView('settings')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center no-shift ${
              view === 'settings'
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-glass-hover'
            }`}
            title="Settings"
          >
            <Settings2 size={17} />
          </button>

          <div className="flex-1" />

          <div className="relative mb-1" title={blenderConnected ? 'Blender connected' : 'Blender disconnected'}>
            <div className={`w-2 h-2 rounded-full ${blenderConnected ? 'bg-success' : 'bg-error'}`} />
          </div>
        </nav>

        <main className="flex-1 min-w-0 min-h-0 bg-bg-primary">
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
