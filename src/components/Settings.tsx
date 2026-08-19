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
    { id: 'providers', label: 'AI Providers', icon: <Cpu size={14} /> },
    { id: 'blender', label: 'Blender', icon: <Box size={14} /> },
    { id: 'model', label: 'Model', icon: <Zap size={14} /> },
  ];

  return (
    <div className="h-full flex">
      <div className="w-44 shrink-0 bg-bg-secondary border-r border-border-custom p-3 flex flex-col gap-1">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider px-2 mb-2">
          Settings
        </h2>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
              activeTab === tab.id
                ? 'bg-accent-dim text-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover text-white transition-colors"
        >
          {saved ? <><Check size={14} /> Saved!</> : 'Save Settings'}
        </button>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto p-6">
        {activeTab === 'providers' && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">AI Providers</h3>
              <button
                onClick={handleAddProvider}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-accent hover:bg-accent-hover text-white transition-colors"
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
                  className={`p-3 rounded-lg cursor-pointer transition-all border ${
                    editingProvider?.id === provider.id
                      ? 'bg-accent-dim border-accent'
                      : localSettings.active_provider_id === provider.id
                      ? 'bg-bg-secondary border-success'
                      : 'bg-bg-secondary border-border-custom hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          localSettings.active_provider_id === provider.id
                            ? 'bg-success text-white'
                            : 'bg-bg-elevated text-text-muted'
                        }`}
                      >
                        {localSettings.active_provider_id === provider.id ? (
                          <Check size={14} />
                        ) : (
                          <Cpu size={14} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">
                          {provider.name}
                        </div>
                        <div className="text-xs text-text-muted flex items-center gap-1 truncate">
                          <Globe size={10} className="shrink-0" />
                          <span className="truncate">{provider.base_url}</span>
                        </div>
                        <div className="text-xs text-text-muted truncate">
                          Model: {provider.model_id || '(not set)'}
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
                          className="text-xs px-2 py-1 rounded bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProvider(provider.id);
                        }}
                        className="text-xs p-1 rounded hover:bg-red-900/30 text-text-muted hover:text-error transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editingProvider && (
              <div className="mt-4 p-4 bg-bg-secondary rounded-lg border border-border-custom space-y-3">
                <h4 className="text-sm font-medium text-text-primary">
                  {isAddingNew ? 'Add Provider' : 'Edit Provider'}
                </h4>
                <InputField
                  label="Name"
                  value={editingProvider.name}
                  onChange={(v) => setEditingProvider({ ...editingProvider, name: v })}
                  icon={<Cpu size={12} />}
                />
                <InputField
                  label="Base URL"
                  value={editingProvider.base_url}
                  onChange={(v) => setEditingProvider({ ...editingProvider, base_url: v })}
                  placeholder="https://api.openai.com/v1"
                  icon={<Globe size={12} />}
                />
                <InputField
                  label="API Key"
                  value={editingProvider.api_key}
                  onChange={(v) => setEditingProvider({ ...editingProvider, api_key: v })}
                  placeholder="sk-... (optional for local models)"
                  type="password"
                  icon={<Key size={12} />}
                />
                <div>
                  <InputField
                    label="Model ID"
                    value={editingProvider.model_id}
                    onChange={(v) => setEditingProvider({ ...editingProvider, model_id: v })}
                    placeholder="gpt-4o, qwen2.5-coder, etc."
                    icon={<Zap size={12} />}
                  />
                  <button
                    onClick={() => handleFetchModels(editingProvider)}
                    disabled={modelsLoading}
                    className="mt-1.5 text-xs text-accent hover:text-accent-hover flex items-center gap-1"
                  >
                    {modelsLoading ? <Loader2 size={10} className="animate-spin" /> : <ChevronDown size={10} />}
                    {modelsLoading ? 'Fetching...' : 'Fetch available models'}
                  </button>
                  {discoveredModels.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto bg-bg-primary rounded-lg border border-border-custom">
                      {discoveredModels.map((model) => (
                        <button
                          key={model}
                          onClick={() => setEditingProvider({ ...editingProvider, model_id: model })}
                          className="w-full text-left text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary px-3 py-2 transition-colors border-b border-border-custom last:border-b-0"
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSaveProvider}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover text-white transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingProvider(null);
                      setIsAddingNew(false);
                    }}
                    className="px-4 py-2 rounded-lg text-sm bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleTestConnection(editingProvider)}
                    disabled={testing}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-green-800 hover:bg-green-700 text-white transition-colors flex items-center gap-1.5"
                  >
                    {testing ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                    {testing ? 'Testing...' : 'Test'}
                  </button>
                </div>
                {testResult && (
                  <div
                    className={`text-sm p-3 rounded-lg ${
                      testResult.ok
                        ? 'bg-green-900/30 text-green-400 border border-green-800'
                        : 'bg-red-900/30 text-red-400 border border-red-800'
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
          <div className="max-w-2xl space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Blender Connection</h3>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border-custom space-y-4">
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
                  className="w-24"
                />
                <button
                  onClick={handleToggleBlender}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    blenderConnected
                      ? 'bg-red-800 hover:bg-red-700 text-white'
                      : 'bg-accent hover:bg-accent-hover text-white'
                  }`}
                >
                  {blenderConnected ? <WifiOff size={14} /> : <Wifi size={14} />}
                  {blenderConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    blenderConnected ? 'bg-success' : 'bg-error'
                  }`}
                />
                <span className="text-text-secondary">
                  {blenderConnected ? 'Connected to Blender' : 'Not connected'}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'model' && (
          <div className="max-w-2xl space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Model Settings</h3>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border-custom space-y-4">
              <div className="flex gap-4">
                <InputField
                  label="Temperature"
                  value={String(localSettings.temperature)}
                  onChange={(v) => setLocalSettings({ ...localSettings, temperature: parseFloat(v) || 0.3 })}
                  className="w-24"
                />
                <InputField
                  label="Max Tokens"
                  value={String(localSettings.max_tokens)}
                  onChange={(v) => setLocalSettings({ ...localSettings, max_tokens: parseInt(v) || 8192 })}
                  className="w-28"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">System Prompt</label>
                <textarea
                  value={localSettings.system_prompt}
                  onChange={(e) => setLocalSettings({ ...localSettings, system_prompt: e.target.value })}
                  rows={12}
                  className="w-full bg-bg-primary text-text-primary rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-y border border-border-custom"
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
      <label className="block text-xs text-text-muted mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-bg-primary text-text-primary rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent border border-border-custom transition-colors ${
            icon ? 'pl-8 pr-3' : 'px-3'
          }`}
        />
      </div>
    </div>
  );
}
