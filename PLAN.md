# BlenderCraft: Master Engineering, UI, Agent Engine and MCP Refactoring Plan

## ROLE

Act as a senior software architect, Rust/Tauri engineer, React/TypeScript engineer, AI-agent engineer, MCP engineer, and Blender automation engineer.

You are modifying an **existing real project**, not creating a toy demo.

Repository:

`https://github.com/sajidhussainbaloch/blendercraft`

Project name:

**BlenderCraft**

BlenderCraft is intended to become a professional desktop AI application that allows a user to control Blender using natural language.

The project already contains useful work in:

* React + TypeScript frontend
* Vite
* Tauri
* Rust backend
* Blender Python add-on
* Blender communication layer
* AI provider configuration
* Chat interface
* Scene interaction
* Blender execution
* Screenshots
* Scene information
* Settings
* Undo
* AI-generated Blender operations

DO NOT discard the existing project merely because the architecture is currently incomplete.

Your responsibility is to **inspect, repair, refactor, and substantially improve the existing codebase while preserving useful functionality**.

---

# 1. PRIMARY OBJECTIVE

Transform BlenderCraft from its current prototype architecture into a reliable, professional, agent-driven Blender application.

The final product must behave like:

```text
User
  ↓
BlenderCraft UI
  ↓
AI Agent Engine
  ↓
Planning / Reasoning
  ↓
Tool Selection
  ↓
MCP / Blender Tool Layer
  ↓
Blender
  ↓
Tool Result
  ↓
Agent Verification
  ↓
Additional Tool Calls if needed
  ↓
Completed Scene
  ↓
UI updates automatically
```

The system must NOT primarily behave like:

```text
User
  ↓
LLM
  ↓
Generate arbitrary bpy Python
  ↓
Search response for "bpy"
  ↓
Execute entire response
```

That architecture is too fragile.

---

# 2. FIRST TASK: FULL REPOSITORY AUDIT

Before changing code, inspect the entire repository.

Do not assume that existing files are correct.

Read and understand:

```text
src/
src-tauri/
blendercraft-addon/
public/
package.json
Cargo.toml
README.md
configuration files
logging files
build configuration
```

Inspect:

* React component architecture
* application state
* routing/navigation
* frontend API calls
* Tauri commands
* Rust modules
* AI provider implementation
* Blender communication
* Blender add-on networking
* command execution
* scene information retrieval
* screenshots
* settings
* error handling
* asynchronous operations
* event handling
* startup/shutdown logic
* loading states
* asset loading
* CSS/layout
* build configuration

Create an internal dependency map before modifying anything.

Identify:

1. what currently works
2. what partially works
3. what does not work
4. what fails silently
5. what is loading incorrectly
6. what is incorrectly connected
7. duplicated functionality
8. architectural bottlenecks
9. unsafe assumptions
10. dead code
11. prototype code that must become production code

DO NOT rewrite components blindly.

---

# 3. IMPORTANT: PRESERVE EXISTING FUNCTIONALITY

The existing application already has intended features.

Do not remove them simply because you redesign the architecture.

Preserve and improve:

* Chat
* AI providers
* model configuration
* Blender connection
* connection status
* scene information
* screenshots
* code execution
* undo
* settings
* prompts
* quick actions
* scene creation
* Blender add-on functionality
* existing configuration options

If a feature is currently implemented poorly, repair it rather than deleting it.

If a feature is replaced by a better implementation, retain equivalent or better functionality.

---

# 4. FIX THE CURRENT LOADING / STARTUP PROBLEMS FIRST

The screenshot indicates that the application is rendering a minimal empty-state UI but important application functionality is not appearing/loading correctly.

Treat this as a real application initialization problem, not merely a CSS issue.

Investigate:

* React mount lifecycle
* Tauri initialization
* asset paths
* CSS loading
* icon loading
* component registration
* state initialization
* asynchronous initialization
* provider initialization
* Blender connection initialization
* IPC initialization
* event listeners
* failed Tauri commands
* Rust panic/error handling
* promises that never resolve
* components that render only under incorrect state conditions
* invalid paths
* missing static assets
* incorrect Vite base configuration
* development vs production path differences
* Windows path handling
* resource loading
* loading race conditions

The application must start into a complete, stable application shell.

Never leave the user looking at an apparently empty/broken screen because initialization failed.

Every asynchronous startup operation must have:

```text
loading
success
failure
retry
```

states where appropriate.

Errors must be visible and actionable.

---

# 5. REDESIGN THE UI

The current UI should be treated as a prototype.

Do not simply change colors or spacing.

Build a professional desktop application interface.

Target layout:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ BlenderCraft   ● Blender Connected     Model     Settings     Help   │
├────────────┬──────────────────────────────────────────────┬──────────┤
│            │                                              │          │
│ Navigation │              Agent / Conversation            │  Scene   │
│            │                                              │ Inspector│
│ Chat       │ User: Create a modern office desk            │          │
│ Scene      │                                              │ Objects  │
│ Assets     │ AI: Planning scene...                        │ Materials│
│ Tools      │                                              │ Camera   │
│ Render     │ ✓ Scene inspected                            │ Lights   │
│ History    │ ✓ Desk created                               │          │
│ Settings   │ ● Creating materials                         │          │
│            │                                              │          │
│            │             Progress / Results               │          │
│            │                                              │          │
├────────────┴──────────────────────────────────────────────┴──────────┤
│ Ask BlenderCraft...                                   Attach  [Run] │
└──────────────────────────────────────────────────────────────────────┘
```

The UI must feel like a serious desktop engineering/creative application.

Use:

* clean hierarchy
* professional typography
* proper spacing
* resizable panels
* responsive layout
* keyboard shortcuts
* clear active navigation
* tooltips
* status indicators
* proper empty states
* skeleton/loading states
* error states
* success states
* progress states
* accessible controls

Do not create a web-page-looking dashboard.

BlenderCraft should feel like a desktop application.

---

# 6. UI MUST SHOW AGENT ACTIVITY

The user must be able to understand what the AI is actually doing.

For example:

```text
Task: Create a modern office desk

✓ Understanding request
✓ Inspecting Blender scene
✓ Planning scene
✓ Creating desk
✓ Creating monitor
● Creating materials
○ Configuring camera
○ Rendering
```

Each step should be represented as an event from the backend.

Do not fake progress with timers.

The UI must display real agent events.

---

# 7. CREATE A REAL AGENT ENGINE

This is the most important architectural change.

Create a dedicated Rust agent engine.

Suggested structure:

```text
src-tauri/src/agent/
  agent.rs
  loop.rs
  planner.rs
  state.rs
  memory.rs
  events.rs
  errors.rs
  verification.rs
  tool_registry.rs
  tool_executor.rs
```

Possible architecture:

```text
AgentEngine
   |
   +-- ModelProvider
   |
   +-- Planner
   |
   +-- ToolRegistry
   |
   +-- ToolExecutor
   |
   +-- SceneState
   |
   +-- Memory
   |
   +-- Verifier
   |
   +-- Recovery
```

The agent should support iterative execution.

---

# 8. IMPLEMENT AN ACTUAL AGENT LOOP

Implement a tool-calling loop equivalent to:

```text
receive user request
→ inspect current scene
→ reason about task
→ create execution plan
→ select appropriate tools
→ call tool
→ receive structured result
→ update scene state
→ evaluate result
→ continue
→ verify task
→ finish
```

The agent must be capable of multiple tool calls in a single user request.

Example:

User: "Create a modern office desk with a monitor, keyboard and lamp."

Agent:

```text
get_scene
create_object desk
create_object monitor
create_object keyboard
create_object lamp
create_material wood
assign_material
create_camera
create_light
render
screenshot
verify
```

The agent must not try to do everything using one giant Python response.

---

# 9. IMPLEMENT STRUCTURED TOOL CALLS

Define an internal tool abstraction.

```rust
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}
```

And:

```rust
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
}
```

Tool results must be structured.

Example success:

```json
{
  "status": "success",
  "operation_id": "op_123",
  "created_objects": ["Desk"],
  "modified_objects": [],
  "deleted_objects": [],
  "warnings": [],
  "message": "Desk created successfully"
}
```

Example error:

```json
{
  "status": "error",
  "operation_id": "op_123",
  "error_type": "BLENDER_API_ERROR",
  "message": "...",
  "details": "...",
  "recoverable": true
}
```

---

# 10. CREATE A BLENDER TOOL REGISTRY

Expose semantic Blender operations.

At minimum create tools:

```text
blender.get_scene
blender.get_object
blender.get_objects
blender.create_object
blender.delete_object
blender.rename_object
blender.transform_object
blender.duplicate_object
blender.create_material
blender.assign_material
blender.modify_material
blender.create_camera
blender.set_camera
blender.create_light
blender.modify_light
blender.set_world
blender.set_render_settings
blender.render
blender.screenshot
blender.frame_object
blender.select_object
blender.execute_python
```

Keep `execute_python` as an advanced fallback.

It must NOT be the primary tool.

---

# 11. MCP ARCHITECTURE

Implement real MCP-compatible tool handling where practical.

If the existing Blender communication layer is retained internally, create a proper abstraction:

```text
Agent
 ↓
Tool Registry
 ↓
MCP Client / Blender Adapter
 ↓
Blender Add-on
 ↓
Blender bpy
```

The tool abstraction should allow BlenderCraft to use either:

```text
MCP tools
```

or:

```text
native Blender adapter
```

without changing the agent engine.

This separation is important.

The project should be capable of integrating standard Blender MCP servers in the future.

---

# 12. KEEP THE EXISTING BLENDER ADD-ON WHERE USEFUL

Do not immediately delete the current BlenderCraft add-on.

Audit it.

Preserve useful functionality such as:

* connection
* command receiving
* Python execution
* scene querying
* screenshots
* health checking

Improve it where necessary.

Make communication:

* reliable
* asynchronous where appropriate
* structured
* version-aware
* error-aware
* reconnectable

Implement:

```text
connect
disconnect
reconnect
ping
health
version
capabilities
```

---

# 13. IMPLEMENT SCENE STATE

Create a structured representation of Blender state.

Example:

```json
{
  "scene": {
    "name": "Scene",
    "render_engine": "BLENDER_EEVEE_NEXT",
    "camera": "Camera"
  },
  "objects": [
    {
      "name": "Desk",
      "type": "MESH",
      "location": [0, 0, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "materials": ["Wood"]
    }
  ],
  "lights": [],
  "collections": [],
  "active_object": null
}
```

The scene state should be refreshable.

Do not make the agent rely on stale text.

---

# 14. IMPLEMENT SCENE DIFFS

When a tool changes Blender, try to report:

```text
created
modified
deleted
```

Example:

```json
{
  "created": ["Desk", "Monitor"],
  "modified": ["Camera"],
  "deleted": []
}
```

This can be used by the UI to update the scene inspector without unnecessary full refreshes.

---

# 15. IMPLEMENT VERIFICATION

After important operations, the agent should verify the result.

For example:

```text
create_object
    ↓
get_object
    ↓
verify transform
```

For a rendered scene:

```text
render
    ↓
screenshot
    ↓
inspect result
    ↓
fix if necessary
```

Do not claim success just because Blender accepted a command.

Success means the intended result exists.

---

# 16. IMPLEMENT ERROR RECOVERY

Blender operations frequently fail because of:

* API changes between Blender versions
* invalid object names
* incorrect data-block references
* missing materials
* incorrect node names
* context restrictions
* wrong object mode
* missing camera
* deleted objects
* unsupported parameters

When a tool fails:

```text
receive error
 ↓
classify error
 ↓
determine whether recoverable
 ↓
modify plan
 ↓
retry
```

Do not endlessly retry identical commands.

Use a retry limit.

---

# 17. USE MODEL TOOL CALLING PROPERLY

Do not depend on:

```text
if response.includes("bpy")
```

Do not parse the entire assistant response looking for Python.

The model should produce structured tool calls.

The system should support:

```text
assistant message
tool call
tool result
assistant continuation
```

Maintain a proper conversation/tool history.

---

# 18. MODEL PROVIDER ARCHITECTURE

Keep provider abstraction.

The engine should not depend on one model.

Support a provider interface such as:

```text
OpenAI-compatible
OpenRouter-compatible
Ollama
local models
future providers
```

The provider layer should support:

```text
normal text generation
tool calling
streaming
structured output
errors
timeouts
cancellation
```

Do not assume every provider supports every capability.

Detect capabilities.

---

# 19. STREAMING

The UI should not wait for an entire task to finish before updating.

Stream:

```text
assistant text
agent status
tool calls
tool results
progress
errors
completion
```

Use Tauri events or another clean IPC mechanism.

---

# 20. DEFINE AGENT EVENTS

Create an event model.

```rust
pub enum AgentEvent {
    TaskStarted,
    Planning,
    Thinking,
    ToolCall {
        id: String,
        name: String,
        arguments: serde_json::Value,
    },
    ToolResult {
        id: String,
        status: String,
        result: serde_json::Value,
    },
    SceneUpdated,
    ScreenshotReady,
    Warning(String),
    Error(String),
    VerificationStarted,
    VerificationPassed,
    Completed,
}
```

The React UI consumes these events.

This becomes the backbone of the application.

---

# 21. CHAT UI ARCHITECTURE

The React frontend should NOT contain business logic such as:

```text
detect bpy
execute Blender
decide whether a response is code
```

Move these responsibilities to Rust.

React should primarily:

```text
display
send user requests
display agent events
display scene state
display errors
manage interaction
```

---

# 22. CREATE A REAL TASK VIEW

Each user request should become a task.

Example:

```text
Task #42
Create a modern office desk

Status: Completed

Plan
✓ Inspect scene
✓ Create desk
✓ Create monitor
✓ Create keyboard
✓ Create lamp
✓ Materials
✓ Lighting
✓ Camera
✓ Render
✓ Verification
```

Users should be able to see what happened.

---

# 23. ADD STOP / CANCEL

The user must be able to stop an agent task.

```text
[ Stop Task ]
```

Cancellation must propagate:

```text
React
 ↓
Tauri
 ↓
Agent
 ↓
Current tool
```

Do not merely hide the UI.

---

# 24. ADD RETRY

If a task fails:

```text
Task failed

[Retry]
[Retry from failed step]
[Cancel]
```

The agent should preserve useful state.

---

# 25. ADD CONNECTION STATUS

Top-level application status:

```text
● Blender Connected
● AI Connected
● MCP Ready
```

or:

```text
○ Blender Disconnected
⚠ AI Provider Error
○ MCP Not Available
```

Each status should be real.

Do not use fake green indicators.

---

# 26. SETTINGS

Preserve existing settings but redesign them.

Settings should contain:

```text
AI Provider
Model
API Key
Endpoint
Temperature
Maximum tokens
Tool calling mode

Blender
Blender connection
Host
Port
Auto reconnect

Agent
Maximum iterations
Timeout
Automatic verification
Automatic retry
Safety level

UI
Theme
Panel sizes
Font size
Notifications
```

Never expose API keys unnecessarily in logs.

---

# 27. LOGGING

Create proper structured logs.

Separate:

```text
UI
Agent
AI
MCP
Blender
Tool
Error
```

Example:

```text
[AGENT] Task started
[AI] Tool call requested: blender.create_object
[TOOL] Executing create_object
[BLENDER] Object created: Desk
[VERIFY] Object exists
[AGENT] Step completed
```

The existing `app_log.txt` should be investigated and used to identify current runtime problems where applicable.

---

# 28. WINDOWS SUPPORT

The primary development environment is Windows.

Pay special attention to:

* Tauri Windows paths
* executable discovery
* Blender executable path
* Python/add-on paths
* TCP sockets
* process spawning
* environment variables
* file permissions
* Windows firewall
* resource directories
* production build paths

Do not assume Unix paths.

---

# 29. BLENDER VERSION HANDLING

Do not hard-code assumptions where avoidable.

The Blender add-on should report:

```text
Blender version
addon version
protocol version
supported capabilities
```

The backend should know whether the current Blender version is compatible.

---

# 30. SECURITY AND SAFETY

Because the application can execute Blender Python, treat tool execution as a privileged operation.

Implement at least:

* explicit execution boundary
* logging
* timeouts
* cancellation
* size limits
* malformed-request handling
* structured errors
* no accidental execution of arbitrary non-tool text
* clear user visibility into significant destructive operations

Operations such as:

```text
delete all objects
overwrite scene
clear scene
save file
```

should be identifiable as destructive.

Consider confirmation settings.

---

# 31. UI DESIGN DETAILS

The redesign must specifically address the current screenshot.

Do NOT retain the current giant empty black region as the main application experience.

The home screen should have meaningful content.

For example:

```text
BlenderCraft

Create with natural language

[ Describe what you want to create... ]

Quick actions:
Create Object | Create Room | Product Render | Material Study
Furniture | Lighting | Nature | Jewelry

Recent Tasks:
...
```

But once a task starts, the UI should transition naturally into the agent workspace.

Do not make the user feel that the program is still loading indefinitely.

---

# 32. QUICK ACTIONS

Preserve the concept of:

```text
Simple Object
Room Scene
Lighting Setup
Product Render
Material Study
Furniture
Nature
Jewelry
```

But make these real task templates.

Each should populate an appropriate prompt/agent configuration instead of being decorative buttons.

---

# 33. EMPTY STATES

Every panel needs a professional empty state.

Example:

```text
No object selected

Select an object in Blender
or ask BlenderCraft to create one.
```

Not simply: "No data"

---

# 34. LOADING STATES

Use skeletons/spinners where appropriate.

Never allow:

```text
blank screen
black screen
empty panel
apparently frozen application
```

without explanation.

---

# 35. ERROR STATES

Every failure must have:

```text
What happened
Why it happened
What BlenderCraft can do
Retry
```

Example:

```text
Blender connection lost

BlenderCraft could not reach the Blender add-on.

[Reconnect]

Last successful connection: 23:04:12
```

---

# 36. PERFORMANCE

Avoid unnecessary:

* full scene reloads
* React rerenders
* repeated Blender queries
* repeated AI calls
* repeated screenshots
* blocking Rust operations

Use caching where appropriate.

Keep the UI responsive while Blender and AI operations execute asynchronously.

---

# 37. CODE QUALITY

Refactor toward clear module boundaries.

Avoid giant files.

Avoid duplicated logic.

Avoid hidden global state.

Use:

```text
typed interfaces
structured errors
clear ownership
async-safe operations
unit-testable services
```

Add comments only where architectural reasoning is not obvious.

Do not add meaningless comments.

---

# 38. TESTING

Add automated tests for:

### Rust

* agent loop
* provider parsing
* tool registry
* tool schema
* event serialization
* errors
* cancellation
* retry logic

### React

* startup
* chat rendering
* loading
* errors
* task progress
* connection state
* settings

### Blender

Create an integration test that verifies:

```text
connect
ping
get_scene
create_object
get_object
modify_object
screenshot
delete_object
```

---

# 39. END-TO-END TEST 1

The final project must be tested with:

```text
Open Blender
Enable BlenderCraft add-on
Start BlenderCraft
Connect
Enter: "Create a red coffee mug on a wooden table, add a camera and good lighting, then render it."
```

The agent should:

```text
inspect scene
plan
create table
create mug
create material
assign material
create camera
create lights
render
verify
report completion
```

The UI must show the real progress.

Do not accept a system that only generates text.

---

# 40. END-TO-END TEST 2

Existing scene modification:

```text
"Take the current scene and make the desk blue, move the monitor to the left, add a desk lamp, and render a preview."
```

The agent must inspect existing objects before modifying them.

It must not recreate the entire scene unnecessarily.

---

# 41. END-TO-END TEST 3

Error recovery:

Intentionally trigger an invalid operation.

The system must:

```text
detect failure
show failure
reason about recovery
retry corrected operation
continue task
```

---

# 42. DO NOT BREAK EXISTING FEATURES

Before changing any subsystem:

1. understand it
2. preserve useful parts
3. migrate behavior
4. test
5. remove obsolete implementation only after replacement works

Never delete working functionality merely to make the architecture simpler.

---

# 43. DO NOT BUILD A MOCK

This is extremely important.

Do not create fake:

```text
tool results
Blender connection
progress
AI responses
scene objects
MCP responses
```

Everything must be connected to the real application.

If something cannot yet be implemented, expose a clear error rather than pretending it worked.

---

# 44. NO PLACEHOLDER IMPLEMENTATIONS

Avoid:

```text
TODO
coming soon
mockTool()
fakeAgent()
setTimeout(() => ...)
hard-coded successful response
simulated tool result
```

unless it is explicitly isolated for testing.

---

# 45. DEVELOPMENT STRATEGY

Work in phases.

## Phase 1: Audit and repair

* inspect repository
* identify all current problems
* fix startup/loading
* fix compile errors
* fix runtime errors
* fix broken imports/assets
* verify Blender connection

## Phase 2: Backend architecture

* build AgentEngine
* ToolRegistry
* ToolExecutor
* AgentEvents
* SceneState
* provider abstraction

## Phase 3: Tool/MCP architecture

* create Blender tool layer
* integrate MCP-compatible architecture
* preserve current add-on functionality
* structured tool calls
* structured results

## Phase 4: Agent loop

* planner
* tool calling
* iterative reasoning
* verification
* recovery
* cancellation
* retry

## Phase 5: UI

* replace prototype layout
* implement professional workspace
* agent task view
* scene inspector
* connection indicators
* settings
* progress
* errors

## Phase 6: Testing

* build
* run
* connect to Blender
* execute real scenes
* test tool calls
* test errors
* test recovery
* test production build

---

# 46. VERY IMPORTANT: DO NOT STOP AT ANALYSIS

You are not being asked to give me recommendations only.

You are the coding agent.

You must actually modify the repository.

Do not respond: "The UI should be redesigned." Instead: modify the UI.

Do not respond: "You should implement an agent loop." Instead: implement the agent loop.

Do not merely generate a plan and stop.

Inspect → implement → compile → test → fix → repeat.

---

# 47. BUILD VALIDATION

After modifications run the appropriate checks.

Frontend:

```bash
npm install
npm run build
```

Rust:

```bash
cargo check
cargo test
```

Tauri:

```bash
cargo tauri build
```

Use the actual commands available in the repository.

Fix all compiler/build errors.

Do not declare completion with known errors.

---

# 48. RUNTIME VALIDATION

Start the application.

Verify:

```text
application launches
UI renders
assets load
navigation works
settings load
AI provider initializes
Blender connection works
MCP/tool layer works
agent starts
tool calls execute
results return
scene updates
progress updates
errors display
retry works
cancel works
```

---

# 49. FINAL APPLICATION BEHAVIOR

The finished BlenderCraft should feel like:

```text
An AI-native Blender workstation
```

not:

```text
A chat application that sometimes executes Blender Python.
```

The user should be able to say:

```text
Create a modern kitchen
```

and BlenderCraft should intelligently:

```text
understand request
inspect Blender
plan
create geometry
create materials
create lights
create camera
render
inspect
correct
finish
```

Likewise the user should be able to say:

```text
Make the current object metallic and add better lighting.
```

and the agent should modify the existing scene intelligently.

---

# 50. ARCHITECTURAL PRIORITY

When making decisions, prioritize in this order:

```text
1. Reliability
2. Correct tool execution
3. Agent reasoning
4. Blender integration
5. Error recovery
6. UI responsiveness
7. UI polish
8. Performance
9. Extensibility
```

Do not sacrifice reliability for visual effects.

---

# 51. IMPORTANT DESIGN PRINCIPLE

The AI must not be treated as a simple text generator.

Treat it as an agent operating an environment.

The environment is Blender.

The tools are the interface to Blender.

The agent must observe, act, verify, and recover.

Conceptually:

```text
OBSERVE → PLAN → ACT → OBSERVE → VERIFY → ACT AGAIN IF REQUIRED
```

This loop is the core of BlenderCraft.

---

# 52. FINAL DELIVERABLE

At the end of the implementation:

1. The existing repository must build.
2. The application must launch correctly.
3. The current loading/UI problems must be fixed.
4. The UI must be substantially improved.
5. The existing useful features must remain available.
6. A real agent engine must exist.
7. Tool calling must be structured.
8. Blender operations must be represented as tools.
9. MCP compatibility must be properly designed/implemented.
10. Blender communication must be reliable.
11. Scene state must be maintained.
12. Agent events must be visible in the UI.
13. Tool errors must be recoverable.
14. Agent tasks must support cancellation.
15. Agent tasks must support retry.
16. Real Blender end-to-end tests must pass.
17. Production build must succeed.

---

# 53. FINAL RULE

Do not optimize for "smallest code change."

Optimize for:

**the best reliable version of BlenderCraft that can be built from the existing repository without unnecessarily discarding existing work.**

Reuse good code.

Refactor bad code.

Replace fragile architecture.

Keep compatibility where practical.

Implement missing functionality.

Test everything.

Do not fake success.

When finished, provide a concise engineering report containing:

```text
What was broken
What was changed
New architecture
Files created
Files modified
Features preserved
Features added
Build result
Test result
Blender integration result
MCP/tool result
Known limitations
Next recommended improvements
```

Do not stop after writing the report. The report comes **after the implementation and testing**.
