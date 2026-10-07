#!/bin/sh
# Container entrypoint: make sure the data directory exists, seed the demo data
# the first time, then run the API.
set -e

DB_FILE="${DB_FILE:-./airbnb.db}"
mkdir -p "$(dirname "$DB_FILE")"
mkdir -p "${UPLOAD_DIR:-./uploads}"

if [ ! -f "$DB_FILE" ]; then
  echo "No database at $DB_FILE — seeding demo data."
  python seed.py
fi

exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
