"""
Serialization helpers that turn ORM objects into Pydantic response schemas.

Several endpoints (search, detail, wishlist, host dashboard) need the *same*
computed values — primary image, average rating, favorite flag — but those
values live across multiple tables. Instead of duplicating that logic in every
router, it lives here in one place. This is deliberate: it is the only shared
"glue" module, so there is no hidden abstraction to explain in an interview.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Booking, Favorite, Listing, Review
from schemas import (
    AmenityOut,
    BookingOut,
    DateRange,
    HostOut,
    ListingCard,
    ListingDetail,
    ListingImageOut,
    UserOut,
)

# A host is shown as a Superhost once they clear these thresholds. Airbnb uses
# similar (stricter) criteria; this is a readable approximation for the demo.
SUPERHOST_MIN_RATING = 4.8
SUPERHOST_MIN_REVIEWS = 5


def _rating_stats(db: Session, listing_id: int) -> tuple[float | None, int]:
    """Return (average rating rounded to 1 dp, number of reviews) for a listing."""
    avg, count = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.listing_id == listing_id)
        .one()
    )
    return (round(float(avg), 1) if avg is not None else None), int(count)


def _primary_image_url(listing: Listing) -> str | None:
    """Prefer the image flagged primary; otherwise fall back to the first."""
    if not listing.images:
        return None
    primary = next((img.url for img in listing.images if img.is_primary), None)
    return primary or listing.images[0].url


def serialize_host(db: Session, user: User) -> HostOut:
    """
    Build a host profile with aggregated trust signals.

    One query aggregates the rating/review count across all of the host's
    listings; a second counts their listings. Superhost status is then derived
    from those aggregates.
    """
    avg, reviews_count = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .join(Listing, Review.listing_id == Listing.id)
        .filter(Listing.host_id == user.id)
        .one()
    )
    listings_count = (
        db.query(func.count(Listing.id)).filter(Listing.host_id == user.id).scalar() or 0
    )

    avg_rating = round(float(avg), 1) if avg is not None else None
    is_superhost = bool(
        avg_rating is not None
        and avg_rating >= SUPERHOST_MIN_RATING
        and reviews_count >= SUPERHOST_MIN_REVIEWS
        and listings_count >= 1
    )

    return HostOut(
        id=user.id,
        name=user.name,
        email=user.email,
        avatar_url=user.avatar_url,
        role=user.role,
        is_superhost=is_superhost,
        avg_rating=avg_rating,
        reviews_count=int(reviews_count),
        listings_count=int(listings_count),
    )


def serialize_listing_card(
    db: Session, listing: Listing, current_user=None
) -> ListingCard:
    """Build the compact card shape used in grids and search results."""
    avg_rating, review_count = _rating_stats(db, listing.id)

    is_favorite = False
    if current_user is not None:
        is_favorite = (
            db.query(Favorite.id)
            .filter(Favorite.user_id == current_user.id, Favorite.listing_id == listing.id)
            .first()
            is not None
        )

    return ListingCard(
        id=listing.id,
        host_id=listing.host_id,
        title=listing.title,
        category=listing.category,
        property_type=listing.property_type,
        location=listing.location,
        city=listing.city,
        country=listing.country,
        price_per_night=listing.price_per_night,
        max_guests=listing.max_guests,
        bedrooms=listing.bedrooms,
        beds=listing.beds,
        baths=listing.baths,
        latitude=listing.latitude,
        longitude=listing.longitude,
        created_at=listing.created_at,
        primary_image=_primary_image_url(listing),
        image_urls=[img.url for img in listing.images],
        avg_rating=avg_rating,
        review_count=review_count,
        is_favorite=is_favorite,
    )


def serialize_listing_detail(
    db: Session, listing: Listing, current_user=None
) -> ListingDetail:
    """Build the full detail shape: card fields + host, photos, amenities, reviews."""
    card = serialize_listing_card(db, listing, current_user)

    # Only *confirmed* bookings block the calendar; cancelled ones free the dates.
    booked_dates = [
        DateRange(check_in=b.check_in, check_out=b.check_out)
        for b in db.query(Booking)
        .filter(Booking.listing_id == listing.id, Booking.status == "confirmed")
        .order_by(Booking.check_in)
        .all()
    ]

    return ListingDetail(
        **card.model_dump(),
        description=listing.description,
        cleaning_fee=listing.cleaning_fee,
        service_fee=listing.service_fee,
        host=serialize_host(db, listing.host),
        images=[ListingImageOut.model_validate(img) for img in listing.images],
        amenities=[AmenityOut.model_validate(a) for a in listing.amenities],
        reviews=[
            {
                "id": r.id,
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at,
                "user": UserOut.model_validate(r.user),
            }
            for r in sorted(listing.reviews, key=lambda r: r.created_at, reverse=True)
        ],
        booked_dates=booked_dates,
    )


def serialize_booking(booking: Booking) -> BookingOut:
    """Build a booking response with denormalized listing/guest display fields."""
    listing = booking.listing
    nights = (booking.check_out - booking.check_in).days

    return BookingOut(
        id=booking.id,
        listing_id=booking.listing_id,
        user_id=booking.user_id,
        check_in=booking.check_in,
        check_out=booking.check_out,
        total_price=booking.total_price,
        guest_count=booking.guest_count,
        status=booking.status,
        created_at=booking.created_at,
        listing_title=listing.title if listing else None,
        listing_city=listing.city if listing else None,
        listing_image=_primary_image_url(listing) if listing else None,
        guest_name=booking.user.name if booking.user else None,
        nights=nights,
    )
