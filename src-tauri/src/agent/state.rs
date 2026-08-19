use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentState {
    Idle,
    Planning,
    ExecutingTool { call_id: String, tool_name: String },
    Verifying,
    WaitingForInput,
    Error { message: String },
    Completed,
    Cancelled,
}

impl AgentState {
    pub fn is_busy(&self) -> bool {
        !matches!(self, AgentState::Idle | AgentState::Completed | AgentState::Cancelled)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskContext {
    pub task_id: String,
    pub user_request: String,
    pub state: AgentState,
    pub steps: Vec<TaskStep>,
    pub current_step: usize,
    pub max_iterations: u32,
    pub current_iteration: u32,
    pub conversation: Vec<ConversationEntry>,
    pub abort: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStep {
    pub description: String,
    pub status: StepStatus,
    pub tool_call_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StepStatus {
    Pending,
    InProgress,
    Completed,
    Failed { reason: String },
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationEntry {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<super::tools::ToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

impl TaskContext {
    pub fn new(user_request: String, max_iterations: u32) -> Self {
        Self {
            task_id: format!("task_{}", chrono_timestamp()),
            user_request,
            state: AgentState::Idle,
            steps: Vec::new(),
            current_step: 0,
            max_iterations,
            current_iteration: 0,
            conversation: Vec::new(),
            abort: false,
        }
    }

    pub fn add_step(&mut self, description: &str) {
        self.steps.push(TaskStep {
            description: description.to_string(),
            status: StepStatus::Pending,
            tool_call_id: None,
        });
    }

    pub fn start_step(&mut self, index: usize, call_id: &str) {
        if let Some(step) = self.steps.get_mut(index) {
            step.status = StepStatus::InProgress;
            step.tool_call_id = Some(call_id.to_string());
        }
    }

    pub fn complete_step(&mut self, index: usize) {
        if let Some(step) = self.steps.get_mut(index) {
            step.status = StepStatus::Completed;
        }
    }

    pub fn fail_step(&mut self, index: usize, reason: &str) {
        if let Some(step) = self.steps.get_mut(index) {
            step.status = StepStatus::Failed {
                reason: reason.to_string(),
            };
        }
    }
}

fn chrono_timestamp() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
