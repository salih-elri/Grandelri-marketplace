"""
run_local.py — Local development server
Serves both the FastAPI backend (/api/*) and static frontend files
on a single port (8000) so relative /api/ paths work in the browser.
NOT used in production (Vercel handles routing via vercel.json).
"""
import sys
import os

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(__file__))

from api.index import app
from fastapi.staticfiles import StaticFiles

# Mount static files AFTER all API routes are registered
# FastAPI gives precedence to @app.route() decorators over mounts
app.mount("/", StaticFiles(directory="public", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 55)
    print("  Bazaar — Local Dev Server")
    print("=" * 55)
    print("  URL:   http://localhost:8000")
    print("  API:   http://localhost:8000/api/docs  (Swagger UI)")
    print("  Stop:  Ctrl+C")
    print("=" * 55 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
