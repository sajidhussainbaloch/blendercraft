import bpy


def get_scene_info():
    scene = bpy.context.scene

    objects = []
    for obj in scene.objects:
        objects.append({
            "name": obj.name,
            "type": obj.type,
            "location": list(obj.location),
            "rotation": list(obj.rotation_euler),
            "scale": list(obj.scale),
            "visible": obj.visible_get(),
        })

    materials = []
    for mat in bpy.data.materials:
        materials.append({
            "name": mat.name,
            "use_nodes": mat.use_nodes,
        })

    cameras = []
    for cam in bpy.data.cameras:
        cameras.append({
            "name": cam.name,
            "type": cam.type,
            "lens": cam.lens,
        })

    lights = []
    for light in bpy.data.lights:
        lights.append({
            "name": light.name,
            "type": light.type,
            "energy": light.energy,
        })

    return {
        "scene_name": scene.name,
        "frame_current": scene.frame_current,
        "frame_start": scene.frame_start,
        "frame_end": scene.frame_end,
        "render_engine": scene.render.engine,
        "objects": objects,
        "object_count": len(objects),
        "materials": materials,
        "cameras": cameras,
        "lights": lights,
        "collections": [c.name for c in bpy.data.collections],
    }


def get_object_info(name):
    obj = bpy.data.objects.get(name)
    if obj is None:
        return {"error": f"Object '{name}' not found"}

    info = {
        "name": obj.name,
        "type": obj.type,
        "location": list(obj.location),
        "rotation": list(obj.rotation_euler),
        "scale": list(obj.scale),
        "parent": obj.parent.name if obj.parent else None,
        "materials": [m.name if m else None for m in obj.data.materials] if hasattr(obj.data, "materials") else [],
        "modifiers": [{"name": m.name, "type": m.type} for m in obj.modifiers],
    }

    if obj.type == "MESH" and obj.data:
        mesh = obj.data
        info["vertices"] = len(mesh.vertices)
        info["edges"] = len(mesh.edges)
        info["faces"] = len(mesh.polygons)

    return info
