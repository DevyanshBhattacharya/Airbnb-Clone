# Deployment

This project deploys to **Vercel as one project** using [Vercel Services](https://vercel.com/docs/services)
(beta, available on all plans). Services let a single Vercel project run multiple
applications — here a **Next.js frontend** and a **FastAPI backend** — on one
domain, with routing handled by Vercel.

```
                         ┌──────────────────────────────┐
  https://<app>.vercel.app│  Vercel project (one domain)  │
                         │                               │
   /            ────────▶ │  service "web"  (Next.js)     │  frontend/
   /api/*       ────────▶ │  service "backend" (FastAPI)  │  backend/
   /uploads/*   ────────▶ │  service "backend" (FastAPI)  │
                         └──────────────────────────────┘
```

The frontend calls the API at the **same origin** (`/api/...`), so there is no
CORS and no separate backend URL to configure.

---

## 1. What's in the repo

| File | Purpose |
| --- | --- |
| [`vercel.json`](../vercel.json) (repo root) | Declares the two services + public routing. |
| `frontend/` | Next.js service, mounted at `/`. |
| `backend/` | FastAPI service, mounted at `/api` and `/uploads`, entrypoint `main:app`. |

`vercel.json`:

```json
{
  "services": {
    "web":     { "root": "frontend/", "framework": "nextjs" },
    "backend": { "root": "backend/", "framework": "fastapi", "entrypoint": "main:app" }
  },
  "rewrites": [
    { "source": "/uploads/(.*)", "destination": { "service": "backend" } },
    { "source": "/api/(.*)",     "destination": { "service": "backend" } },
    { "source": "/(.*)",         "destination": { "service": "web" } }
  ]
}
```

## 2. Deploy

### Option A — Vercel dashboard

1. Push this repository to GitHub (it already has a remote).
2. Vercel → **Add New → Project** → import the repo.
3. **Leave the Root Directory as the repository root** (do **not** set it to
   `frontend` — with Services the whole repo is the project).
4. Set **Framework Preset → Services**.
5. Add an environment variable:
   - **`NEXT_PUBLIC_API_URL` = `same-origin`** (all services, Production + Preview).
6. **Deploy.**

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link            # run at the repo root; framework: Services
vercel env add NEXT_PUBLIC_API_URL   # value: same-origin
vercel --prod
```

### Verify

- `https://<app>.vercel.app/api/health` → `{"status":"ok"}`
- `https://<app>.vercel.app/docs` → the FastAPI Swagger UI
- `https://<app>.vercel.app/` → the marketplace, with listings loading.

---

## 3. Data persistence (important)

Vercel Functions have a **read-only filesystem except `/tmp`**, and `/tmp` is
**ephemeral and per-instance**. The backend detects Vercel and defaults to
`sqlite:////tmp/airbnb.db` + `/tmp/uploads`, and **seeds the demo data on a fresh
database** (`main.py`), so the app works out of the box. The trade-offs:

- Data **resets on cold starts / new instances** and uploads don't persist.
- For a portfolio demo under light traffic this is usually fine.

For durable data, either:

- **Postgres** — create a free [Neon](https://neon.tech) (or Vercel Postgres)
  database, then set `DATABASE_URL` on the Vercel project and add
  `psycopg[binary]` to `backend/requirements.txt`. The SQLAlchemy models are
  unchanged.
- **Blob storage** — point the upload path at Vercel Blob / S3 (the upload
  endpoint is already swappable — see `backend/routers/uploads.py`).

> Environment variables are read by the backend from `DATABASE_URL`,
> `CORS_ORIGINS` and `UPLOAD_DIR` — no code changes needed.

---

## 4. Alternative: frontend on Vercel, backend on a container host

If you'd rather keep the backend on its own host (e.g. for a real, persistent
SQLite file), the repo is also set up for that:

1. **Backend → Render** via [`render.yaml`](../render.yaml) +
   [`backend/Dockerfile`](../backend/Dockerfile). Set `CORS_ORIGINS` to your
   Vercel URL.
2. **Frontend → Vercel** as a normal Next.js project:
   - **Root Directory = `frontend`**
   - `NEXT_PUBLIC_API_URL` = the Render service URL (absolute).

See the git history / earlier revisions of this document for the step-by-step
version of this path.

---

## 5. Local development

**Two terminals (simplest):**

```bash
# terminal 1
cd backend && python seed.py && uvicorn main:app --reload

# terminal 2
cd frontend && npm run dev        # NEXT_PUBLIC_API_URL defaults to 127.0.0.1:8000
```

**Or run the whole project exactly as Vercel does, in one command:**

```bash
vercel dev -L     # -L = local, no cloud auth needed
```

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Build succeeds but every route 500s | Framework Preset must be **Services**, Root Directory must be the **repo root**, and `vercel.json` must be at the repo root. |
| Frontend loads but shows "We couldn't load listings" | `NEXT_PUBLIC_API_URL` must be `same-origin` (and redeploy — `NEXT_PUBLIC_*` is baked in at build time). |
| `/api/*` returns 404 | The `rewrites` block in `vercel.json` is missing, or its order is wrong (backend rewrites must come before the `/(.*)` catch-all). |
| Data disappears after a while | Expected with ephemeral SQLite — see §3 (add Postgres for persistence). |
| Uploaded images 404 | `/uploads/*` must route to the `backend` service (`vercel.json`), and `UPLOAD_DIR` must be writable (`/tmp/uploads` on Vercel). |
