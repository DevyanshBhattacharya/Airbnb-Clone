"""
Pydantic schemas — the API's request and response contracts.

Why this file exists separately from ``models.py``:
* ORM models describe *storage* (columns, relations, nullability in the DB).
* Pydantic schemas describe *the wire format* (what a client may send and what
  they get back). Keeping them apart means we can expose computed fields
  (``avg_rating``, ``nights``) and hide internal ones without touching tables.

Pydantic v2 reads attributes straight off SQLAlchemy objects via
``from_attributes=True`` (formerly ``orm_mode``).
"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    """Base for schemas that are built from SQLAlchemy ORM instances."""

    model_config = ConfigDict(from_attributes=True)


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
class UserOut(ORMModel):
    id: int
    name: str
    email: str
    avatar_url: str | None = None
    role: str


class HostOut(UserOut):
    """
    A host profile enriched with aggregated trust signals.

    `is_superhost` is derived (see serializers.serialize_host) from the host's
    average rating, review count and listing count — mirroring how Airbnb
    surfaces superhost status as a trust badge rather than a stored flag.
    """

    is_superhost: bool = False
    avg_rating: float | None = None
    reviews_count: int = 0
    listings_count: int = 0


# --------------------------------------------------------------------------- #
# Amenities & images
# --------------------------------------------------------------------------- #
class AmenityOut(ORMModel):
    id: int
    name: str
    icon_name: str


class ListingImageOut(ORMModel):
    id: int
    url: str
    is_primary: bool


# --------------------------------------------------------------------------- #
# Reviews
# --------------------------------------------------------------------------- #
class ReviewOut(ORMModel):
    id: int
    rating: int
    comment: str
    created_at: datetime
    user: UserOut  # the reviewer


class ReviewCreate(BaseModel):
    """Payload for POST /api/reviews — left after a completed stay."""

    booking_id: int
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=1, max_length=2000)


# --------------------------------------------------------------------------- #
# Listings
# --------------------------------------------------------------------------- #
class DateRange(BaseModel):
    """A booked/night interval used to grey out dates in the frontend calendar."""

    check_in: date
    check_out: date


class ListingCard(ORMModel):
    """Compact listing shape used in search results, grids and the wishlist."""

    id: int
    host_id: int
    title: str
    category: str
    property_type: str
    location: str
    city: str
    country: str
    price_per_night: float
    max_guests: int
    bedrooms: int
    beds: int
    baths: float
    latitude: float
    longitude: float
    created_at: datetime

    # --- computed / joined fields (filled in by serializers.py) ---
    primary_image: str | None = None
    # All photos, so the card can render a real image slider.
    image_urls: list[str] = Field(default_factory=list)
    avg_rating: float | None = None
    review_count: int = 0
    is_favorite: bool = False


class ListingDetail(ListingCard):
    """Full listing payload for the listing detail page."""

    description: str
    cleaning_fee: float
    service_fee: float

    host: HostOut
    images: list[ListingImageOut] = Field(default_factory=list)
    amenities: list[AmenityOut] = Field(default_factory=list)
    reviews: list[ReviewOut] = Field(default_factory=list)
    booked_dates: list[DateRange] = Field(default_factory=list)


class ListingCreate(BaseModel):
    """Payload for POST /api/listings (host only)."""

    title: str = Field(min_length=5, max_length=150)
    description: str = Field(min_length=10)
    category: str
    property_type: str
    location: str
    city: str
    country: str
    price_per_night: float = Field(gt=0)
    cleaning_fee: float = Field(default=0, ge=0)
    service_fee: float = Field(default=0, ge=0)
    max_guests: int = Field(default=1, ge=1)
    bedrooms: int = Field(default=1, ge=0)
    beds: int = Field(default=1, ge=1)
    baths: float = Field(default=1, ge=0)
    latitude: float = 0
    longitude: float = 0

    # First image URL becomes the primary photo.
    image_urls: list[str] = Field(default_factory=list)
    amenity_ids: list[int] = Field(default_factory=list)


class ListingUpdate(BaseModel):
    """
    Payload for PUT /api/listings/{id}. Every field is optional so callers can
    send a partial body; ``exclude_unset`` in the router means only the fields
    the client actually sent get written.
    """

    title: str | None = Field(default=None, min_length=5, max_length=150)
    description: str | None = Field(default=None, min_length=10)
    category: str | None = None
    property_type: str | None = None
    location: str | None = None
    city: str | None = None
    country: str | None = None
    price_per_night: float | None = Field(default=None, gt=0)
    cleaning_fee: float | None = Field(default=None, ge=0)
    service_fee: float | None = Field(default=None, ge=0)
    max_guests: int | None = Field(default=None, ge=1)
    bedrooms: int | None = Field(default=None, ge=0)
    beds: int | None = Field(default=None, ge=1)
    baths: float | None = Field(default=None, ge=0)
    latitude: float | None = None
    longitude: float | None = None
    image_urls: list[str] | None = None
    amenity_ids: list[int] | None = None


class PaginatedListings(BaseModel):
    """Envelope for search results so the client knows the total for paging."""

    items: list[ListingCard]
    total: int
    limit: int
    offset: int


# --------------------------------------------------------------------------- #
# Bookings
# --------------------------------------------------------------------------- #
class BookingCreate(BaseModel):
    listing_id: int
    check_in: date
    check_out: date
    guest_count: int = Field(default=1, ge=1)


class BookingOut(ORMModel):
    id: int
    listing_id: int
    user_id: int
    check_in: date
    check_out: date
    total_price: float
    guest_count: int
    status: str
    created_at: datetime

    # --- joined display fields (filled in by serializers.py) ---
    listing_title: str | None = None
    listing_city: str | None = None
    listing_image: str | None = None
    guest_name: str | None = None
    nights: int | None = None

    # --- review eligibility (filled in by the my-trips endpoint) ---
    can_review: bool = False
    reviewed: bool = False


# --------------------------------------------------------------------------- #
# Host dashboard
# --------------------------------------------------------------------------- #
class HostStats(BaseModel):
    total_listings: int
    total_reservations: int
    total_earnings: float
    upcoming_reservations: int


class HostDashboard(BaseModel):
    host: HostOut
    stats: HostStats
    listings: list[ListingCard]
    reservations: list[BookingOut]


# --------------------------------------------------------------------------- #
# Uploads
# --------------------------------------------------------------------------- #
class UploadOut(BaseModel):
    """Response for a stored image; `url` is app-relative (proxied by the frontend)."""

    url: str


# --------------------------------------------------------------------------- #
# Favorites
# --------------------------------------------------------------------------- #
class FavoriteToggle(BaseModel):
    listing_id: int
    favorited: bool
