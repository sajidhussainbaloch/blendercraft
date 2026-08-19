use crate::agent::events::AgentEvent;
use crate::agent::state::TaskContext;
use crate::agent::tools::{ToolCall, ToolRegistry, ToolResult, ToolStatus};
use crate::ai::AiClient;
use crate::blender::BlenderClient;
use crate::config::{AppSettings, ChatMessage};
use serde_json::Value;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

pub struct AgentEngine {
    pub registry: ToolRegistry,
}

impl AgentEngine {
    pub fn new() -> Self {
        Self {
            registry: ToolRegistry::new(),
        }
    }

    pub fn build_tool_schemas(&self) -> Value {
        let tools: Vec<Value> = self
            .registry
            .get_all()
            .iter()
            .map(|tool| {
                serde_json::json!({
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.input_schema
                    }
                })
            })
            .collect();
        Value::Array(tools)
    }

    pub async fn run_task(
        &self,
        user_request: &str,
        settings: &AppSettings,
        ai: &AiClient,
        blender: &BlenderClient,
        events: &Arc<Mutex<Vec<AgentEvent>>>,
        abort_flag: &Arc<Mutex<bool>>,
    ) -> Result<String, String> {
        let task_id = format!("task_{}", Uuid::new_v4().to_string()[..8].to_string());
        let max_iterations = 20;

        let mut ctx = TaskContext::new(user_request.to_string(), max_iterations);

        self.emit(events, AgentEvent::TaskStarted {
            task_id: task_id.clone(),
            user_request: user_request.to_string(),
        });

        // Get initial scene context
        let scene_context = if blender.is_connected() {
            self.emit(events, AgentEvent::Progress {
                task_id: task_id.clone(),
                step: 1,
                total: 3,
                description: "Inspecting Blender scene...".into(),
            });
            match blender.get_scene_info() {
                Ok(resp) => {
                    if resp.status == "success" {
                        serde_json::to_string_pretty(&resp.result.unwrap_or_default())
                            .unwrap_or_default()
                    } else {
                        "Scene unavailable".into()
                    }
                }
                Err(_) => "Blender not connected".into(),
            }
        } else {
            "Blender not connected".into()
        };

        // Build system message
        let tool_schemas = self.build_tool_schemas();
        let system_msg = format!(
            r#"You are BlenderCraft Agent. You control Blender through structured tool calls.

## RULES
1. ALWAYS use tool calls to interact with Blender. Do NOT write raw Python unless using blender.execute_python as a last resort.
2. Break complex tasks into multiple tool calls.
3. Verify results by calling blender.get_scene after creating objects.
4. Use blender.screenshot to show results when done.
5. Be precise with object names and properties.

## SCENE STATE
```
{}
```

## AVAILABLE TOOLS
{}
"#,
            scene_context,
            serde_json::to_string_pretty(&tool_schemas).unwrap_or_default()
        );

        ctx.conversation.push(crate::agent::state::ConversationEntry {
            role: "system".into(),
            content: system_msg,
            tool_calls: None,
            tool_call_id: None,
        });

        ctx.conversation.push(crate::agent::state::ConversationEntry {
            role: "user".into(),
            content: user_request.to_string(),
            tool_calls: None,
            tool_call_id: None,
        });

        let mut all_tool_results: Vec<ToolResult> = Vec::new();

        // Agent loop
        for iteration in 0..max_iterations {
            // Check abort
            if *abort_flag.lock().map_err(|e| e.to_string())? {
                self.emit(events, AgentEvent::Cancelled { task_id: task_id.clone() });
                return Ok("Task cancelled".into());
            }

            ctx.current_iteration = iteration;

            self.emit(events, AgentEvent::Thinking {
                task_id: task_id.clone(),
            });

            // Convert conversation to ChatMessage format
            let messages: Vec<ChatMessage> = ctx
                .conversation
                .iter()
                .filter(|e| e.role != "tool")
                .map(|e| ChatMessage {
                    role: e.role.clone(),
                    content: e.content.clone(),
                })
                .collect();

            // Call AI
            let response = ai
                .send_chat_with_tools(
                    settings,
                    messages,
                    self.build_tool_schemas(),
                )
                .await?;

            // Parse response for tool calls
            let parsed: Value = serde_json::from_str(&response)
                .map_err(|e| format!("Failed to parse AI response: {e}"))?;

            // Check for tool calls
            if let Some(tool_calls) = parsed.get("tool_calls").and_then(|v| v.as_array()) {
                if tool_calls.is_empty() {
                    // No tool calls - extract text response
                    let content = parsed
                        .get("content")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Task completed");

                    self.emit(events, AgentEvent::Completed {
                        task_id: task_id.clone(),
                        summary: content.to_string(),
                    });
                    return Ok(content.to_string());
                }

                // Execute tool calls
                for tc in tool_calls {
                    let call_id = tc.get("id").and_then(|v| v.as_str()).unwrap_or("unknown");
                    let function = tc.get("function").unwrap_or(&Value::Null);
                    let tool_name = function.get("name").and_then(|v| v.as_str()).unwrap_or("unknown");
                    let arguments = function.get("arguments")
                        .and_then(|v| v.as_str())
                        .and_then(|s| serde_json::from_str::<Value>(s).ok())
                        .unwrap_or(Value::Object(serde_json::Map::new()));

                    self.emit(events, AgentEvent::ToolCall {
                        task_id: task_id.clone(),
                        call_id: call_id.to_string(),
                        tool_name: tool_name.to_string(),
                        arguments: arguments.clone(),
                    });

                    // Execute the tool
                    let result = self
                        .execute_tool(tool_name, &arguments, blender)
                        .await;

                    let status_str = match &result.status {
                        ToolStatus::Success => "success".to_string(),
                        ToolStatus::Error => "error".to_string(),
                        ToolStatus::Partial { reason } => format!("partial: {reason}"),
                    };

                    self.emit(events, AgentEvent::ToolResult {
                        task_id: task_id.clone(),
                        call_id: call_id.to_string(),
                        status: status_str,
                        message: result.message.clone(),
                    });

                    all_tool_results.push(result.clone());

                    // Brief pause to let Blender's depsgraph process
                    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

                    // Add tool result to conversation
                    ctx.conversation.push(crate::agent::state::ConversationEntry {
                        role: "assistant".into(),
                        content: "".into(),
                        tool_calls: Some(vec![ToolCall {
                            id: call_id.to_string(),
                            name: tool_name.to_string(),
                            arguments: arguments.clone(),
                        }]),
                        tool_call_id: None,
                    });

                    ctx.conversation.push(crate::agent::state::ConversationEntry {
                        role: "tool".into(),
                        content: serde_json::to_string(&result.result).unwrap_or_default(),
                        tool_calls: None,
                        tool_call_id: Some(call_id.to_string()),
                    });
                }
            } else {
                // Text response - task complete
                let content = parsed
                    .get("content")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Task completed");

                self.emit(events, AgentEvent::Completed {
                    task_id: task_id.clone(),
                    summary: content.to_string(),
                });
                return Ok(content.to_string());
            }
        }

        // Max iterations reached
        let summary = format!(
            "Completed after {} iterations. {} tool calls executed.",
            max_iterations,
            all_tool_results.len()
        );
        self.emit(events, AgentEvent::Completed {
            task_id: task_id.clone(),
            summary: summary.clone(),
        });
        Ok(summary)
    }

    async fn execute_tool(
        &self,
        tool_name: &str,
        args: &Value,
        blender: &BlenderClient,
    ) -> ToolResult {
        let call_id = Uuid::new_v4().to_string()[..8].to_string();

        let result = match tool_name {
            "blender.get_scene" => {
                match blender.get_scene_info() {
                    Ok(resp) => ToolResult {
                        call_id,
                        status: if resp.status == "success" {
                            ToolStatus::Success
                        } else {
                            ToolStatus::Error
                        },
                        result: resp.result.unwrap_or_default(),
                        message: "Scene info retrieved".into(),
                    },
                    Err(e) => ToolResult {
                        call_id,
                        status: ToolStatus::Error,
                        result: serde_json::json!({ "error": e }),
                        message: e,
                    },
                }
            }
            "blender.get_object" => {
                let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let code = format!(
                    "import bpy, json\nobj = bpy.data.objects.get('{}')\nif obj:\n    info = {{'name': obj.name, 'type': obj.type, 'location': list(obj.location), 'rotation': list(obj.rotation_euler), 'scale': list(obj.scale)}}\n    print(json.dumps(info))\nelse:\n    print(json.dumps({{'error': 'Object not found'}}))",
                    name.replace('\'', "\\'")
                );
                match blender.execute_code(&code) {
                    Ok(resp) => ToolResult {
                        call_id,
                        status: if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error },
                        result: resp.result.unwrap_or_default(),
                        message: format!("Got info for object: {name}"),
                    },
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.create_object" => {
                let obj_type = args.get("type").and_then(|v| v.as_str()).unwrap_or("cube");
                let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("Object");
                let loc = Self::parse_vec3(args, "location", (0.0, 0.0, 0.0));
                let size = args.get("size").and_then(|v| v.as_f64()).unwrap_or(2.0);

                let code = match obj_type {
                    "cube" => format!("import bpy\nbpy.ops.mesh.primitive_cube_add(size={size}, location=({},{},{}))\nbpy.context.active_object.name = '{}'", loc.0, loc.1, loc.2, name.replace('\'', "\\'")),
                    "sphere" => format!("import bpy\nbpy.ops.mesh.primitive_uv_sphere_add(radius={size}/2, location=({},{},{}))\nbpy.context.active_object.name = '{}'", loc.0, loc.1, loc.2, name.replace('\'', "\\'")),
                    "cylinder" => format!("import bpy\nbpy.ops.mesh.primitive_cylinder_add(radius={size}/2, depth={size}, location=({},{},{}))\nbpy.context.active_object.name = '{}'", loc.0, loc.1, loc.2, name.replace('\'', "\\'")),
                    "cone" => format!("import bpy\nbpy.ops.mesh.primitive_cone_add(radius1={size}/2, depth={size}, location=({},{},{}))\nbpy.context.active_object.name = '{}'", loc.0, loc.1, loc.2, name.replace('\'', "\\'")),
                    "torus" => format!("import bpy\nbpy.ops.mesh.primitive_torus_add(major_radius={size}/2, minor_radius={size}/8, location=({},{},{}))\nbpy.context.active_object.name = '{}'", loc.0, loc.1, loc.2, name.replace('\'', "\\'")),
                    "plane" => format!("import bpy\nbpy.ops.mesh.primitive_plane_add(size={size}, location=({},{},{}))\nbpy.context.active_object.name = '{}'", loc.0, loc.1, loc.2, name.replace('\'', "\\'")),
                    "ico_sphere" => format!("import bpy\nbpy.ops.mesh.primitive_ico_sphere_add(radius={size}/2, location=({},{},{}))\nbpy.context.active_object.name = '{}'", loc.0, loc.1, loc.2, name.replace('\'', "\\'")),
                    "monkey" => format!("import bpy\nbpy.ops.mesh.primitive_monkey_add(size={size}/2, location=({},{},{}))\nbpy.context.active_object.name = '{}'", loc.0, loc.1, loc.2, name.replace('\'', "\\'")),
                    _ => format!("import bpy\nbpy.ops.mesh.primitive_cube_add(size={size}, location=({},{},{}))\nbpy.context.active_object.name = '{}'", loc.0, loc.1, loc.2, name.replace('\'', "\\'")),
                };

                match blender.execute_code(&code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: serde_json::json!({ "created": name }), message: format!("Created {obj_type}: {name}") }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.delete_object" => {
                let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let code = format!("import bpy\nobj = bpy.data.objects.get('{}')\nif obj:\n    bpy.data.objects.remove(obj)\nelse:\n    raise Exception('Object not found')", name.replace('\'', "\\'"));
                match blender.execute_code(&code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: serde_json::json!({ "deleted": name }), message: format!("Deleted: {name}") }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.transform_object" => {
                let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let mut code_parts = vec![format!("import bpy\nobj = bpy.data.objects.get('{}')", name.replace('\'', "\\'"))];
                code_parts.push("if not obj:\n    raise Exception('Object not found')".into());

                if let Some(loc) = args.get("location").and_then(|v| v.as_array()) {
                    if loc.len() >= 3 {
                        let x = loc[0].as_f64().unwrap_or(0.0);
                        let y = loc[1].as_f64().unwrap_or(0.0);
                        let z = loc[2].as_f64().unwrap_or(0.0);
                        code_parts.push(format!("obj.location = ({x}, {y}, {z})"));
                    }
                }
                if let Some(rot) = args.get("rotation").and_then(|v| v.as_array()) {
                    if rot.len() >= 3 {
                        let x = rot[0].as_f64().unwrap_or(0.0);
                        let y = rot[1].as_f64().unwrap_or(0.0);
                        let z = rot[2].as_f64().unwrap_or(0.0);
                        code_parts.push(format!("obj.rotation_euler = ({x}, {y}, {z})"));
                    }
                }
                if let Some(scl) = args.get("scale").and_then(|v| v.as_array()) {
                    if scl.len() >= 3 {
                        let x = scl[0].as_f64().unwrap_or(1.0);
                        let y = scl[1].as_f64().unwrap_or(1.0);
                        let z = scl[2].as_f64().unwrap_or(1.0);
                        code_parts.push(format!("obj.scale = ({x}, {y}, {z})"));
                    }
                }

                let code = code_parts.join("\n");
                match blender.execute_code(&code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: serde_json::json!({ "transformed": name }), message: format!("Transformed: {name}") }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.create_material" => {
                let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("Material");
                let color = Self::parse_vec4(args, "base_color", (0.8, 0.8, 0.8, 1.0));
                let metallic = args.get("metallic").and_then(|v| v.as_f64()).unwrap_or(0.0);
                let roughness = args.get("roughness").and_then(|v| v.as_f64()).unwrap_or(0.5);

                let code = format!(
                    "import bpy\nmat = bpy.data.materials.new(name='{}')\nmat.use_nodes = True\nbsdf = mat.node_tree.nodes['Principled BSDF']\nbsdf.inputs['Base Color'].default_value = ({}, {}, {}, {})\nbsdf.inputs['Metallic'].default_value = {}\nbsdf.inputs['Roughness'].default_value = {}",
                    name.replace('\'', "\\'"),
                    color.0, color.1, color.2, color.3,
                    metallic, roughness
                );

                match blender.execute_code(&code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: serde_json::json!({ "created_material": name }), message: format!("Created material: {name}") }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.assign_material" => {
                let obj_name = args.get("object_name").and_then(|v| v.as_str()).unwrap_or("");
                let mat_name = args.get("material_name").and_then(|v| v.as_str()).unwrap_or("");
                let code = format!(
                    "import bpy\nobj = bpy.data.objects.get('{}')\nmat = bpy.data.materials.get('{}')\nif obj and mat:\n    if obj.data.materials:\n        obj.data.materials[0] = mat\n    else:\n        obj.data.materials.append(mat)\nelse:\n    raise Exception('Object or material not found')",
                    obj_name.replace('\'', "\\'"),
                    mat_name.replace('\'', "\\'")
                );
                match blender.execute_code(&code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: serde_json::json!({ "assigned": mat_name, "to": obj_name }), message: format!("Assigned {mat_name} to {obj_name}") }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.create_camera" => {
                let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("Camera");
                let loc = Self::parse_vec3(args, "location", (7.0, -7.0, 5.0));
                let lens = args.get("lens").and_then(|v| v.as_f64()).unwrap_or(50.0);
                let set_active = args.get("set_active").and_then(|v| v.as_bool()).unwrap_or(true);

                let code = format!(
                    "import bpy\nbpy.ops.object.camera_add(location=({},{},{}))\ncam = bpy.context.active_object\ncam.name = '{}'\ncam.data.lens = {}\n{}",
                    loc.0, loc.1, loc.2,
                    name.replace('\'', "\\'"),
                    lens,
                    if set_active { "bpy.context.scene.camera = cam" } else { "" }
                );
                match blender.execute_code(&code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: serde_json::json!({ "created_camera": name }), message: format!("Created camera: {name}") }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.create_light" => {
                let light_type = args.get("type").and_then(|v| v.as_str()).unwrap_or("POINT");
                let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("Light");
                let loc = Self::parse_vec3(args, "location", (0.0, 0.0, 3.0));
                let energy = args.get("energy").and_then(|v| v.as_f64()).unwrap_or(1000.0);

                let code = format!(
                    "import bpy\nbpy.ops.object.light_add(type='{}', location=({},{},{}))\nlight = bpy.context.active_object\nlight.name = '{}'\nlight.data.energy = {}",
                    light_type, loc.0, loc.1, loc.2,
                    name.replace('\'', "\\'"),
                    energy
                );
                match blender.execute_code(&code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: serde_json::json!({ "created_light": name }), message: format!("Created {light_type} light: {name}") }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.screenshot" => {
                let max_size = args.get("max_size").and_then(|v| v.as_u64()).unwrap_or(800) as u32;
                match blender.take_screenshot(max_size) {
                    Ok(resp) => {
                        let image = resp.result
                            .as_ref()
                            .and_then(|r| r.get("image"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        ToolResult {
                            call_id,
                            status: if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error },
                            result: serde_json::json!({ "has_screenshot": !image.is_empty() }),
                            message: "Screenshot captured".into(),
                        }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.execute_python" => {
                let code = args.get("code").and_then(|v| v.as_str()).unwrap_or("");
                match blender.execute_code(code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: resp.result.unwrap_or_default(), message: "Python executed".into() }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.select_object" => {
                let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let deselect = args.get("deselect_all").and_then(|v| v.as_bool()).unwrap_or(true);
                let mut code = String::new();
                if deselect {
                    code.push_str("import bpy\nbpy.ops.object.select_all(action='DESELECT')\n");
                }
                code.push_str(&format!(
                    "obj = bpy.data.objects.get('{}')\nif obj:\n    obj.select_set(True)\n    bpy.context.view_layer.objects.active = obj",
                    name.replace('\'', "\\'")
                ));
                match blender.execute_code(&code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: serde_json::json!({ "selected": name }), message: format!("Selected: {name}") }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.frame_object" => {
                let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let cam = args.get("camera_name").and_then(|v| v.as_str()).unwrap_or("Camera");
                let code = format!(
                    "import bpy, math\nobj = bpy.data.objects.get('{}')\ncam = bpy.data.objects.get('{}')\nif obj and cam:\n    loc = obj.location\n    cam.location = (loc.x + 7, loc.y - 7, loc.z + 5)\n    direction = cam.location - loc\n    rot_y = math.atan2(direction.x, direction.y)\n    rot_x = math.atan2(direction.z, (direction.x**2 + direction.y**2)**0.5)\n    cam.rotation_euler = (rot_x, 0, -rot_y)",
                    name.replace('\'', "\\'"),
                    cam.replace('\'', "\\'")
                );
                match blender.execute_code(&code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: Value::Null, message: format!("Framed: {name}") }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.undo" => {
                match blender.undo() {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: Value::Null, message: "Undone".into() }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.set_world" => {
                let color = Self::parse_vec3(args, "color", (0.1, 0.1, 0.1));
                let strength = args.get("strength").and_then(|v| v.as_f64()).unwrap_or(1.0);
                let code = format!(
                    "import bpy\nworld = bpy.context.scene.world\nif not world:\n    world = bpy.data.worlds.new('World')\n    bpy.context.scene.world = world\nworld.use_nodes = True\nbg = world.node_tree.nodes['Background']\nbg.inputs['Color'].default_value = ({}, {}, {}, 1.0)\nbg.inputs['Strength'].default_value = {}",
                    color.0, color.1, color.2, strength
                );
                match blender.execute_code(&code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: Value::Null, message: "World settings updated".into() }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.render" => {
                let engine = args.get("engine").and_then(|v| v.as_str()).unwrap_or("BLENDER_EEVEE_NEXT");
                let res_x = args.get("resolution_x").and_then(|v| v.as_u64()).unwrap_or(1920);
                let res_y = args.get("resolution_y").and_then(|v| v.as_u64()).unwrap_or(1080);
                let code = format!(
                    "import bpy\nscene = bpy.context.scene\nscene.render.engine = '{}'\nscene.render.resolution_x = {}\nscene.render.resolution_y = {}\nscene.render.resolution_percentage = 100",
                    engine, res_x, res_y
                );
                match blender.execute_code(&code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: Value::Null, message: format!("Render settings updated: {engine} {res_x}x{res_y}") }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            "blender.duplicate_object" => {
                let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let new_name = args.get("new_name").and_then(|v| v.as_str());
                let offset = Self::parse_vec3(args, "offset", (2.0, 0.0, 0.0));
                let mut code = format!(
                    "import bpy\nobj = bpy.data.objects.get('{}')\nif obj:\n    new_obj = obj.copy()\n    new_obj.data = obj.data.copy()\n    bpy.context.collection.objects.link(new_obj)\n    new_obj.location = (obj.location.x + {}, obj.location.y + {}, obj.location.z + {})",
                    name.replace('\'', "\\'"),
                    offset.0, offset.1, offset.2
                );
                if let Some(nn) = new_name {
                    code.push_str(&format!("\nnew_obj.name = '{}'", nn.replace('\'', "\\'")));
                }
                match blender.execute_code(&code) {
                    Ok(resp) => {
                        let status = if resp.status == "success" { ToolStatus::Success } else { ToolStatus::Error };
                        ToolResult { call_id, status, result: Value::Null, message: format!("Duplicated: {name}") }
                    }
                    Err(e) => ToolResult { call_id, status: ToolStatus::Error, result: Value::Null, message: e },
                }
            }
            _ => ToolResult {
                call_id,
                status: ToolStatus::Error,
                result: serde_json::json!({ "error": format!("Unknown tool: {tool_name}") }),
                message: format!("Unknown tool: {tool_name}"),
            },
        };

        result
    }

    fn parse_vec3(args: &Value, key: &str, default: (f64, f64, f64)) -> (f64, f64, f64) {
        args.get(key)
            .and_then(|v| v.as_array())
            .and_then(|a| {
                if a.len() >= 3 {
                    Some((
                        a[0].as_f64().unwrap_or(default.0),
                        a[1].as_f64().unwrap_or(default.1),
                        a[2].as_f64().unwrap_or(default.2),
                    ))
                } else {
                    None
                }
            })
            .unwrap_or(default)
    }

    fn parse_vec4(args: &Value, key: &str, default: (f64, f64, f64, f64)) -> (f64, f64, f64, f64) {
        args.get(key)
            .and_then(|v| v.as_array())
            .and_then(|a| {
                if a.len() >= 4 {
                    Some((
                        a[0].as_f64().unwrap_or(default.0),
                        a[1].as_f64().unwrap_or(default.1),
                        a[2].as_f64().unwrap_or(default.2),
                        a[3].as_f64().unwrap_or(default.3),
                    ))
                } else {
                    None
                }
            })
            .unwrap_or(default)
    }

    fn emit(&self, events: &Arc<Mutex<Vec<AgentEvent>>>, event: AgentEvent) {
        if let Ok(mut guard) = events.lock() {
            guard.push(event);
        }
    }
}
