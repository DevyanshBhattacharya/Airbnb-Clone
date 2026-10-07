"""
FastAPI application entry point.

Run it with:  uvicorn main:app --reload   (from inside the backend/ folder)

This file does three things and nothing else:
  1. creates the tables on startup,
  2. configures CORS so the Next.js dev server can call the API,
  3. registers the routers.
"""

from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import models  # noqa: F401  (imported so SQLAlchemy knows every table)
from database import Base, engine
from routers import bookings, listings, uploads, users
from routers.uploads import UPLOAD_DIR


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """
    Create any missing tables when the server boots. ``create_all`` is
    idempotent — it only creates tables that don't already exist — so this is
    safe to run on every start. For schema *changes* you would reintroduce a
    migration tool, but for this assignment re-running ``python seed.py``
    rebuilds the schema from scratch.
    """
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Airbnb Clone API",
    version="1.0.0",
    description="Backend for a full-stack Airbnb clone (SDE assignment).",
    lifespan=lifespan,
)

# The Next.js app runs on :3000 (and sometimes :3001 if 3000 is taken). In
# production, set CORS_ORIGINS to a comma-separated list of allowed origins,
# e.g. CORS_ORIGINS="https://your-app.vercel.app".
_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
_configured = os.getenv("CORS_ORIGINS", "").strip()
allow_origins = (
    [origin.strip() for origin in _configured.split(",") if origin.strip()]
    if _configured
    else _default_origins
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resource routers. Each declares its own /api prefix and tags for the docs UI.
app.include_router(listings.router)
app.include_router(listings.reference_router)
app.include_router(bookings.router)
app.include_router(users.router)
app.include_router(uploads.router)

# Serve uploaded images back to the browser. In production this would be a CDN
# bucket instead of a local directory.
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/", tags=["meta"])
def root():
    """Tiny landing response so hitting the base URL isn't a 404."""
    return {
        "service": "Airbnb Clone API",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}
