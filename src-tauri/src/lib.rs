mod commands;
mod python_bridge;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::agent::send_message,
            commands::agent::get_status,
        ])
        .setup(|_app| {
            if let Err(e) = python_bridge::initialize() {
                eprintln!("Warning: Python initialization failed: {}", e);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running OneWork");
}
