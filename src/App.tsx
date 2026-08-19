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
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent-dim flex items-center justify-center">
            <Box size={28} className="text-accent" />
          </div>
          <div className="text-text-secondary text-sm">Loading BlenderCraft...</div>
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
        <nav className="w-12 bg-bg-secondary border-r border-border-custom flex flex-col items-center py-3 gap-2 shrink-0">
          <button
            onClick={() => setView('chat')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
              view === 'chat'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
            }`}
            title="Chat"
          >
            <MessageSquare size={18} />
          </button>
          <button
            onClick={() => setView('settings')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
              view === 'settings'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
            }`}
            title="Settings"
          >
            <Settings2 size={18} />
          </button>
          <div className="flex-1" />
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              blenderConnected ? 'bg-success' : 'bg-error'
            }`}
            title={blenderConnected ? 'Blender connected' : 'Blender disconnected'}
          />
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
