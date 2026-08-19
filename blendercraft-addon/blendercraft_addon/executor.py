import bpy
import sys
import io
import time
import traceback
import threading


def execute_code(code):
    old_stdout = sys.stdout
    old_stderr = sys.stderr

    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()

    result = {"status": "success", "result": {"output": "", "error": ""}}

    try:
        sys.stdout = stdout_buf
        sys.stderr = stderr_buf

        namespace = {"bpy": bpy}
        exec(code, namespace)

        output = stdout_buf.getvalue()
        result["result"]["output"] = output

        try:
            bpy.context.view_layer.update()
        except Exception:
            pass

        time.sleep(0.05)

    except SystemExit:
        result["status"] = "error"
        result["error"] = "Script called sys.exit()"
        result["result"]["error"] = "Script called sys.exit()"
    except KeyboardInterrupt:
        result["status"] = "error"
        result["error"] = "Script interrupted"
    except MemoryError:
        result["status"] = "error"
        result["error"] = "Out of memory"
        result["result"]["error"] = "Out of memory during execution"
    except Exception:
        tb = traceback.format_exc()
        result["status"] = "error"
        result["error"] = str(tb)
        result["result"]["error"] = tb
    except BaseException:
        tb = traceback.format_exc()
        result["status"] = "error"
        result["error"] = str(tb)
        result["result"]["error"] = tb
    finally:
        try:
            stdout_val = stdout_buf.getvalue()
            stderr_val = stderr_buf.getvalue()
        except Exception:
            stdout_val = ""
            stderr_val = ""

        sys.stdout = old_stdout
        sys.stderr = old_stderr

        if stdout_val and not result["result"]["output"]:
            result["result"]["output"] = stdout_val
        if stderr_val:
            result["result"]["error"] = stderr_val

    return result
