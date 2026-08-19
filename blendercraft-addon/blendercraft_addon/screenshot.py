import bpy
import base64
import tempfile
import os


def capture_viewport(max_size=800):
    scene = bpy.context.scene
    render = scene.render

    orig_engine = render.engine
    orig_resolution_x = render.resolution_x
    orig_resolution_y = render.resolution_y
    orig_resolution_percentage = render.resolution_percentage

    render.engine = "BLENDER_EEVEE_NEXT" if hasattr(bpy.types, "BLENDER_EEVEE_NEXT") else "BLENDER_EEVEE"

    render.resolution_percentage = 100

    aspect_ratio = render.resolution_x / max(render.resolution_y, 1)
    if aspect_ratio >= 1:
        render.resolution_x = max_size
        render.resolution_y = int(max_size / aspect_ratio)
    else:
        render.resolution_y = max_size
        render.resolution_x = int(max_size * aspect_ratio)

    filepath = os.path.join(tempfile.gettempdir(), "blendercraft_screenshot.png")
    render.filepath = filepath

    try:
        bpy.ops.render.render(write_still=True)
        with open(filepath, "rb") as f:
            image_data = f.read()
        b64_string = base64.b64encode(image_data).decode("utf-8")
        return b64_string
    except Exception as e:
        raise RuntimeError(f"Screenshot failed: {e}")
    finally:
        render.engine = orig_engine
        render.resolution_x = orig_resolution_x
        render.resolution_y = orig_resolution_y
        render.resolution_percentage = orig_resolution_percentage
        try:
            os.remove(filepath)
        except OSError:
            pass
