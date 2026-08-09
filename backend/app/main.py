from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.chat import router as chat_router
from app.api.tools import router as tools_router
from app.api.mcp_servers import router as servers_router
from app.api.upload import upload_router, settings_router
from app.api.auth import router as auth_router
from app.api.calendar import router as calendar_router
from app.api.approval import router as approval_router
from app.api.email import router as email_router
from app.api.ws import router as ws_router
from app.api.telemetry import router as telemetry_router

from sqlalchemy import text

# Initialize Database tables
Base.metadata.create_all(bind=engine)

# Auto-migrate SQLite schema if new column added
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255)"))
        conn.commit()
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for Frontend UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(chat_router, prefix=settings.API_PREFIX)
app.include_router(tools_router, prefix=settings.API_PREFIX)
app.include_router(servers_router, prefix=settings.API_PREFIX)
app.include_router(upload_router, prefix=settings.API_PREFIX)
app.include_router(settings_router, prefix=settings.API_PREFIX)
app.include_router(calendar_router, prefix=settings.API_PREFIX)
app.include_router(approval_router, prefix=settings.API_PREFIX)
app.include_router(email_router, prefix=settings.API_PREFIX)
app.include_router(ws_router, prefix=settings.API_PREFIX)
app.include_router(telemetry_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs"
    }

import os
from fastapi.responses import FileResponse
from fastapi import HTTPException

@app.get("/api/downloads/{filename}")
def download_file(filename: str):
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(os.getcwd(), "generated_docs", safe_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File '{safe_filename}' not found.")
    return FileResponse(
        path=file_path,
        filename=safe_filename,
        media_type="application/octet-stream"
    )

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
