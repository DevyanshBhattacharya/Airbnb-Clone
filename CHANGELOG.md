# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Interactive map search with Airbnb-style price-pill markers (Leaflet + OpenStreetMap).
- Reviews: guests can leave a review after a completed stay (star picker + comment), with server-side eligibility.
- Superhost badge and host ratings aggregation (average rating, review and listing counts).
- Image upload to storage (multipart endpoint with a local-disk adapter; cloud-ready interface).
- Dark mode with pre-paint theme initialisation and a navbar toggle.
- Responsive layouts across phone, tablet and desktop, including a mobile search entry and a sticky mobile booking bar.

## [0.3.0] — Phase 3

### Added
- Interactive date-range calendar that blocks already-booked nights.
- "My Trips" page with upcoming/past bookings and cancellation.
- Host dashboard with stats, listing management (edit/delete) and incoming reservations.
- Listing create/edit form ("Become a host") with photos and amenity selection.

## [0.2.0] — Phase 2

### Added
- Next.js marketplace UI: navbar with expandable search pill, category bar, listing cards, search modal.
- Listing detail page: 5-photo gallery + lightbox, amenities, map, reviews and a sticky booking widget.
- Toast notifications, wishlist hearts with optimistic updates, and the typed API client.

## [0.1.0] — Phase 1

### Added
- FastAPI backend with a fully relational SQLite schema (users, listings, images, amenities, bookings, reviews, favorites).
- Search/filter/pagination, listing CRUD, bookings with overlap validation, host dashboard and favorites toggle.
- Reproducible seed script with realistic listings, hosts, photos, amenities and reviews.
