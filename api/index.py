import os
import sys

# Ensure project root and backend are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.server import app as fastapi_app

# Vercel ASGI path normalizer ensures routes match seamlessly
# whether Vercel passes /auth/login, /api/auth/login, or /api/index.py/auth/login
class VercelPathNormalizer:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            orig_path = scope.get("path", "")
            scope["original_path"] = orig_path
            path = orig_path
            
            # If path starts with /api/index.py, strip it
            if path.startswith("/api/index.py"):
                path = path[len("/api/index.py"):]
            elif path.startswith("api/index.py"):
                path = path[len("api/index.py"):]

            if not path.startswith("/"):
                path = "/" + path

            # Ensure the path begins with /api to match FastAPI route definitions
            if not path.startswith("/api"):
                if path == "/":
                    path = "/api"
                else:
                    path = "/api" + path

            scope["path"] = path

        await self.app(scope, receive, send)

app = VercelPathNormalizer(fastapi_app)
