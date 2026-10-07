# Frontend — Next.js

The web app for the Airbnb clone. See the [project README](../README.md) for the
full setup, and [`docs/frontend-architecture.md`](../docs/frontend-architecture.md)
for the architecture notes.

## Run it

```bash
npm install
cp .env.example .env.local   # optional; defaults to http://127.0.0.1:8000
npm run dev                  # http://localhost:3000
```

The backend must be running on `http://127.0.0.1:8000` (see `../backend`).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Structure

```
app/         # routes (home, /listings/[id], /trips, /host, /wishlist)
components/  # UI components (navbar, cards, calendar, booking widget, map, …)
context/     # mock auth, search state, theme, toasts
lib/         # typed API client, types, formatting helpers, hooks
```
