import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
from app.config import settings
from app.database import Base, engine, SessionLocal
from app.migrations import run_database_migrations
from app.models import (
    User, FarmerProfile, Device, FarmerDevice, SensorReading,
    GPSLocation, FallEvent, EmergencyAlert, UserSettings,
    PasswordResetToken, UserSession
)
from app.security.password import hash_password
from app.routers import (
    auth, farmers, admin, devices, telemetry,
    fall_detection, emergency, gps, reports, websocket
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("agrishield.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables & apply safe migrations
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    run_database_migrations(engine)
    logger.info("Database tables and migrations verified.")

    # Seed initial test device & demo data if not exists
    db = SessionLocal()
    try:
        # Seed or update primary ESP8266 NodeMCU hardware node
        dev8266 = db.query(Device).filter(Device.device_uid.in_(["ESP8266-AGRI-001", "ESP32-AGRI-001"])).first()
        if dev8266:
            dev8266.device_uid = "ESP8266-AGRI-001"
            dev8266.device_name = "Field Unit 1 - ESP8266 NodeMCU"
            dev8266.device_type = "ESP8266_NODEMCU"
            dev8266.api_key = "agrishield_demo_api_key_2026"
            db.commit()
            db.refresh(dev8266)
        else:
            logger.info("Registering default hardware node: ESP8266-AGRI-001 (NodeMCU)...")
            dev8266 = Device(
                device_uid="ESP8266-AGRI-001",
                device_name="Field Unit 1 - ESP8266 NodeMCU",
                device_type="ESP8266_NODEMCU",
                api_key="agrishield_demo_api_key_2026",
                status="ONLINE",
                firmware_version="1.0.0"
            )
            db.add(dev8266)
            db.commit()
            db.refresh(dev8266)

        # Ensure all camera device entries are removed
        db.query(Device).filter(
            (Device.device_uid.in_(["ESP32-CAM-001", "AGRISHIELD_CAM_001"])) |
            (Device.device_type == "ESP32_CAM")
        ).delete(synchronize_session=False)
        db.commit()

        # Auto-assign ESP8266-AGRI-001 to registered farmers who don't have an active device
        farmers = db.query(User).filter(User.role == "FARMER").all()
        for f in farmers:
            existing_assignment = db.query(FarmerDevice).filter(
                FarmerDevice.farmer_id == f.id,
                FarmerDevice.is_active == True
            ).first()
            if not existing_assignment:
                logger.info(f"Assigning ESP8266-AGRI-001 to farmer id={f.id} ({f.full_name})...")
                assignment = FarmerDevice(
                    farmer_id=f.id,
                    device_id=dev8266.id,
                    is_active=True
                )
                db.add(assignment)
        db.commit()

        # Seed initial admin user if not exists
        admin_user = db.query(User).filter(User.email == "admin@agrishield.com").first()
        if not admin_user:
            logger.info("Seeding initial System Administrator (admin@agrishield.com)...")
            admin_user = User(
                email="admin@agrishield.com",
                password_hash=hash_password("Admin@123"),
                full_name="Chief Safety Officer (Admin)",
                role="ADMIN",
                phone_number="+919876543210",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
    except Exception as e:
        logger.error(f"Error during startup data seeding: {e}")
    finally:
        db.close()

    yield
    logger.info("AgriShield application shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="AgriShield: Advanced AI & IoT-Based Smart Farmer Safety Monitoring Platform",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix="/api")  # Supports /api/auth/...
app.include_router(auth.router, prefix=settings.API_V1_STR)  # Supports /api/v1/auth/...
app.include_router(telemetry.router, prefix="/api")  # Supports /api/telemetry/...
app.include_router(telemetry.router, prefix=settings.API_V1_STR)  # Supports /api/v1/telemetry/...
app.include_router(gps.router, prefix="/api")  # Supports /api/gps/...
app.include_router(gps.router, prefix=settings.API_V1_STR)  # Supports /api/v1/gps/...
app.include_router(farmers.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(devices.router, prefix="/api")  # Supports /api/devices/...
app.include_router(devices.router, prefix=settings.API_V1_STR)  # Supports /api/v1/devices/...
app.include_router(fall_detection.router, prefix=settings.API_V1_STR)
app.include_router(emergency.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(websocket.router)

FRONTEND_DIST_DIR = settings.BASE_DIR.parent / "frontend" / "dist"

# Mount frontend assets if compiled
if (FRONTEND_DIST_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST_DIR / "assets")), name="assets")

@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {
        "status": "HEALTHY",
        "service": "AgriShield API",
        "version": "1.0.0",
        "system_time": "2026-11-25T15:39:45+05:30"
    }

@app.get("/", tags=["Frontend"])
async def serve_root():
    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.is_file():
        return FileResponse(str(index_file))
    return {
        "name": settings.PROJECT_NAME,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
        "status": "RUNNING"
    }

@app.get("/{full_path:path}", tags=["Frontend"])
async def serve_spa_and_static(full_path: str):
    # Exclude API endpoints, Swagger/OpenAPI docs, and WebSocket paths from SPA fallback
    if full_path == "api" or full_path.startswith(("api/", "ws/", "docs", "redoc", "openapi.json")):
        return JSONResponse(status_code=404, content={"detail": f"Route /{full_path} not found"})

    # Check for direct static assets in dist root (e.g. manifest.json, shield.svg, favicon.ico)
    target_file = FRONTEND_DIST_DIR / full_path
    if target_file.is_file():
        return FileResponse(str(target_file))

    # Catch-all: serve index.html for all client-side React routes (/admin, /farmer, /login, etc.)
    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.is_file():
        return FileResponse(str(index_file))

    return JSONResponse(status_code=404, content={"detail": "Frontend build not found. Please build frontend first."})
