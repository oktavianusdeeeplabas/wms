import importlib
import logging
import os
import pkgutil
import traceback
from contextlib import asynccontextmanager
from datetime import datetime

from core.auth import AccessTokenError, decode_access_token
from core.config import settings
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter

# MODULE_IMPORTS_START
from services.database import initialize_database, close_database
from services.mock_data import initialize_demo_data
from services.auth import initialize_admin_user
from services.rbac import initialize_default_roles
from services.notifications import create_update_notifications_for_all_users
from core.database import db_manager
from models.notifications import Notification
# MODULE_IMPORTS_END


def setup_logging():
    """Configure the logging system."""
    if os.environ.get("IS_LAMBDA") == "true":
        return

    # Create the logs directory
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    # Generate log filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"{log_dir}/app_{timestamp}.log"

    # Configure log format
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Configure the root logger
    logging.basicConfig(
        level=logging.DEBUG,
        format=log_format,
        handlers=[
            # File handler
            logging.FileHandler(log_file, encoding="utf-8"),
            # Console handler
            logging.StreamHandler(),
        ],
    )

    # Set log levels for specific modules
    logging.getLogger("uvicorn").setLevel(logging.DEBUG)
    logging.getLogger("fastapi").setLevel(logging.DEBUG)

    # Log configuration details
    logger = logging.getLogger(__name__)
    logger.info("=== Logging system initialized ===")
    logger.info(f"Log file: {log_file}")
    logger.info("Log level: INFO")
    logger.info(f"Timestamp: {timestamp}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger = logging.getLogger(__name__)
    logger.info("=== Application startup initiated ===")

    # MODULE_STARTUP_START
    await initialize_database()
    async with db_manager.async_session_maker() as db:
        await initialize_default_roles(db)
    await initialize_demo_data()
    await initialize_admin_user()
    # MODULE_STARTUP_END

    logger.info("=== Application startup completed successfully ===")
    yield
    # MODULE_SHUTDOWN_START
    await close_database()
    # MODULE_SHUTDOWN_END


app = FastAPI(
    title="FastAPI Modular Template",
    description="A best-practice FastAPI template with modular architecture",
    version="1.0.0",
    lifespan=lifespan,
)


# MODULE_MIDDLEWARE_START
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
# MODULE_MIDDLEWARE_END


READ_METHODS = {"GET", "HEAD", "OPTIONS"}

ENTITY_PERMISSION_POLICY = {
    "bins": {"read": "inventory.view", "write": "inventory.manage"},
    "bom_lines": {"read": "production.view", "write": "production.manage"},
    "bom_recipes": {"read": "production.view", "write": "production.manage"},
    "branches": {"read": "dashboard.view", "write": "settings.manage"},
    "inventory_lots": {"read": "inventory.view", "write": "inventory.manage"},
    "label_templates": {"read": "production.view", "write": "production.manage"},
    "payment_types": {"read": "inventory.view", "write": "settings.manage"},
    "product_categories": {"read": "inventory.view", "write": "settings.manage"},
    "product_sub_categories": {"read": "inventory.view", "write": "settings.manage"},
    "brands": {"read": "inventory.view", "write": "settings.manage"},
    "manufacturers": {"read": "inventory.view", "write": "settings.manage"},
    "product_types": {"read": "inventory.view", "write": "settings.manage"},
    "item_groups": {"read": "inventory.view", "write": "settings.manage"},
    "products": {"read": "inventory.view", "write": "settings.manage"},
    "receiving_documents": {"read": "operations.view", "write": "operations.execute"},
    "receiving_lines": {"read": "operations.view", "write": "operations.execute"},
    "stock_movements": {"read": "inventory.view", "write": "operations.execute"},
    "stock_transfers": {"read": "operations.view", "write": "operations.execute"},
    "suppliers": {"read": "inventory.view", "write": "settings.manage"},
    "uhf_readers": {"read": "inventory.view", "write": "inventory.manage"},
    "uhf_tag_reads": {"read": "inventory.view", "write": "operations.execute"},
    "uhf_tags": {"read": "inventory.view", "write": "inventory.manage"},
    "units": {"read": "inventory.view", "write": "settings.manage"},
    "warehouses": {"read": "inventory.view", "write": "settings.manage"},
    "zones": {"read": "inventory.view", "write": "settings.manage"},
}

PUBLIC_PATH_PREFIXES = (
    "/api/config",
    "/api/v1/auth",
    "/api/v1/health",
    "/api/v1/notifications",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/health",
)


def _extract_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


def _required_permission_for_request(path: str, method: str) -> str | None:
    if method == "OPTIONS":
        return None

    if any(path == prefix or path.startswith(f"{prefix}/") for prefix in PUBLIC_PATH_PREFIXES):
        return None

    if path.startswith("/api/v1/entities/"):
        parts = path.split("/")
        entity_name = parts[4] if len(parts) > 4 else ""
        action = "read" if method in READ_METHODS else "write"
        policy = ENTITY_PERMISSION_POLICY.get(entity_name)
        if policy:
            return policy[action]
        return "inventory.view" if action == "read" else "inventory.manage"

    if path.startswith("/api/v1/aihub"):
        return "analytics.view"

    if path.startswith("/api/v1/settings") or path.startswith("/api/v1/storage"):
        return "settings.manage"

    return None


def _should_create_update_notification(path: str, method: str, status_code: int) -> bool:
    if status_code >= 400 or method in READ_METHODS:
        return False
    if path.startswith("/api/v1/notifications"):
        return False
    return (
        path.startswith("/api/v1/entities/")
        or path.startswith("/api/v1/users")
        or path.startswith("/api/v1/rbac")
        or path.startswith("/api/v1/settings")
    )


async def _create_update_notification(request: Request, payload: dict, response_status_code: int) -> None:
    method = request.method.upper()
    path = request.url.path
    if not _should_create_update_notification(path, method, response_status_code):
        return

    if not db_manager.async_session_maker:
        return

    try:
        async with db_manager.async_session_maker() as db:
            await create_update_notifications_for_all_users(
                db,
                method=method,
                path=path,
                actor_id=payload.get("sub"),
                actor_email=payload.get("email"),
            )
    except Exception:
        logging.getLogger(__name__).exception("Failed to create update notification")


@app.middleware("http")
async def enforce_jwt_rbac(request: Request, call_next):
    required_permission = _required_permission_for_request(request.url.path, request.method.upper())
    if not required_permission:
        return await call_next(request)

    token = _extract_bearer_token(request)
    if not token:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Authentication credentials were not provided"},
        )

    try:
        payload = decode_access_token(token)
    except AccessTokenError as exc:
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": exc.message})

    if payload.get("role") == "admin":
        response = await call_next(request)
        await _create_update_notification(request, payload, response.status_code)
        return response

    permissions = {
        str(permission)
        for permission in payload.get("permissions", [])
        if isinstance(permission, str) and permission.strip()
    }
    if required_permission not in permissions:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": f"Missing permission: {required_permission}"},
        )

    response = await call_next(request)
    await _create_update_notification(request, payload, response.status_code)
    return response


# Auto-discover and include all routers from the local `routers` package
def include_routers_from_package(app: FastAPI, package_name: str = "routers") -> None:
    """Discover and include all APIRouter objects from a package.

    This scans the given package (and subpackages) for module-level variables that
    are instances of FastAPI's APIRouter. It supports "router", "admin_router" names.
    """

    logger = logging.getLogger(__name__)

    try:
        pkg = importlib.import_module(package_name)
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.debug("Routers package '%s' not loaded: %s", package_name, exc)
        return

    discovered: int = 0
    for _finder, module_name, is_pkg in pkgutil.walk_packages(pkg.__path__, pkg.__name__ + "."):
        # Only import leaf modules; subpackages will be walked automatically
        if is_pkg:
            continue
        try:
            module = importlib.import_module(module_name)
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.warning("Failed to import module '%s': %s", module_name, exc)
            continue

        # Check for router variable names: router and admin_router
        for attr_name in ("router", "admin_router"):
            if not hasattr(module, attr_name):
                continue

            attr = getattr(module, attr_name)

            if isinstance(attr, APIRouter):
                app.include_router(attr)
                discovered += 1
                logger.info("Included router: %s.%s", module_name, attr_name)
            elif isinstance(attr, (list, tuple)):
                for idx, item in enumerate(attr):
                    if isinstance(item, APIRouter):
                        app.include_router(item)
                        discovered += 1
                        logger.info("Included router from list: %s.%s[%d]", module_name, attr_name, idx)

    if discovered == 0:
        logger.debug("No routers discovered in package '%s'", package_name)


# Setup logging before router discovery
setup_logging()
include_routers_from_package(app, "routers")


# Add exception handler for all exceptions except HTTPException
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all exceptions except HTTPException

    - Dev environment: Return full stack trace and exception details
    - Prod environment: Return only "Internal server error"
    """
    # Re-raise HTTPException to let FastAPI handle it normally
    if isinstance(exc, HTTPException):
        raise exc

    logger = logging.getLogger(__name__)
    error_message = str(exc)
    error_type = type(exc).__name__

    # Log full error details regardless of environment
    logger.error(f"Exception: {error_type}: {error_message}\n{traceback.format_exc()}")

    # Determine if we're in dev environment
    is_dev = os.getenv("ENVIRONMENT", "prod").lower() == "dev"

    if is_dev:
        # Dev environment: return full stack trace and exception details
        error_detail = f"{error_type}: {error_message}\n{traceback.format_exc()}"
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": error_detail})
    else:
        # Prod environment: return only generic error message
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "Internal Server Error"}
        )


@app.get("/")
def root():
    return {"message": "FastAPI Modular Template is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


def run_in_debug_mode(app: FastAPI):
    """Run the FastAPI app in debug mode with proper asyncio handling.

    This function handles the special case of running in a debugger (PyCharm, VS Code, etc.)
    where asyncio is patched, causing conflicts with uvicorn's asyncio_run.

    It loads environment variables from ../.env and uses asyncio.run() directly
    to avoid uvicorn's asyncio_run conflicts.

    Args:
        app: The FastAPI application instance
    """
    import asyncio
    from pathlib import Path

    import uvicorn
    from dotenv import load_dotenv

    # Load environment variables from ../.env in debug mode
    # If `LOCAL_DEBUG=true` is set, then MetaGPT's `ProjectBuilder.build()` will generate the `.env` file
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=True)
        logger = logging.getLogger(__name__)
        logger.info(f"Loaded environment variables from {env_path}")

    # In debug mode, use asyncio.run() directly to avoid uvicorn's asyncio_run conflicts
    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=int(settings.port),
        log_level="info",
    )
    server = uvicorn.Server(config)
    asyncio.run(server.serve())


if __name__ == "__main__":
    import sys

    import uvicorn

    # Detect if running in debugger (PyCharm, VS Code, etc.)
    # Debuggers patch asyncio which conflicts with uvicorn's asyncio_run
    is_debugging = "pydevd" in sys.modules or (hasattr(sys, "gettrace") and sys.gettrace() is not None)

    if is_debugging:
        run_in_debug_mode(app)
    else:
        # Enable reload in normal mode
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=int(settings.port),
            reload_excludes=["**/*.py"],
        )
