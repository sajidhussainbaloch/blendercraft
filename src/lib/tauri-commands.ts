import { invoke } from '@tauri-apps/api/core';
import type { AppSettings, AiProvider, ChatMessage } from './types';

export async function getSettings(): Promise<AppSettings> {
  return invoke('get_settings');
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return invoke('save_settings', { settings });
}

export async function addProvider(provider: AiProvider): Promise<AppSettings> {
  return invoke('add_provider', { provider });
}

export async function updateProvider(provider: AiProvider): Promise<AppSettings> {
  return invoke('update_provider', { provider });
}

export async function deleteProvider(providerId: string): Promise<AppSettings> {
  return invoke('delete_provider', { providerId });
}

export async function setActiveProvider(providerId: string): Promise<AppSettings> {
  return invoke('set_active_provider', { providerId });
}

export async function testProvider(provider: AiProvider): Promise<string> {
  return invoke('test_provider', { provider });
}

export async function fetchModels(provider: AiProvider): Promise<string[]> {
  return invoke('fetch_models', { provider });
}

export async function connectBlender(): Promise<string> {
  return invoke('connect_blender');
}

export async function disconnectBlender(): Promise<string> {
  return invoke('disconnect_blender');
}

export async function isBlenderConnected(): Promise<boolean> {
  return invoke('is_blender_connected');
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  return invoke('send_chat_message', { messages });
}

export async function executeBlenderCode(code: string): Promise<Record<string, unknown>> {
  return invoke('execute_blender_code', { code });
}

export async function getBlenderScene(): Promise<Record<string, unknown>> {
  return invoke('get_blender_scene');
}

export async function takeBlenderScreenshot(maxSize?: number): Promise<Record<string, unknown>> {
  return invoke('take_blender_screenshot', { maxSize: maxSize ?? 800 });
}

export async function pingBlender(): Promise<Record<string, unknown>> {
  return invoke('ping_blender');
}

export async function undoBlender(): Promise<Record<string, unknown>> {
  return invoke('undo_blender');
}

export async function getSceneContext(): Promise<string> {
  return invoke('get_scene_context');
}

export async function runAgentTask(request: string): Promise<string> {
  return invoke('run_agent_task', { request });
}

export async function cancelAgentTask(): Promise<void> {
  return invoke('cancel_agent_task');
}

export async function getAgentEvents(): Promise<AgentEvent[]> {
  return invoke('get_agent_events');
}

export interface AgentEvent {
  type: string;
  task_id?: string;
  user_request?: string;
  call_id?: string;
  tool_name?: string;
  arguments?: Record<string, unknown>;
  status?: string;
  message?: string;
  image?: string;
  step?: number;
  total?: number;
  description?: string;
  summary?: string;
  recoverable?: boolean;
  reason?: string;
}
