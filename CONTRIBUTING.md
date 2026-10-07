# Contributing

Thanks for taking a look. This is a full-stack demo project, but it follows
normal contribution hygiene.

## Getting set up

```bash
git clone <your-fork-or-repo-url>
cd Airbnb
make install          # backend venv + pip install, and frontend npm install
make backend-seed     # create + populate the SQLite database
```

Then run the two servers in separate terminals:

```bash
make backend          # http://127.0.0.1:8000  (API + /docs)
make frontend         # http://localhost:3000  (web app)
```

See the [README](README.md) for full details.

## Before opening a pull request

- `cd frontend && npm run build` passes (this also type-checks).
- If you touched the backend, the API still boots: `cd backend && python -c "from main import app; app.openapi()"`.
- Keep the code readable — the project deliberately avoids unnecessary
  abstractions so every line can be explained.

## Conventions

- **Branches:** `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
- **Commits:** imperative mood, a short summary line, e.g.
  `Add superhost aggregation to the host dashboard`.
- **Formatting:** match the surrounding file. `.editorconfig` covers indentation
  (2 spaces for TS/CSS/JSON, 4 for Python, tabs in the Makefile).
- **Scope:** one logical change per PR.

## Project layout

| Path | What lives there |
| --- | --- |
| `backend/` | FastAPI app, SQLAlchemy models, Pydantic schemas, routers, seed |
| `frontend/` | Next.js App Router UI, components, contexts, API client |
| `docs/` | Architecture docs, the Airbnb feature study, screenshots |
