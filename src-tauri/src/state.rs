use std::process::Child;
use std::sync::Mutex;

pub struct AppState {
    pub python_process: Mutex<Option<Child>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            python_process: Mutex::new(None),
        }
    }
}
