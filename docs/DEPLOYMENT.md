# Deployment

The project is two apps, and they deploy to **two different kinds of host**:

| Part | Host | Why |
| --- | --- | --- |
| **Frontend** (`frontend/`) | **Vercel** | It's a Next.js app — Vercel's native target. |
| **Backend** (`backend/`) | A **container host** (Render, Railway, Fly.io, …) | It's a long-running FastAPI/ASGI process with a SQLite file and disk uploads. |

> **Why not the backend on Vercel too?** Vercel runs stateless serverless
> functions with an ephemeral, read-only filesystem. A FastAPI server with a
> local SQLite file and uploaded images doesn't fit that model — the database
> would reset on every cold start and uploads would vanish. Hosting it as a
> container (or moving to Postgres + object storage) is the correct approach.

---

## 1. Deploy the backend (Render, via the blueprint)

The repo includes [`render.yaml`](../render.yaml) and a [`backend/Dockerfile`](../backend/Dockerfile).

1. Push this repo to GitHub.
2. On [Render](https://render.com): **New → Blueprint**, connect the repo. It will
   pick up `render.yaml` and build the Docker image from `backend/`.
3. Wait for the first deploy, then copy the service URL, e.g.
   `https://airbnb-clone-api.onrender.com`.
4. Open **Environment** and add:
   - `CORS_ORIGINS` = your Vercel URL (you'll get it in step 2). You can add it
     after the frontend deploy and redeploy.
5. Verify: `https://<your-service>.onrender.com/api/health` → `{"status":"ok"}`
   and `/docs` shows the API.

**Data persistence.** The free plan has an ephemeral disk, so the demo data is
re-seeded whenever the service starts. To keep data across restarts, add a disk
on a paid plan:

```yaml
    disk:
      name: data
      mountPath: /data
      sizeGB: 1
```

The `Dockerfile` already points `DATABASE_URL`, `DB_FILE` and `UPLOAD_DIR` at
`/data`, so no other change is needed.

### Alternatives
- **Railway / Fly.io:** both run the same `backend/Dockerfile`. Set `CORS_ORIGINS`
  (and optionally `DATABASE_URL`, `UPLOAD_DIR`) as environment variables. Railway/Fly
  also offer persistent volumes — mount one and point `DATABASE_URL` at it.
- **Postgres instead of SQLite:** set `DATABASE_URL` to a Postgres URL and add
  `psycopg[binary]` to `requirements.txt`. The SQLAlchemy models are unchanged.

---

## 2. Deploy the frontend (Vercel)

1. On [Vercel](https://vercel.com): **Add New → Project**, import the same repo.
2. **Important — set the Root Directory to `frontend`.** The repo is a monorepo,
   so Vercel must build from `frontend/`, not the repo root. If this is left at
   the root, the deployment builds incorrectly and every route can 500.
   - Settings → Build and Deployment → **Root Directory** → `frontend`.
   - Framework Preset: **Next.js** (also pinned in `frontend/vercel.json`).
3. Add an environment variable:
   - `NEXT_PUBLIC_API_URL` = your backend URL from step 1
     (e.g. `https://airbnb-clone-api.onrender.com`).
   > `NEXT_PUBLIC_*` values are inlined at **build time**, so after changing this
   > you must **redeploy** for it to take effect.
4. Deploy. Visit the URL — the home page should load listings from the backend.

Finally, go back to Render and set `CORS_ORIGINS` to the Vercel domain
(`https://<your-app>.vercel.app`), then redeploy the backend. Without this the
browser blocks the API calls (CORS) and the app shows "We couldn't load listings".

---

## Troubleshooting

### Every route returns 500 `FUNCTION_INVOCATION_FAILED`
This is the classic monorepo symptom. Check, in order:

1. **Root Directory is `frontend`** (Settings → Build and Deployment). This is
   the cause in the vast majority of cases.
2. **Framework Preset is Next.js** (or `frontend/vercel.json` is present — it is).
3. The `cacheComponents` / `partialPrefetching` flags are **off** in
   `frontend/next.config.ts`. They are experimental and have caused serverless
   runtime crashes; the app does not need them.
4. `engines.node` is `>=20.9` (Next.js 16 requirement) — set in `frontend/package.json`.

### The page loads but shows "We couldn't load listings"
- `NEXT_PUBLIC_API_URL` is missing or wrong on Vercel → set it and **redeploy**.
- The backend's `CORS_ORIGINS` doesn't include the Vercel domain → add it.
- The backend is asleep (Render free spins down) — the first request may take a
  few seconds; retry.

### Uploaded images don't render
`/uploads/*` is proxied to the backend through a `rewrites()` rule. Ensure
`NEXT_PUBLIC_API_URL` points at the deployed backend and that the backend
`UPLOAD_DIR` is writable (a mounted disk for persistence).

### The map is blank
The map needs outbound access to OpenStreetMap tiles and runs only on the client
(`ssr: false`), so a blocked network or a very slow connection shows the loading
placeholder.
