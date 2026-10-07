# Convenience targets for local development.
# Usage: `make help`

BACKEND  := backend
FRONTEND := frontend
PY       := $(BACKEND)/.venv/bin/python
PIP      := $(BACKEND)/.venv/bin/pip

.PHONY: help install backend-install backend-seed backend frontend-install frontend build

help:
	@echo "Airbnb Clone — available targets:"
	@echo "  make install           Install backend + frontend dependencies"
	@echo "  make backend-seed      Create and populate the SQLite database"
	@echo "  make backend           Run the FastAPI dev server (http://127.0.0.1:8000)"
	@echo "  make frontend          Run the Next.js dev server (http://localhost:3000)"
	@echo "  make build             Production build of the frontend"

install: backend-install frontend-install

backend-install:
	cd $(BACKEND) && python3 -m venv .venv && $(PIP) install -r requirements.txt

backend-seed:
	cd $(BACKEND) && $(PY) seed.py

backend:
	cd $(BACKEND) && .venv/bin/uvicorn main:app --reload

frontend-install:
	cd $(FRONTEND) && npm install

frontend:
	cd $(FRONTEND) && npm run dev

build:
	cd $(FRONTEND) && npm run build
