"""
BlenderCraft executor - schedules code execution on Blender's main thread.

The TCP server runs on a background thread, but bpy.ops.* and most bpy
operations MUST run on Blender's main thread. This module uses
bpy.app.timers to bridge the gap: the TCP server thread puts work into a
queue and waits; the timer callback (main thread) picks it up, executes,
stores the result, and signals the waiting thread.
"""

import bpy
import sys
import io
import time
import traceback
import threading

_pending_executions = []
_execution_lock = threading.Lock()

_timer_registered = False


def _timer_callback():
    """Runs on Blender's main thread every 0.05s. Picks up queued work."""
    with _execution_lock:
        if not _pending_executions:
            return 0.05

        code, result_holder, event = _pending_executions.pop(0)

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

    except SystemExit:
        result["status"] = "error"
        result["error"] = "Script called sys.exit()"
        result["result"]["error"] = "Script called sys.exit()"
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

    result_holder["result"] = result
    result_holder["done"] = True
    event.set()

    return 0.05


def ensure_timer_registered():
    """Register the timer callback if not already registered."""
    global _timer_registered
    if _timer_registered:
        return
    try:
        bpy.app.timers.register(_timer_callback, persistent=True)
        _timer_registered = True
        print("[BlenderCraft] Main-thread executor timer registered")
    except Exception as e:
        print(f"[BlenderCraft] Failed to register timer: {e}")


def unregister_timer():
    """Unregister the timer callback."""
    global _timer_registered
    if not _timer_registered:
        return
    try:
        bpy.app.timers.unregister(_timer_callback)
        _timer_registered = False
        print("[BlenderCraft] Main-thread executor timer unregistered")
    except Exception:
        pass


def execute_code(code, timeout=30.0):
    """
    Queue code for execution on Blender's main thread and wait for result.

    Called from the TCP server background thread.
    Uses bpy.app.timers to schedule on the main thread.
    """
    if not code or not code.strip():
        return {"status": "error", "error": "No code provided"}

    event = threading.Event()
    result_holder = {"result": None, "done": False}

    with _execution_lock:
        _pending_executions.append((code, result_holder, event))

    event.wait(timeout=timeout)

    if result_holder["done"]:
        return result_holder["result"]
    else:
        with _execution_lock:
            _pending_executions[:] = [
                (c, r, e) for c, r, e in _pending_executions if r is not result_holder
            ]
        return {
            "status": "error",
            "error": f"Execution timed out after {timeout}s - Blender main thread may be blocked",
        }
