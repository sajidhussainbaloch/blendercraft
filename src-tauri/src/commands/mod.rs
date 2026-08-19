use crate::ai::AiClient;
use crate::blender::BlenderClient;
use crate::config::{AppSettings, AiProvider, ChatMessage};
use serde_json::Value;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub settings: Mutex<AppSettings>,
    pub blender: BlenderClient,
    pub ai: AiClient,
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    Ok(settings.clone())
}

#[tauri::command]
pub async fn save_settings(state: State<'_, AppState>, settings: AppSettings) -> Result<(), String> {
    let mut current = state.settings.lock().map_err(|e| e.to_string())?;
    *current = settings;
    Ok(())
}

#[tauri::command]
pub async fn add_provider(state: State<'_, AppState>, provider: AiProvider) -> Result<AppSettings, String> {
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    settings.providers.push(provider);
    Ok(settings.clone())
}

#[tauri::command]
pub async fn update_provider(state: State<'_, AppState>, provider: AiProvider) -> Result<AppSettings, String> {
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    if let Some(p) = settings.providers.iter_mut().find(|p| p.id == provider.id) {
        *p = provider;
    }
    Ok(settings.clone())
}

#[tauri::command]
pub async fn delete_provider(state: State<'_, AppState>, provider_id: String) -> Result<AppSettings, String> {
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    settings.providers.retain(|p| p.id != provider_id);
    Ok(settings.clone())
}

#[tauri::command]
pub async fn set_active_provider(state: State<'_, AppState>, provider_id: String) -> Result<AppSettings, String> {
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    settings.active_provider_id = provider_id;
    Ok(settings.clone())
}

#[tauri::command]
pub async fn test_provider(state: State<'_, AppState>, provider: AiProvider) -> Result<String, String> {
    state.ai.test_connection(&provider).await
}

#[tauri::command]
pub async fn fetch_models(state: State<'_, AppState>, provider: AiProvider) -> Result<Vec<String>, String> {
    state.ai.fetch_models(&provider).await
}

#[tauri::command]
pub async fn connect_blender(state: State<'_, AppState>) -> Result<String, String> {
    state.blender.connect()?;
    Ok("Connected to Blender".into())
}

#[tauri::command]
pub async fn disconnect_blender(state: State<'_, AppState>) -> Result<String, String> {
    state.blender.disconnect();
    Ok("Disconnected from Blender".into())
}

#[tauri::command]
pub async fn is_blender_connected(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.blender.is_connected())
}

#[tauri::command]
pub async fn send_chat_message(
    state: State<'_, AppState>,
    messages: Vec<ChatMessage>,
) -> Result<String, String> {
    let (provider, temperature, max_tokens) = {
        let settings = state.settings.lock().map_err(|e| e.to_string())?;
        let provider = settings
            .providers
            .iter()
            .find(|p| p.id == settings.active_provider_id)
            .ok_or("No active provider selected")?
            .clone();
        let temperature = settings.temperature;
        let max_tokens = settings.max_tokens;
        (provider, temperature, max_tokens)
    };

    state
        .ai
        .send_chat(&provider, messages, temperature, max_tokens)
        .await
}

#[tauri::command]
pub async fn execute_blender_code(
    state: State<'_, AppState>,
    code: String,
) -> Result<Value, String> {
    let response = state.blender.execute_code(&code)?;
    serde_json::to_value(response).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_blender_scene(state: State<'_, AppState>) -> Result<Value, String> {
    let response = state.blender.get_scene_info()?;
    serde_json::to_value(response).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn take_blender_screenshot(
    state: State<'_, AppState>,
    max_size: u32,
) -> Result<Value, String> {
    let response = state.blender.take_screenshot(max_size)?;
    serde_json::to_value(response).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn ping_blender(state: State<'_, AppState>) -> Result<Value, String> {
    let response = state.blender.ping()?;
    serde_json::to_value(response).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn undo_blender(state: State<'_, AppState>) -> Result<Value, String> {
    let response = state.blender.undo()?;
    serde_json::to_value(response).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_scene_context(state: State<'_, AppState>) -> Result<String, String> {
    let response = state.blender.get_scene_info()?;
    if response.status == "success" {
        if let Some(result) = &response.result {
            if let Some(objects) = result.get("objects") {
                if let Some(arr) = objects.as_array() {
                    let mut lines = vec![];
                    for obj in arr {
                        let name = obj.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                        let obj_type = obj.get("type").and_then(|v| v.as_str()).unwrap_or("?");
                        lines.push(format!("- {} ({})", name, obj_type));
                    }
                    let camera = result.get("camera").and_then(|v| v.as_str()).unwrap_or("none");
                    let engine = result.get("render_engine").and_then(|v| v.as_str()).unwrap_or("unknown");
                    let header = format!(
                        "Objects ({}):\n{}\nCamera: {}\nRender Engine: {}",
                        lines.len(),
                        lines.join("\n"),
                        camera,
                        engine
                    );
                    return Ok(header);
                }
            }
        }
    }
    Ok("Scene info unavailable".into())
}
