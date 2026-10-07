# Frontend Architecture (Phase 2)

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Lucide React.
Documentation for the frontend, mirroring `backend-architecture.md`.

---

## 1. Folder layout

```
frontend/
├── app/
│   ├── layout.tsx                 # fonts, providers, Navbar, Footer, toasts
│   ├── globals.css                # Tailwind v4 + Airbnb design tokens (@theme)
│   ├── page.tsx                   # marketplace home (category bar + grid)
│   ├── listings/[id]/page.tsx     # listing detail route (Suspense shell)
│   ├── wishlist/page.tsx          # saved homes
│   ├── trips/page.tsx             # upcoming / past bookings + cancel
│   └── host/{page.tsx,create/page.tsx}  # dashboard + create/edit form
├── components/                    # presentational + interactive UI
│   ├── Navbar.tsx                 # logo, search pill, account menu, theme toggle
│   ├── SearchModal.tsx            # Where / When / Who popover
│   ├── CategoryBar.tsx            # horizontal icon bar
│   ├── ListingCard.tsx            # photo slider, heart, rating, price
│   ├── PhotoGrid.tsx / PhotoViewer.tsx   # 5-photo hero + full-screen gallery
│   ├── BookingWidget.tsx          # sticky card + mocked checkout
│   ├── DateRangeCalendar.tsx      # date picker that blocks booked nights
│   ├── ReviewModal.tsx            # star picker + comment for completed stays
│   ├── SuperhostBadge.tsx         # trust badge
│   ├── LeafletMap.tsx             # client-only wrapper (dynamic, ssr:false)
│   ├── LeafletMapInner.tsx        # Leaflet map + price-pill markers
│   ├── ListingMap.tsx             # single-listing map
│   ├── ListingForm.tsx / ListingFormRoute.tsx  # host create/edit + upload
│   ├── AmenityGrid.tsx / AmenityIcon.tsx
│   ├── ReviewsSection.tsx         # rating breakdown + review cards
│   ├── ListingDetailView.tsx      # detail page composition (+ mobile bar)
│   ├── ListingRoute.tsx           # reads the [id] param
│   └── AirbnbLogo.tsx / Footer.tsx
├── context/
│   ├── UserContext.tsx            # mock auth (acting guest/host profile)
│   ├── SearchContext.tsx          # shared search filters
│   ├── ThemeContext.tsx           # light/dark theme
│   └── ToastContext.tsx           # toast notifications
└── lib/
    ├── types.ts                   # TS mirrors of backend schemas
    ├── api.ts                     # typed fetch wrapper (adds X-User-Id)
    ├── format.ts                  # price/date/nights helpers
    └── useHydrated.ts             # client-mount guard (see §5)
```

---

## 2. Data fetching: client-side, on purpose

Pages are Client Components and fetch from FastAPI in `useEffect`. The reason:
the mock-auth profile lives in **client state** (so the user can switch between
Guest and Host mode instantly), and it drives `is_favorite` on every listing and
the acting user on every booking. Server Components can't read that state.

`lib/api.ts` is the single place that talks to the backend. It attaches the
`X-User-Id` header and normalizes FastAPI's `detail` error field into a thrown
`ApiError`.

Trade-off (worth stating in a review): the initial HTML is a skeleton, then data
streams in on the client. For a local demo with a mocked identity that is the
right call; with real auth you would read the session on the server and fetch
the initial data server-side.

---

## 3. Mock auth, end to end

| Layer | Mechanism |
| --- | --- |
| Backend | `X-User-Id` header → `get_current_user` dependency |
| Frontend | `UserContext` holds the acting user id (persisted in localStorage) |
| Switch | Navbar menu "Switch to hosting / travelling" flips between the demo guest (id 1) and host (id 2) |
| Propagation | `lib/api.ts` sends the id on every request; components pass `user.id` |

`GET /api/users` seeds `UserContext` with the demo profiles so the switcher
knows the ids and the navbar can show the acting avatar.

---

## 4. Design system

Tailwind v4 is configured entirely in `app/globals.css` via `@theme`, which
generates utilities from design tokens automatically:

```css
@theme {
  --color-ink: #222222;        /* primary text  -> text-ink   */
  --color-muted: #717171;      /* secondary text -> text-muted */
  --color-hairline: #dddddd;   /* borders        -> border-hairline */
  --color-surface: #f7f7f7;    /* hover fills    -> bg-surface */
  --color-rausch: #ff385c;     /* brand accent   -> bg-rausch, text-rausch */
  --shadow-card: 0 6px 16px rgba(0,0,0,.12);  /* -> shadow-card */
}
```

Typography uses **Inter** (via `next/font`), the closest open substitute for
Airbnb's proprietary Cereal typeface. The logo is the lowercase wordmark in
Rausch (the bélo symbol is trademarked).

---

## 5. Next.js 16 notes (this version differs from most training data)

These are the framework-specific decisions worth knowing:

1. **`params` is a Promise.** The detail route reads the id with
   `useParams<{ id: string }>()` inside `ListingRoute`, wrapped in `<Suspense>`.
2. **URL-reading client hooks need a Suspense boundary.** `cacheComponents:
   true` is enabled by default in this scaffold, so `usePathname()` (Navbar) and
   `useParams()` (detail route) must sit under `<Suspense>` or the build fails
   with `CLIENT_HOOK_DYNAMIC`. The Navbar is wrapped in the layout; the detail
   route wraps `ListingRoute`.
3. **Hydration guard for async client data.** The mock-auth profile is fetched
   in `UserContext`. If it resolves *during* React's hydration pass, the Navbar
   would hydrate an avatar `<img>` where the server rendered a placeholder
   `<span>` → a hydration mismatch. `useHydrated()` returns `false` until after
   mount, so the user-dependent UI renders the server's placeholder on the first
   client render and swaps in the real profile as a normal update. This is the
   correct fix rather than `suppressHydrationWarning`.
4. **Remote images** are enabled for `images.unsplash.com` and `randomuser.me`
   in `next.config.ts`.
5. **`new Date()` is an "unstable value" during prerender.** On `/trips` the
   current date is read in a `useEffect` (into state) rather than during render,
   so the current time never gets baked into the static shell.
6. **Leaflet is loaded with `next/dynamic({ ssr: false })`.** Leaflet touches
   `window` at import time, so `LeafletMap` defers `LeafletMapInner` to the
   browser and shows a placeholder in the static shell. The map is a real,
   interactive OpenStreetMap view with price-pill `divIcon` markers — no API key,
   no default marker image assets.

---

## 5b. Dark mode

The palette lives in CSS variables (`--canvas`, `--ink`, `--hairline`, …) that
are redefined under `.dark`. `@theme inline` exposes them as Tailwind utilities
(`bg-canvas`, `text-ink`, `border-hairline`), so components never hardcode hex
values and automatically adapt. A tiny inline script in the root layout applies
the persisted/system theme *before paint* (no flash), and `ThemeContext` syncs
React state and persists the choice.

## 5c. Reviews, Superhost & uploads (frontend)

- **Reviews** — a completed stay in My Trips shows *Leave a review*, opening
  `ReviewModal` (star picker + comment). Success flips the card to *Reviewed*.
  Eligibility is decided by the backend (`can_review` / `reviewed` on the trip).
- **Superhost** — `SuperhostBadge` renders wherever the backend says a host
  qualifies; the listing detail also shows the host's aggregate rating, review
  count and listing count.
- **Uploads** — the host form's *Upload* button posts a file to `/api/uploads`
  via `uploadImage()` (raw `fetch` + `FormData`, since `apiFetch` forces JSON)
  and appends the returned URL to the gallery.

---

## 6. Notable component decisions

- **`ListingMap`** embeds OpenStreetMap's own viewer in an `<iframe>` instead of
  shipping Leaflet. It is a real pannable/zoomable map, needs no API key, and
  adds zero JavaScript to the bundle.
- **Prices** are always recomputed on the server (`POST /api/bookings`); the
  widget's breakdown is display-only and mirrors the backend formula
  `nights × rate + cleaning + service`.
- **Blocked dates** in the booking widget reuse the same half-open overlap rule
  as the backend (`lib/format.ts: overlapsBooked`), so the calendar and the
  server can never disagree.
- **Favorites** update optimistically and roll back on error, with a toast.

---

## 7. Known limitations (current scope)

- The map is an embed (no custom markers or price pins).
- No test suite is committed; verification was done with Playwright scripts
  (Phases 2 and 3: home render, category filter, search, wishlist, detail page,
  booking confirmation, calendar blocking, My Trips cancel, and the full host
  create → edit → delete lifecycle) plus a hydration-mismatch soak test.
