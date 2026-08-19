use crate::config::{BlenderCommand, BlenderResponse};
use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::time::Duration;

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

    fn connect_raw(&self) -> Result<TcpStream, String> {
        let addr = format!("{}:{}", self.host, self.port);
        let stream = TcpStream::connect(&addr)
            .map_err(|e| format!("Failed to connect to Blender at {addr}: {e}"))?;
        stream
            .set_read_timeout(Some(Duration::from_secs(120)))
            .ok();
        stream
            .set_write_timeout(Some(Duration::from_secs(30)))
            .ok();
        stream.set_nodelay(true).ok();
        Ok(stream)
    }

    pub fn connect(&self) -> Result<(), String> {
        let stream = self.connect_raw()?;
        let mut guard = self.stream.lock().map_err(|e| e.to_string())?;
        *guard = Some(stream);
        Ok(())
    }

    fn ensure_connected(&self) -> Result<(), String> {
        let needs_connect = {
            let guard = self.stream.lock().map_err(|e| e.to_string())?;
            guard.is_none()
        };
        if needs_connect {
            eprintln!("[BlenderCraft] Connection lost, reconnecting...");
            self.connect()?;
        }
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
        self.ensure_connected()?;
        match self.try_send_command(command) {
            Ok(resp) => Ok(resp),
            Err(e) => {
                let is_connection_err = e.contains("forcibly closed")
                    || e.contains("10054")
                    || e.contains("Broken pipe")
                    || e.contains("connection reset")
                    || e.contains("Send error")
                    || e.contains("Read error")
                    || e.contains("Flush error");

                if is_connection_err {
                    eprintln!("[BlenderCraft] Connection error ({e}), reconnecting...");
                    self.disconnect();
                    match self.connect() {
                        Ok(()) => {
                            std::thread::sleep(Duration::from_millis(300));
                            match self.try_send_command(command) {
                                Ok(resp) => Ok(resp),
                                Err(e2) => {
                                    eprintln!("[BlenderCraft] Retry also failed ({e2}), giving up");
                                    self.disconnect();
                                    Err(e2)
                                }
                            }
                        }
                        Err(re) => {
                            eprintln!("[BlenderCraft] Reconnect failed ({re})");
                            Err(re)
                        }
                    }
                } else {
                    Err(e)
                }
            }
        }
    }

    fn try_send_command(&self, command: &BlenderCommand) -> Result<BlenderResponse, String> {
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

        let trimmed = response_line.trim();
        if trimmed.is_empty() {
            return Err("Empty response from Blender".into());
        }

        let response: BlenderResponse = serde_json::from_str(trimmed)
            .map_err(|e| format!("Response parse error: {e} (raw: {trimmed})"))?;
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
