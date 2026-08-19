use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: Value,
    pub destructive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub call_id: String,
    pub status: ToolStatus,
    pub result: Value,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ToolStatus {
    Success,
    Error,
    Partial { reason: String },
}

pub struct ToolRegistry {
    tools: Vec<ToolDefinition>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        let mut registry = Self { tools: Vec::new() };
        registry.register_blender_tools();
        registry
    }

    pub fn register(&mut self, tool: ToolDefinition) {
        self.tools.push(tool);
    }

    pub fn get_all(&self) -> &[ToolDefinition] {
        &self.tools
    }

    pub fn get(&self, name: &str) -> Option<&ToolDefinition> {
        self.tools.iter().find(|t| t.name == name)
    }

    pub fn get_names(&self) -> Vec<&str> {
        self.tools.iter().map(|t| t.name.as_str()).collect()
    }

    fn register_blender_tools(&mut self) {
        self.register(ToolDefinition {
            name: "blender.get_scene".into(),
            description: "Get the current Blender scene state including all objects, materials, lights, and cameras".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {},
                "required": []
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.get_object".into(),
            description: "Get detailed information about a specific object in the scene".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Object name" }
                },
                "required": ["name"]
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.create_object".into(),
            description: "Create a new mesh object in the scene. Returns the created object name.".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "type": { "type": "string", "enum": ["cube", "sphere", "cylinder", "cone", "torus", "plane", "ico_sphere", "circle", "monkey"], "description": "Primitive type" },
                    "name": { "type": "string", "description": "Object name" },
                    "location": { "type": "array", "items": { "type": "number" }, "description": "Position [x, y, z]" },
                    "rotation": { "type": "array", "items": { "type": "number" }, "description": "Rotation [rx, ry, rz] in radians" },
                    "scale": { "type": "array", "items": { "type": "number" }, "description": "Scale [sx, sy, sz]" },
                    "size": { "type": "number", "description": "Object size" },
                    "radius": { "type": "number", "description": "Radius for spheres/cylinders" },
                    "depth": { "type": "number", "description": "Depth for cylinders/cones" }
                },
                "required": ["type", "name"]
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.delete_object".into(),
            description: "Delete an object from the scene".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Object name to delete" }
                },
                "required": ["name"]
            }),
            destructive: true,
        });

        self.register(ToolDefinition {
            name: "blender.transform_object".into(),
            description: "Set the location, rotation, and/or scale of an object".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Object name" },
                    "location": { "type": "array", "items": { "type": "number" }, "description": "Position [x, y, z]" },
                    "rotation": { "type": "array", "items": { "type": "number" }, "description": "Rotation [rx, ry, rz] in radians" },
                    "scale": { "type": "array", "items": { "type": "number" }, "description": "Scale [sx, sy, sz]" }
                },
                "required": ["name"]
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.duplicate_object".into(),
            description: "Duplicate an existing object".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Object name to duplicate" },
                    "new_name": { "type": "string", "description": "Name for the duplicate" },
                    "offset": { "type": "array", "items": { "type": "number" }, "description": "Offset from original [x, y, z]" }
                },
                "required": ["name"]
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.create_material".into(),
            description: "Create a new PBR material with specified properties".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Material name" },
                    "base_color": { "type": "array", "items": { "type": "number" }, "description": "Base color [r, g, b, 1.0]" },
                    "metallic": { "type": "number", "description": "Metallic value 0-1" },
                    "roughness": { "type": "number", "description": "Roughness value 0-1" },
                    "alpha": { "type": "number", "description": "Transparency 0-1" },
                    "emission_color": { "type": "array", "items": { "type": "number" }, "description": "Emission color [r, g, b, 1]" },
                    "emission_strength": { "type": "number", "description": "Emission strength" }
                },
                "required": ["name"]
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.assign_material".into(),
            description: "Assign a material to an object".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "object_name": { "type": "string", "description": "Object name" },
                    "material_name": { "type": "string", "description": "Material name" }
                },
                "required": ["object_name", "material_name"]
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.create_camera".into(),
            description: "Create a camera and optionally set it as active".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Camera name" },
                    "location": { "type": "array", "items": { "type": "number" }, "description": "Position [x, y, z]" },
                    "rotation": { "type": "array", "items": { "type": "number" }, "description": "Rotation [rx, ry, rz]" },
                    "lens": { "type": "number", "description": "Focal length in mm" },
                    "set_active": { "type": "boolean", "description": "Set as active camera" }
                },
                "required": []
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.create_light".into(),
            description: "Create a light source in the scene".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Light name" },
                    "type": { "type": "string", "enum": ["SUN", "POINT", "AREA", "SPOT"], "description": "Light type" },
                    "location": { "type": "array", "items": { "type": "number" }, "description": "Position [x, y, z]" },
                    "rotation": { "type": "array", "items": { "type": "number" }, "description": "Rotation [rx, ry, rz]" },
                    "energy": { "type": "number", "description": "Light energy/watts" },
                    "color": { "type": "array", "items": { "type": "number" }, "description": "Light color [r, g, b]" },
                    "size": { "type": "number", "description": "Size for area lights" }
                },
                "required": []
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.render".into(),
            description: "Render the current scene and return the result".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "engine": { "type": "string", "enum": ["BLENDER_EEVEE_NEXT", "CYCLES"], "description": "Render engine" },
                    "resolution_x": { "type": "integer", "description": "Resolution width" },
                    "resolution_y": { "type": "integer", "description": "Resolution height" },
                    "samples": { "type": "integer", "description": "Render samples for Cycles" }
                },
                "required": []
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.screenshot".into(),
            description: "Take a viewport screenshot and return it as base64".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "max_size": { "type": "integer", "description": "Maximum dimension in pixels" }
                },
                "required": []
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.execute_python".into(),
            description: "Execute arbitrary Python code in Blender. Use as fallback when structured tools are insufficient.".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "code": { "type": "string", "description": "Python code to execute" }
                },
                "required": ["code"]
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.select_object".into(),
            description: "Select or deselect an object in Blender".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Object name to select" },
                    "deselect_all": { "type": "boolean", "description": "Deselect all others first" }
                },
                "required": ["name"]
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.frame_object".into(),
            description: "Move the camera to frame an object (look at it)".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Object name to frame" },
                    "camera_name": { "type": "string", "description": "Camera to move" }
                },
                "required": ["name"]
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.undo".into(),
            description: "Undo the last operation in Blender".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {},
                "required": []
            }),
            destructive: false,
        });

        self.register(ToolDefinition {
            name: "blender.set_world".into(),
            description: "Configure the world/environment settings".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "color": { "type": "array", "items": { "type": "number" }, "description": "Background color [r, g, b]" },
                    "strength": { "type": "number", "description": "Background strength" },
                    "hdri_path": { "type": "string", "description": "Path to HDRI image" }
                },
                "required": []
            }),
            destructive: false,
        });
    }
}
