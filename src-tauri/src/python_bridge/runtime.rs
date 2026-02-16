use std::io::Write;
use std::process::{Child, Command, Stdio};
use std::time::Duration;

/// Validates that the Python environment is available.
pub fn initialize() -> Result<(), String> {
    let output = Command::new("python3")
        .arg("--version")
        .output()
        .map_err(|e| format!("Python3 not found: {}", e))?;

    if !output.status.success() {
        return Err("Python3 check failed".to_string());
    }

    Ok(())
}

/// Spawns the Python agent process.
pub fn start_agent() -> Result<Child, String> {
    let child = Command::new("python3")
        .arg("-m")
        .arg("agents.orchestrator.main")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Python agent: {}", e))?;

    Ok(child)
}

/// Gracefully stops the Python agent process.
pub fn stop_agent(child: &mut Child) -> Result<(), String> {
    // Try to send shutdown command
    if let Some(ref mut stdin) = child.stdin {
        let cmd = serde_json::json!({"command": "shutdown"});
        let _ = writeln!(stdin, "{}", cmd);
    }

    // Wait up to 5 seconds for graceful exit
    match child.try_wait() {
        Ok(Some(_)) => return Ok(()),
        Ok(None) => {}
        Err(_) => {}
    }

    std::thread::sleep(Duration::from_secs(5));

    match child.try_wait() {
        Ok(Some(_)) => Ok(()),
        _ => {
            child
                .kill()
                .map_err(|e| format!("Failed to kill Python process: {}", e))?;
            Ok(())
        }
    }
}
