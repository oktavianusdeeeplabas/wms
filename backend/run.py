import sys
import asyncio
import os
import uvicorn

# Fix for Windows AsyncIO loop with Psycopg
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

if __name__ == "__main__":
    reload_enabled = os.getenv("UVICORN_RELOAD", "false").lower() in {"1", "true", "yes", "on"}
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=reload_enabled)
