bl_info = {
    "name": "BlenderCraft",
    "author": "BlenderCraft",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Sidebar > BlenderCraft",
    "description": "AI-powered Blender control via TCP socket",
    "category": "System",
}

import bpy
from bpy.props import IntProperty, BoolProperty, StringProperty
from .server import BlenderCraftServer

_server = None


class BlenderCraftProperties(bpy.types.PropertyGroup):
    port: IntProperty(
        name="Port",
        description="TCP server port",
        default=9876,
        min=1024,
        max=65535,
    )
    is_running: BoolProperty(default=False)
    last_command: StringProperty(default="")


class BLENDERCRAFT_OT_StartServer(bpy.types.Operator):
    bl_idname = "blendercraft.start_server"
    bl_label = "Start Server"
    bl_description = "Start the BlenderCraft TCP server"

    def execute(self, context):
        global _server
        props = context.scene.blendercraft
        if _server and _server.is_running:
            self.report({'WARNING'}, "Server already running")
            return {'CANCELLED'}
        _server = BlenderCraftServer(port=props.port)
        _server.start()
        props.is_running = True
        self.report({'INFO'}, f"BlenderCraft server started on port {props.port}")
        return {'FINISHED'}


class BLENDERCRAFT_OT_StopServer(bpy.types.Operator):
    bl_idname = "blendercraft.stop_server"
    bl_label = "Stop Server"
    bl_description = "Stop the BlenderCraft TCP server"

    def execute(self, context):
        global _server
        props = context.scene.blendercraft
        if _server:
            _server.stop()
            _server = None
        props.is_running = False
        self.report({'INFO'}, "BlenderCraft server stopped")
        return {'FINISHED'}


class BLENDERCRAFT_OT_GetSceneInfo(bpy.types.Operator):
    bl_idname = "blendercraft.get_scene_info"
    bl_label = "Get Scene Info"
    bl_description = "Print scene information to console"

    def execute(self, context):
        from .scene import get_scene_info
        info = get_scene_info()
        print(f"[BlenderCraft] Scene: {info}")
        self.report({'INFO'}, "Scene info printed to console")
        return {'FINISHED'}


class BLENDERCRAFT_PT_Panel(bpy.types.Panel):
    bl_label = "BlenderCraft"
    bl_idname = "BLENDERCRAFT_PT_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'BlenderCraft'

    def draw(self, context):
        layout = self.layout
        props = context.scene.blendercraft

        row = layout.row()
        row.prop(props, "port")

        row = layout.row()
        if props.is_running:
            row.alert = True
            row.operator("blendercraft.stop_server", text="Stop Server", icon='PAUSE')
        else:
            row.operator("blendercraft.start_server", text="Start Server", icon='PLAY')

        status = "Connected" if props.is_running else "Stopped"
        icon = 'COLOR_GREEN' if props.is_running else 'COLOR_RED'
        layout.label(text=f"Status: {status}", icon=icon)

        if props.last_command:
            box = layout.box()
            box.label(text="Last Command:", icon='CONSOLE')
            box.label(text=props.last_command[:60])

        layout.separator()
        layout.operator("blendercraft.get_scene_info", icon='INFO')


def register():
    bpy.utils.register_class(BlenderCraftProperties)
    bpy.types.Scene.blendercraft = bpy.props.PointerProperty(type=BlenderCraftProperties)
    bpy.utils.register_class(BLENDERCRAFT_OT_StartServer)
    bpy.utils.register_class(BLENDERCRAFT_OT_StopServer)
    bpy.utils.register_class(BLENDERCRAFT_OT_GetSceneInfo)
    bpy.utils.register_class(BLENDERCRAFT_PT_Panel)


def unregister():
    global _server
    if _server:
        _server.stop()
        _server = None
    bpy.utils.unregister_class(BLENDERCRAFT_PT_Panel)
    bpy.utils.unregister_class(BLENDERCRAFT_OT_GetSceneInfo)
    bpy.utils.unregister_class(BLENDERCRAFT_OT_StopServer)
    bpy.utils.unregister_class(BLENDERCRAFT_OT_StartServer)
    del bpy.types.Scene.blendercraft
    bpy.utils.unregister_class(BlenderCraftProperties)


if __name__ == "__main__":
    register()
