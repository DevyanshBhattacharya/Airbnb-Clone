"""
Listing endpoints.

Routes are grouped under ``/api/listings``. The ``reference_router`` exposes
small lookup endpoints (amenities, categories) that the frontend needs to build
its filter UI and host form — they live here to keep the router count small.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user, require_host
from models import Amenity, Booking, Listing, ListingImage, User
from schemas import (
    AmenityOut,
    ListingCreate,
    ListingDetail,
    ListingUpdate,
    PaginatedListings,
)
from serializers import serialize_listing_card, serialize_listing_detail

router = APIRouter(prefix="/api/listings", tags=["listings"])
reference_router = APIRouter(prefix="/api", tags=["reference"])


# --------------------------------------------------------------------------- #
# Reference data (declared before /{listing_id} so "amenities" isn't parsed
# as an id)
# --------------------------------------------------------------------------- #
@reference_router.get("/amenities", response_model=list[AmenityOut])
def list_amenities(db: Session = Depends(get_db)):
    """All amenities, for the host create/edit form's checkbox grid."""
    return db.query(Amenity).order_by(Amenity.name).all()


@reference_router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    """Distinct categories actually present in the data, for the category bar."""
    rows = db.query(Listing.category).distinct().order_by(Listing.category).all()
    return [row[0] for row in rows]


# --------------------------------------------------------------------------- #
# Search
# --------------------------------------------------------------------------- #
@router.get("", response_model=PaginatedListings)
def search_listings(
    q: str | None = Query(None, description="Free-text search over title/location"),
    city: str | None = None,
    category: str | None = None,
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    guests: int | None = Query(None, ge=1),
    check_in: date | None = Query(None, description="Availability search start"),
    check_out: date | None = Query(None, description="Availability search end"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search and filter listings.

    Filters compose as AND conditions. The date filter removes any listing that
    already has a *confirmed* booking overlapping the requested window. Because
    filters are added to one SQLAlchemy query, SQLite does the work (count +
    page) rather than the app fetching everything and filtering in Python.
    """
    query = db.query(Listing)

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Listing.title.ilike(like),
                Listing.location.ilike(like),
                Listing.city.ilike(like),
                Listing.country.ilike(like),
            )
        )
    if city:
        query = query.filter(Listing.city.ilike(f"%{city}%"))
    if category:
        query = query.filter(Listing.category == category)
    if min_price is not None:
        query = query.filter(Listing.price_per_night >= min_price)
    if max_price is not None:
        query = query.filter(Listing.price_per_night <= max_price)
    if guests is not None:
        query = query.filter(Listing.max_guests >= guests)

    # Availability: exclude listings with an overlapping confirmed booking.
    if check_in is not None and check_out is not None:
        if check_in >= check_out:
            raise HTTPException(
                status_code=400, detail="check_out must be after check_in"
            )
        overlapping_listing_ids = db.query(Booking.listing_id).filter(
            Booking.status == "confirmed",
            Booking.check_in < check_out,
            Booking.check_out > check_in,
        )
        query = query.filter(Listing.id.not_in(overlapping_listing_ids))

    total = query.count()
    listings = (
        query.order_by(Listing.created_at.desc()).offset(offset).limit(limit).all()
    )

    return PaginatedListings(
        items=[serialize_listing_card(db, listing, current_user) for listing in listings],
        total=total,
        limit=limit,
        offset=offset,
    )


# --------------------------------------------------------------------------- #
# Detail
# --------------------------------------------------------------------------- #
@router.get("/{listing_id}", response_model=ListingDetail)
def get_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full detail: host, photos, amenities, reviews and booked date ranges."""
    listing = db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    return serialize_listing_detail(db, listing, current_user)


# --------------------------------------------------------------------------- #
# Create / update / delete (host only)
# --------------------------------------------------------------------------- #
@router.post("", response_model=ListingDetail, status_code=status.HTTP_201_CREATED)
def create_listing(
    payload: ListingCreate,
    db: Session = Depends(get_db),
    host: User = Depends(require_host),
):
    """Create a listing owned by the acting host."""
    # Everything except the two relational lists maps 1:1 to Listing columns.
    listing = Listing(
        host_id=host.id,
        **payload.model_dump(exclude={"image_urls", "amenity_ids"}),
    )

    # First image is the primary photo.
    listing.images = [
        ListingImage(url=url, is_primary=(index == 0))
        for index, url in enumerate(payload.image_urls)
    ]

    # Resolve amenity ids to rows in one query.
    if payload.amenity_ids:
        listing.amenities = (
            db.query(Amenity).filter(Amenity.id.in_(payload.amenity_ids)).all()
        )

    db.add(listing)
    db.commit()
    db.refresh(listing)
    return serialize_listing_detail(db, listing, host)


@router.put("/{listing_id}", response_model=ListingDetail)
def update_listing(
    listing_id: int,
    payload: ListingUpdate,
    db: Session = Depends(get_db),
    host: User = Depends(require_host),
):
    """Update a listing. Only the listing's own host may edit it."""
    listing = db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.host_id != host.id:
        raise HTTPException(status_code=403, detail="You do not own this listing")

    # exclude_unset -> a partial body only touches the fields it sent.
    for field, value in payload.model_dump(
        exclude_unset=True, exclude={"image_urls", "amenity_ids"}
    ).items():
        setattr(listing, field, value)

    # A non-null image_urls means "replace the gallery".
    if payload.image_urls is not None:
        listing.images = [
            ListingImage(url=url, is_primary=(index == 0))
            for index, url in enumerate(payload.image_urls)
        ]

    # Same idea for amenities.
    if payload.amenity_ids is not None:
        listing.amenities = (
            db.query(Amenity).filter(Amenity.id.in_(payload.amenity_ids)).all()
        )

    db.commit()
    db.refresh(listing)
    return serialize_listing_detail(db, listing, host)


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    host: User = Depends(require_host),
):
    """Delete a listing. Cascades to its images, bookings, reviews and favorites."""
    listing = db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.host_id != host.id:
        raise HTTPException(status_code=403, detail="You do not own this listing")

    db.delete(listing)
    db.commit()
    return None
