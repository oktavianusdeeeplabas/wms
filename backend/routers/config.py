import os
from urllib.parse import urlparse

from fastapi import APIRouter

router = APIRouter(prefix="/api/config", tags=["config"])


def _safe_api_base_url() -> str:
    api_base_url = os.environ.get("VITE_API_BASE_URL", "http://127.0.0.1:8000")
    parsed = urlparse(api_base_url)

    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return api_base_url

    return "http://127.0.0.1:8000"


@router.get("")
async def get_runtime_config():
    return {"API_BASE_URL": _safe_api_base_url()}
