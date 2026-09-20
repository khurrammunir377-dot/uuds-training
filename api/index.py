import os
import sys
import urllib.parse

# Ensure project root and backend are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.server import app as fastapi_app

class UniversalVercelRouter:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            query_string = scope.get("query_string", b"").decode("utf-8", errors="ignore")
            params = urllib.parse.parse_qs(query_string, keep_blank_values=True)
            
            if "__route__" in params:
                route = params.pop("__route__")[0]
                if not route.startswith("/"):
                    route = "/" + route
                scope["path"] = route
                clean_params = [(k, v) for k, vs in params.items() for v in vs]
                scope["query_string"] = urllib.parse.urlencode(clean_params).encode("utf-8")
            else:
                path = scope.get("path", "")
                if path.startswith("/api/index.py"):
                    subpath = path[len("/api/index.py"):]
                    scope["path"] = subpath if subpath else "/"

        await self.app(scope, receive, send)

app = UniversalVercelRouter(fastapi_app)
