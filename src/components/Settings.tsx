import { useState } from 'react';
import type { AppSettings, AiProvider } from '../lib/types';
import {
  saveSettings,
  addProvider,
  updateProvider,
  deleteProvider,
  setActiveProvider,
  testProvider,
  fetchModels,
  connectBlender,
  disconnectBlender,
} from '../lib/tauri-commands';
import {
  Cpu,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  Check,
  Loader2,
  ChevronDown,
  Zap,
  Globe,
  Key,
  Box,
} from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  blenderConnected: boolean;
  onBlenderConnectionChange: (connected: boolean) => void;
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

type SettingsTab = 'providers' | 'blender' | 'model';

export default function Settings({
  settings,
  onSettingsChange,
  blenderConnected,
  onBlenderConnectionChange,
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers');
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);

  const handleSave = async () => {
    try {
      await saveSettings(localSettings);
      onSettingsChange(localSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(`Failed to save: ${err}`);
    }
  };

  const handleAddProvider = () => {
    const newProvider: AiProvider = {
      id: generateId(),
      name: 'New Provider',
      base_url: 'http://localhost:11434/v1',
      api_key: '',
      model_id: '',
      is_active: false,
    };
    setEditingProvider(newProvider);
    setIsAddingNew(true);
  };

  const handleSaveProvider = async () => {
    if (!editingProvider) return;
    try {
      let updatedSettings: AppSettings;
      if (isAddingNew) {
        updatedSettings = await addProvider(editingProvider);
      } else {
        updatedSettings = await updateProvider(editingProvider);
      }
      setLocalSettings(updatedSettings);
      onSettingsChange(updatedSettings);
      setEditingProvider(null);
      setIsAddingNew(false);
    } catch (err) {
      alert(`Failed to save provider: ${err}`);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    try {
      const updatedSettings = await deleteProvider(id);
      setLocalSettings(updatedSettings);
      onSettingsChange(updatedSettings);
      if (editingProvider?.id === id) {
        setEditingProvider(null);
      }
    } catch (err) {
      alert(`Failed to delete: ${err}`);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const updatedSettings = await setActiveProvider(id);
      setLocalSettings(updatedSettings);
      onSettingsChange(updatedSettings);
    } catch (err) {
      alert(`Failed: ${err}`);
    }
  };

  const handleTestConnection = async (provider: AiProvider) => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testProvider(provider);
      setTestResult({ ok: true, msg: result });
    } catch (err) {
      setTestResult({ ok: false, msg: String(err) });
    } finally {
      setTesting(false);
    }
  };

  const handleFetchModels = async (provider: AiProvider) => {
    setModelsLoading(true);
    try {
      const models = await fetchModels(provider);
      setDiscoveredModels(models);
    } catch (err) {
      setDiscoveredModels([]);
      alert(`Failed to fetch models: ${err}`);
    } finally {
      setModelsLoading(false);
    }
  };

  const handleToggleBlender = async () => {
    try {
      if (blenderConnected) {
        await disconnectBlender();
        onBlenderConnectionChange(false);
      } else {
        await connectBlender();
        onBlenderConnectionChange(true);
      }
    } catch (err) {
      alert(`Blender connection error: ${err}`);
    }
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'providers', label: 'AI Providers', icon: <Cpu size={15} /> },
    { id: 'blender', label: 'Blender', icon: <Box size={15} /> },
    { id: 'model', label: 'Model', icon: <Zap size={15} /> },
  ];

  return (
    <div className="h-full flex">
      <div className="w-48 shrink-0 bg-bg-secondary/50 backdrop-blur-xl border-r border-border-custom p-3 flex flex-col gap-1">
        <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-widest px-3 mb-3">
          Settings
        </h2>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-accent/15 text-accent font-medium'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={handleSave}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            saved
              ? 'bg-success/15 text-success border border-success/20'
              : 'gradient-accent text-white hover:scale-[1.02]'
          }`}
        >
          {saved ? <><Check size={14} /> Saved!</> : 'Save Settings'}
        </button>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto p-8">
        {activeTab === 'providers' && (
          <div className="max-w-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary">AI Providers</h3>
                <p className="text-xs text-text-muted mt-1">Configure your AI model endpoints</p>
              </div>
              <button
                onClick={handleAddProvider}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium gradient-accent text-white transition-all hover:scale-[1.02]"
              >
                <Plus size={14} />
                Add Provider
              </button>
            </div>

            <div className="space-y-2">
              {localSettings.providers.map((provider) => (
                <div
                  key={provider.id}
                  onClick={() => {
                    setEditingProvider({ ...provider });
                    setIsAddingNew(false);
                    setDiscoveredModels([]);
                    setTestResult(null);
                  }}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                    editingProvider?.id === provider.id
                      ? 'glass border-accent/40 glow-accent'
                      : localSettings.active_provider_id === provider.id
                      ? 'glass border-success/30'
                      : 'glass hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          localSettings.active_provider_id === provider.id
                            ? 'gradient-accent text-white'
                            : 'bg-bg-elevated text-text-muted border border-border-custom'
                        }`}
                      >
                        {localSettings.active_provider_id === provider.id ? (
                          <Check size={16} />
                        ) : (
                          <Cpu size={16} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text-primary truncate">
                          {provider.name}
                        </div>
                        <div className="text-xs text-text-muted flex items-center gap-1 truncate mt-0.5">
                          <Globe size={10} className="shrink-0" />
                          <span className="truncate">{provider.base_url}</span>
                        </div>
                        <div className="text-xs text-text-muted truncate mt-0.5">
                          {provider.model_id || '(no model set)'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {localSettings.active_provider_id !== provider.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetActive(provider.id);
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-custom hover:border-border-hover transition-all"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProvider(provider.id);
                        }}
                        className="text-xs p-1.5 rounded-lg hover:bg-error/10 text-text-muted hover:text-error transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editingProvider && (
              <div className="mt-5 p-5 glass rounded-2xl space-y-4 gradient-subtle">
                <h4 className="text-sm font-bold text-text-primary">
                  {isAddingNew ? 'Add Provider' : 'Edit Provider'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Name"
                    value={editingProvider.name}
                    onChange={(v) => setEditingProvider({ ...editingProvider, name: v })}
                    icon={<Cpu size={12} />}
                  />
                  <InputField
                    label="Model ID"
                    value={editingProvider.model_id}
                    onChange={(v) => setEditingProvider({ ...editingProvider, model_id: v })}
                    placeholder="gpt-4o, qwen2.5-coder, etc."
                    icon={<Zap size={12} />}
                  />
                </div>
                <InputField
                  label="Base URL"
                  value={editingProvider.base_url}
                  onChange={(v) => setEditingProvider({ ...editingProvider, base_url: v })}
                  placeholder="https://api.openai.com/v1"
                  icon={<Globe size={12} />}
                />
                <div className="flex items-end gap-3">
                  <InputField
                    label="API Key"
                    value={editingProvider.api_key}
                    onChange={(v) => setEditingProvider({ ...editingProvider, api_key: v })}
                    placeholder="sk-... (optional for local)"
                    type="password"
                    icon={<Key size={12} />}
                    className="flex-1"
                  />
                  <button
                    onClick={() => handleFetchModels(editingProvider)}
                    disabled={modelsLoading}
                    className="shrink-0 h-9 px-3 rounded-lg text-xs font-medium bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-custom hover:border-border-hover transition-all flex items-center gap-1.5"
                  >
                    {modelsLoading ? <Loader2 size={11} className="animate-spin" /> : <ChevronDown size={11} />}
                    {modelsLoading ? 'Loading...' : 'Fetch Models'}
                  </button>
                </div>
                {discoveredModels.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-border-custom bg-bg-primary/50">
                    {discoveredModels.map((model) => (
                      <button
                        key={model}
                        onClick={() => setEditingProvider({ ...editingProvider, model_id: model })}
                        className="w-full text-left text-xs text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover px-3.5 py-2 transition-colors border-b border-border-custom last:border-b-0"
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSaveProvider}
                    className="px-5 py-2 rounded-xl text-sm font-medium gradient-accent text-white transition-all hover:scale-[1.02]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingProvider(null);
                      setIsAddingNew(false);
                    }}
                    className="px-5 py-2 rounded-xl text-sm bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-custom transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleTestConnection(editingProvider)}
                    disabled={testing}
                    className="px-5 py-2 rounded-xl text-sm font-medium bg-success/15 text-success border border-success/20 hover:bg-success/25 transition-all flex items-center gap-1.5"
                  >
                    {testing ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                {testResult && (
                  <div
                    className={`text-sm p-3.5 rounded-xl border ${
                      testResult.ok
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-error/10 text-error border-error/20'
                    }`}
                  >
                    {testResult.msg}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'blender' && (
          <div className="max-w-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-text-primary">Blender Connection</h3>
              <p className="text-xs text-text-muted mt-1">Connect to the BlenderCraft addon</p>
            </div>
            <div className="glass rounded-2xl p-5 space-y-5">
              <div className="flex items-end gap-4">
                <InputField
                  label="Host"
                  value={localSettings.blender_host}
                  onChange={(v) => setLocalSettings({ ...localSettings, blender_host: v })}
                  className="w-40"
                />
                <InputField
                  label="Port"
                  value={String(localSettings.blender_port)}
                  onChange={(v) => setLocalSettings({ ...localSettings, blender_port: parseInt(v) || 9876 })}
                  className="w-28"
                />
                <button
                  onClick={handleToggleBlender}
                  className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    blenderConnected
                      ? 'bg-error/15 text-error border border-error/20 hover:bg-error/25'
                      : 'gradient-accent text-white hover:scale-[1.02]'
                  }`}
                >
                  {blenderConnected ? <WifiOff size={14} /> : <Wifi size={14} />}
                  {blenderConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <div className="relative">
                  <div className={`w-2.5 h-2.5 rounded-full ${blenderConnected ? 'bg-success' : 'bg-error'}`} />
                  {blenderConnected && (
                    <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-success animate-ping opacity-30" />
                  )}
                </div>
                <span className={blenderConnected ? 'text-success/80' : 'text-error/80'}>
                  {blenderConnected ? 'Connected to Blender' : 'Not connected'}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'model' && (
          <div className="max-w-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-text-primary">Model Settings</h3>
              <p className="text-xs text-text-muted mt-1">Configure AI model parameters</p>
            </div>
            <div className="glass rounded-2xl p-5 space-y-5">
              <div className="flex gap-4">
                <InputField
                  label="Temperature"
                  value={String(localSettings.temperature)}
                  onChange={(v) => setLocalSettings({ ...localSettings, temperature: parseFloat(v) || 0.3 })}
                  className="w-28"
                />
                <InputField
                  label="Max Tokens"
                  value={String(localSettings.max_tokens)}
                  onChange={(v) => setLocalSettings({ ...localSettings, max_tokens: parseInt(v) || 8192 })}
                  className="w-32"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-2 font-medium">System Prompt</label>
                <textarea
                  value={localSettings.system_prompt}
                  onChange={(e) => setLocalSettings({ ...localSettings, system_prompt: e.target.value })}
                  rows={12}
                  className="w-full bg-bg-primary/80 text-text-primary rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y border border-border-custom transition-colors"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-text-muted mb-1.5 font-medium">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-bg-primary/80 text-text-primary rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 border border-border-custom transition-all ${
            icon ? 'pl-9 pr-3' : 'px-3'
          }`}
        />
      </div>
    </div>
  );
}
