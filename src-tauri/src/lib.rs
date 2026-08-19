mod ai;
mod blender;
mod commands;
mod config;

use commands::AppState;
use config::AppSettings;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = AppSettings::default();
    let blender_host = settings.blender_host.clone();
    let blender_port = settings.blender_port;

    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .manage(AppState {
            settings: Mutex::new(settings),
            blender: blender::BlenderClient::new(&blender_host, blender_port),
            ai: ai::AiClient::new(),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings,
            commands::add_provider,
            commands::update_provider,
            commands::delete_provider,
            commands::set_active_provider,
            commands::test_provider,
            commands::fetch_models,
            commands::connect_blender,
            commands::disconnect_blender,
            commands::is_blender_connected,
            commands::send_chat_message,
            commands::execute_blender_code,
            commands::get_blender_scene,
            commands::take_blender_screenshot,
            commands::ping_blender,
            commands::undo_blender,
            commands::get_scene_context,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
