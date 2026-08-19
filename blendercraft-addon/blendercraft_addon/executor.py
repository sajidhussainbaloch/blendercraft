import bpy
import sys
import io
import traceback


def execute_code(code):
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = io.StringIO()
    sys.stderr = io.StringIO()

    result = {"status": "success", "result": {"output": "", "error": ""}}

    try:
        namespace = {"bpy": bpy}
        exec(code, namespace)
        output = sys.stdout.getvalue()
        result["result"]["output"] = output
    except Exception:
        tb = traceback.format_exc()
        result["status"] = "error"
        result["error"] = str(tb)
        result["result"]["error"] = tb
    finally:
        stdout_val = sys.stdout.getvalue()
        stderr_val = sys.stderr.getvalue()
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        if stdout_val and not result["result"]["output"]:
            result["result"]["output"] = stdout_val
        if stderr_val:
            result["result"]["error"] = stderr_val

    return result
