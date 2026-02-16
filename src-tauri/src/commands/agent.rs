use std::io::{BufRead, BufReader, Write};
use tauri::{AppHandle, Emitter, State};

use crate::python_bridge;
use crate::state::AppState;

#[tauri::command]
pub async fn send_message(
    message: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    let mut process_guard = state
        .python_process
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    // Ensure the Python process is running
    if process_guard.is_none() {
        let child = python_bridge::start_agent()
            .map_err(|e| format!("Failed to start agent: {}", e))?;
        *process_guard = Some(child);
    }

    let child = process_guard.as_mut().ok_or("No Python process")?;

    // Write the command to stdin
    let command = serde_json::json!({
        "command": "process_message",
        "message": message,
    });
    let stdin = child.stdin.as_mut().ok_or("No stdin")?;
    writeln!(stdin, "{}", command).map_err(|e| format!("Failed to write to stdin: {}", e))?;

    // Take stdout for reading in a background thread
    let stdout = child.stdout.take().ok_or("No stdout available")?;

    // Spawn a thread to read the Python process output
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            let line = match line {
                Ok(l) => l,
                Err(_) => break,
            };
            if line.is_empty() {
                continue;
            }
            let json: serde_json::Value = match serde_json::from_str(&line) {
                Ok(v) => v,
                Err(_) => continue,
            };

            let msg_type = json["type"].as_str().unwrap_or("");
            match msg_type {
                "text_chunk" => {
                    let _ = app.emit("agent-text-chunk", &json);
                }
                "tool_start" => {
                    let _ = app.emit("agent-tool-execution", &json);
                }
                "tool_complete" => {
                    let _ = app.emit("agent-tool-execution", &json);
                }
                "status" => {
                    let _ = app.emit("agent-status", "thinking");
                }
                "done" => {
                    let _ = app.emit("agent-done", &json);
                    let _ = app.emit("agent-status", "idle");
                    break;
                }
                "error" => {
                    let _ = app.emit(
                        "agent-error",
                        serde_json::json!({
                            "message": json["content"].as_str().unwrap_or("Unknown error")
                        }),
                    );
                    let _ = app.emit("agent-status", "error");
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn get_status(state: State<'_, AppState>) -> Result<String, String> {
    let process_guard = state
        .python_process
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    match &*process_guard {
        Some(_) => Ok("ready".to_string()),
        None => Ok("stopped".to_string()),
    }
}
