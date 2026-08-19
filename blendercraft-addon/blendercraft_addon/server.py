import socket
import json
import threading
import bpy
from .executor import execute_code
from .scene import get_scene_info, get_object_info
from .screenshot import capture_viewport


class BlenderCraftServer:
    def __init__(self, host="127.0.0.1", port=9876):
        self.host = host
        self.port = port
        self.server_socket = None
        self.running = False
        self.thread = None

    def start(self):
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(5)
        self.running = True
        self.thread = threading.Thread(target=self._listen_loop, daemon=True)
        self.thread.start()
        print(f"[BlenderCraft] Server started on {self.host}:{self.port}")

    def stop(self):
        self.running = False
        if self.server_socket:
            try:
                self.server_socket.close()
            except Exception:
                pass
            self.server_socket = None
        print("[BlenderCraft] Server stopped")

    def _listen_loop(self):
        while self.running:
            try:
                self.server_socket.settimeout(1.0)
                try:
                    conn, addr = self.server_socket.accept()
                except socket.timeout:
                    continue
                thread = threading.Thread(
                    target=self._handle_client, args=(conn, addr), daemon=True
                )
                thread.start()
            except OSError:
                break
            except Exception as e:
                print(f"[BlenderCraft] Accept error: {e}")

    def _handle_client(self, conn, addr):
        print(f"[BlenderCraft] Client connected: {addr}")
        try:
            buffer = ""
            while self.running:
                data = conn.recv(65536)
                if not data:
                    break
                buffer += data.decode("utf-8")
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        request = json.loads(line)
                        response = self._process_command(request)
                        conn.sendall((json.dumps(response) + "\n").encode("utf-8"))
                    except json.JSONDecodeError as e:
                        error_resp = {"status": "error", "error": f"Invalid JSON: {e}"}
                        conn.sendall((json.dumps(error_resp) + "\n").encode("utf-8"))
        except Exception as e:
            print(f"[BlenderCraft] Client error: {e}")
        finally:
            conn.close()
            print(f"[BlenderCraft] Client disconnected: {addr}")

    def _process_command(self, request):
        cmd_type = request.get("type", "")
        params = request.get("params", {})

        if cmd_type == "execute_code":
            return self._cmd_execute_code(params)
        elif cmd_type == "get_scene_info":
            return self._cmd_get_scene_info(params)
        elif cmd_type == "get_object_info":
            return self._cmd_get_object_info(params)
        elif cmd_type == "screenshot":
            return self._cmd_screenshot(params)
        elif cmd_type == "ping":
            return {"status": "success", "result": {"message": "pong"}}
        elif cmd_type == "get_version":
            return {
                "status": "success",
                "result": {"version": list(bpy.app.version)},
            }
        else:
            return {"status": "error", "error": f"Unknown command: {cmd_type}"}

    def _cmd_execute_code(self, params):
        code = params.get("code", "")
        if not code:
            return {"status": "error", "error": "No code provided"}
        result = execute_code(code)
        try:
            props = bpy.context.scene.blendercraft
            props.last_command = code[:100]
        except Exception:
            pass
        return result

    def _cmd_get_scene_info(self, params):
        try:
            info = get_scene_info()
            return {"status": "success", "result": info}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _cmd_get_object_info(self, params):
        name = params.get("name", "")
        try:
            info = get_object_info(name)
            return {"status": "success", "result": info}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _cmd_screenshot(self, params):
        max_size = params.get("max_size", 800)
        try:
            screenshot_b64 = capture_viewport(max_size)
            return {"status": "success", "result": {"image": screenshot_b64}}
        except Exception as e:
            return {"status": "error", "error": str(e)}
