# --- FastAPI backend image -------------------------------------------------
# Deploy this to a container host (Render, Railway, Fly.io, …). Vercel is a
# serverless platform and cannot run this app (a long-lived ASGI process with a
# SQLite file and disk uploads).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first so Docker can cache this layer.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code.
COPY . .
RUN chmod +x entrypoint.sh

# SQLite file + uploads live here by default. Mount a persistent volume at
# /data and set DATABASE_URL=sqlite:////data/airbnb.db to keep them across
# restarts (see render.yaml / docs/DEPLOYMENT.md).
ENV DATABASE_URL=sqlite:////data/airbnb.db \
    DB_FILE=/data/airbnb.db \
    UPLOAD_DIR=/data/uploads

EXPOSE 8000

CMD ["./entrypoint.sh"]
