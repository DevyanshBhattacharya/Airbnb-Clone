"""
Image uploads.

The assignment lists "image upload to cloud storage". Real cloud storage needs
credentials we don't have here, so this endpoint implements the *interface* a
cloud adapter would implement — validate, store, return a URL — with a local-disk
backend as the default. Swapping in S3/Cloudinary later means replacing the two
lines that write the file and build the URL; nothing else changes (the frontend
just receives a URL either way).

Files are written to UPLOAD_DIR (backend/uploads/ by default) and served by
FastAPI's StaticFiles mount at /uploads/<name> (see main.py).
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from deps import require_host
from models import User
from runtime_paths import uses_ephemeral_storage
from schemas import UploadOut

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

# uploads/ sits next to the routers/ package (backend/uploads/) by default.
# On hosts with persistent storage, point UPLOAD_DIR at a mounted volume; on
# Vercel (read-only fs except /tmp) the default moves to /tmp/uploads.
_default_upload_dir = (
    Path("/tmp/uploads")
    if uses_ephemeral_storage()
    else Path(__file__).resolve().parent.parent / "uploads"
)
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", _default_upload_dir))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Restrict to real image types and cap the size to keep the demo sane.
ALLOWED_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("", response_model=UploadOut, status_code=201)
def upload_image(
    file: UploadFile = File(...),
    _host: User = Depends(require_host),
):
    """Store an uploaded image and return its public URL. Host-only."""
    extension = ALLOWED_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use JPEG, PNG, WebP or GIF.",
        )

    # Read one byte past the limit so we can reject oversize files without
    # loading an unbounded amount into memory.
    contents = file.file.read(MAX_BYTES + 1)
    if len(contents) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller")

    filename = f"{uuid.uuid4().hex}.{extension}"
    (UPLOAD_DIR / filename).write_bytes(contents)

    # App-relative URL. The Next.js frontend proxies /uploads/* back to this
    # service (see next.config.ts rewrites), so the image is same-origin from the
    # browser's perspective — which also lets next/image optimize local paths
    # without a remotePattern.
    return UploadOut(url=f"/uploads/{filename}")
