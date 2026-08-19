use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AgentEvent {
    TaskStarted {
        task_id: String,
        user_request: String,
    },
    Planning {
        task_id: String,
    },
    Thinking {
        task_id: String,
    },
    ToolCall {
        task_id: String,
        call_id: String,
        tool_name: String,
        arguments: serde_json::Value,
    },
    ToolResult {
        task_id: String,
        call_id: String,
        status: String,
        message: String,
    },
    SceneUpdated {
        task_id: String,
    },
    ScreenshotReady {
        task_id: String,
        image: String,
    },
    Progress {
        task_id: String,
        step: usize,
        total: usize,
        description: String,
    },
    Warning {
        task_id: String,
        message: String,
    },
    Error {
        task_id: String,
        message: String,
        recoverable: bool,
    },
    VerificationStarted {
        task_id: String,
    },
    VerificationPassed {
        task_id: String,
    },
    VerificationFailed {
        task_id: String,
        reason: String,
    },
    Completed {
        task_id: String,
        summary: String,
    },
    Cancelled {
        task_id: String,
    },
}
