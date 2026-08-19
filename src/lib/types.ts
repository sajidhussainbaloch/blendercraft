export interface AiProvider {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  model_id: string;
  is_active: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AppSettings {
  providers: AiProvider[];
  active_provider_id: string;
  blender_host: string;
  blender_port: number;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  stream: boolean;
}

export interface BlenderCommand {
  type: string;
  params: Record<string, unknown>;
}

export interface BlenderResponse {
  status: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface ChatMessageUI {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  screenshot?: string;
  timestamp: number;
  isLoading?: boolean;
  error?: boolean;
  executedCode?: string;
}

export interface SceneObject {
  name: string;
  type: string;
  location: [number, number, number];
  visible: boolean;
}

export interface SceneInfo {
  objects: SceneObject[];
  camera: string | null;
  lights: string[];
  render_engine: string;
}

export interface PromptPreset {
  id: string;
  name: string;
  icon: string;
  prompt: string;
  category: string;
}
