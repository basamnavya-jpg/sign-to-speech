"""
Sign-to-Speech Smart Glove - FastAPI Backend Application.
Master application entrypoint providing REST and WebSocket APIs.
"""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config import CORS_ORIGINS, STATIC_DIR, ASSETS_DIR
from services.sensor_streamer import sensor_streamer
from routers import (
    sensors_router,
    translation_router,
    sentence_router,
    speech_to_sign_router,
    simulator_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager handling startup & graceful shutdown tasks."""
    # 1. Startup: Load Excel/CSV telemetry and start background streamer
    sensor_streamer.load_dataset()
    await sensor_streamer.start_streaming()
    yield
    # 2. Shutdown: Clean up background workers and connections
    await sensor_streamer.stop_streaming()

# Initialize FastAPI application
app = FastAPI(
    title="Sign-to-Speech Smart Glove IoT Backend",
    description="High-performance async backend translating glove flex sensors & MPU6050 IMU telemetry into speech and sign animations.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for external frontends and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Development middleware: Prevent browser from caching index.html and static files
@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    if request.url.path == "/" or request.url.path.startswith(("/static", "/assets")):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Register API Routers
app.include_router(sensors_router)
app.include_router(translation_router)
app.include_router(sentence_router)
app.include_router(speech_to_sign_router)
app.include_router(simulator_router)

# Mount static assets for sign language illustrations and animations
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Serve interactive web demo dashboard at root
if (STATIC_DIR / "index.html").exists():
    @app.get("/", include_in_schema=False)
    async def serve_dashboard():
        return FileResponse(STATIC_DIR / "index.html")

@app.get("/health", tags=["Health"])
async def health_check():
    """System health check and uptime probe."""
    return {
        "status": "healthy",
        "service": "sign-to-speech-backend",
        "simulator": sensor_streamer.get_status()
    }

if __name__ == "__main__":
    import uvicorn
    from config import HOST, PORT
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
