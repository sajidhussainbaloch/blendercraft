use crate::config::{BlenderCommand, BlenderResponse};
use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;
use std::sync::{Arc, Mutex};

pub struct BlenderClient {
    host: String,
    port: u16,
    stream: Arc<Mutex<Option<TcpStream>>>,
}

impl BlenderClient {
    pub fn new(host: &str, port: u16) -> Self {
        Self {
            host: host.to_string(),
            port,
            stream: Arc::new(Mutex::new(None)),
        }
    }

    pub fn connect(&self) -> Result<(), String> {
        let addr = format!("{}:{}", self.host, self.port);
        let stream = TcpStream::connect(&addr)
            .map_err(|e| format!("Failed to connect to Blender at {addr}: {e}"))?;
        stream
            .set_read_timeout(Some(std::time::Duration::from_secs(120)))
            .ok();
        let mut guard = self.stream.lock().map_err(|e| e.to_string())?;
        *guard = Some(stream);
        Ok(())
    }

    pub fn disconnect(&self) {
        if let Ok(mut guard) = self.stream.lock() {
            *guard = None;
        }
    }

    pub fn is_connected(&self) -> bool {
        self.stream
            .lock()
            .map(|guard| guard.is_some())
            .unwrap_or(false)
    }

    pub fn send_command(&self, command: &BlenderCommand) -> Result<BlenderResponse, String> {
        let mut guard = self.stream.lock().map_err(|e| e.to_string())?;
        let stream = guard
            .as_mut()
            .ok_or_else(|| "Not connected to Blender".to_string())?;

        let json = serde_json::to_string(command).map_err(|e| format!("JSON error: {e}"))?;
        stream
            .write_all(format!("{json}\n").as_bytes())
            .map_err(|e| format!("Send error: {e}"))?;
        stream.flush().map_err(|e| format!("Flush error: {e}"))?;

        let reader_stream = stream.try_clone().map_err(|e| format!("Clone error: {e}"))?;
        let mut reader = BufReader::new(reader_stream);
        let mut response_line = String::new();
        reader
            .read_line(&mut response_line)
            .map_err(|e| format!("Read error: {e}"))?;

        let response: BlenderResponse = serde_json::from_str(response_line.trim())
            .map_err(|e| format!("Response parse error: {e}"))?;
        Ok(response)
    }

    pub fn execute_code(&self, code: &str) -> Result<BlenderResponse, String> {
        let command = BlenderCommand {
            cmd_type: "execute_code".into(),
            params: serde_json::json!({ "code": code }),
        };
        self.send_command(&command)
    }

    pub fn get_scene_info(&self) -> Result<BlenderResponse, String> {
        let command = BlenderCommand {
            cmd_type: "get_scene_info".into(),
            params: serde_json::json!({}),
        };
        self.send_command(&command)
    }

    pub fn take_screenshot(&self, max_size: u32) -> Result<BlenderResponse, String> {
        let command = BlenderCommand {
            cmd_type: "screenshot".into(),
            params: serde_json::json!({ "max_size": max_size }),
        };
        self.send_command(&command)
    }

    pub fn ping(&self) -> Result<BlenderResponse, String> {
        let command = BlenderCommand {
            cmd_type: "ping".into(),
            params: serde_json::json!({}),
        };
        self.send_command(&command)
    }

    pub fn undo(&self) -> Result<BlenderResponse, String> {
        let command = BlenderCommand {
            cmd_type: "execute_code".into(),
            params: serde_json::json!({ "code": "import bpy\nbpy.ops.ed.undo()" }),
        };
        self.send_command(&command)
    }
}
