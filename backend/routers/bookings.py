"""
Booking endpoints and the host dashboard.

The most important logic in the whole backend lives here: the availability
check that stops two guests from booking the same listing for overlapping
nights.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user, require_host
from models import Booking, Listing, Review, User
from schemas import (
    BookingCreate,
    BookingOut,
    HostDashboard,
    HostStats,
    ReviewCreate,
    ReviewOut,
)
from serializers import serialize_booking, serialize_host, serialize_listing_card

router = APIRouter(prefix="/api", tags=["bookings"])


def calculate_total(listing: Listing, nights: int) -> float:
    """
    Price a stay the same way the frontend shows it:

        nightly rate * nights  +  one-off cleaning fee  +  flat service fee
    """
    return round(
        listing.price_per_night * nights + listing.cleaning_fee + listing.service_fee, 2
    )


def find_overlapping_booking(
    db: Session, listing_id: int, check_in: date, check_out: date
) -> Booking | None:
    """
    Return an existing confirmed booking that overlaps [check_in, check_out),
    or None if the range is free.

    Overlap rule
    ------------
    Two half-open date ranges [a_in, a_out) and [b_in, b_out) overlap iff:

        a_in  < b_out   AND   b_in < a_out

    The strict "<" is what lets a guest check out on the same day the next
    guest checks in — the shared boundary day is not a conflict. This is the
    standard hotel/calendar rule. The same predicate is used by the search
    endpoint to hide unavailable listings, so the two stay consistent.
    """
    return (
        db.query(Booking)
        .filter(
            Booking.listing_id == listing_id,
            Booking.status == "confirmed",
            Booking.check_in < check_out,
            Booking.check_out > check_in,
        )
        .first()
    )


# --------------------------------------------------------------------------- #
# Create booking
# --------------------------------------------------------------------------- #
@router.post("/bookings", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a booking after validating dates, capacity and availability."""
    listing = db.get(Listing, payload.listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")

    # 1) Basic date sanity.
    if payload.check_in >= payload.check_out:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")
    if payload.check_in < date.today():
        raise HTTPException(status_code=400, detail="check_in cannot be in the past")

    # 2) Capacity.
    if payload.guest_count > listing.max_guests:
        raise HTTPException(
            status_code=400,
            detail=f"This listing sleeps at most {listing.max_guests} guests",
        )

    # 3) A host cannot book their own place.
    if listing.host_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot book your own listing")

    # 4) The critical one: no overlapping confirmed booking.
    conflict = find_overlapping_booking(
        db, listing.id, payload.check_in, payload.check_out
    )
    if conflict is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "These dates are already booked. "
                f"Next free window starts {conflict.check_out.isoformat()}."
            ),
        )

    # Price is computed on the server, never trusted from the client.
    nights = (payload.check_out - payload.check_in).days
    booking = Booking(
        listing_id=listing.id,
        user_id=user.id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        guest_count=payload.guest_count,
        total_price=calculate_total(listing, nights),
        status="confirmed",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return serialize_booking(booking)


# --------------------------------------------------------------------------- #
# My trips
# --------------------------------------------------------------------------- #
@router.get("/bookings/my-trips", response_model=list[BookingOut])
def my_trips(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    All bookings made by the acting user, newest check-in first, each annotated
    with whether the guest can still review it (completed stay, not yet rated).
    """
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == user.id)
        .order_by(Booking.check_in.desc())
        .all()
    )

    # Which listings this user has already reviewed (one review per listing).
    reviewed_listing_ids = {
        row[0]
        for row in db.query(Review.listing_id)
        .filter(Review.user_id == user.id)
        .all()
    }
    today = date.today()

    results: list[BookingOut] = []
    for booking in bookings:
        item = serialize_booking(booking)
        item.reviewed = booking.listing_id in reviewed_listing_ids
        item.can_review = (
            booking.status == "confirmed"
            and booking.check_out < today
            and not item.reviewed
        )
        results.append(item)
    return results


# --------------------------------------------------------------------------- #
# Reviews (left after a completed stay)
# --------------------------------------------------------------------------- #
@router.post("/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Leave a review for a booking that has already been completed.

    Eligibility is enforced server-side: the booking must belong to the caller,
    be confirmed, and have a check-out in the past. A guest reviews a listing
    once (deduplicated on listing + user).
    """
    booking = db.get(Booking, payload.booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != user.id:
        raise HTTPException(status_code=403, detail="This booking is not yours")
    if booking.status != "confirmed":
        raise HTTPException(status_code=400, detail="You can only review completed stays")
    if booking.check_out >= date.today():
        raise HTTPException(
            status_code=400, detail="You can review this stay once it's completed"
        )

    existing = (
        db.query(Review)
        .filter(Review.listing_id == booking.listing_id, Review.user_id == user.id)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="You have already reviewed this stay")

    review = Review(
        listing_id=booking.listing_id,
        user_id=user.id,
        rating=payload.rating,
        comment=payload.comment.strip(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


# --------------------------------------------------------------------------- #
# Cancel booking
# --------------------------------------------------------------------------- #
@router.delete("/bookings/{booking_id}", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Cancel a booking by flipping its status to "cancelled". We keep the row
    (rather than deleting it) so trip history survives and the dates free up in
    the availability query.
    """
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != user.id:
        raise HTTPException(status_code=403, detail="This booking is not yours")

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return serialize_booking(booking)


# --------------------------------------------------------------------------- #
# Host dashboard
# --------------------------------------------------------------------------- #
@router.get("/host/dashboard", response_model=HostDashboard)
def host_dashboard(
    db: Session = Depends(get_db),
    host: User = Depends(require_host),
):
    """Everything the host dashboard needs in a single round-trip."""
    listings = (
        db.query(Listing)
        .filter(Listing.host_id == host.id)
        .order_by(Listing.created_at.desc())
        .all()
    )
    listing_ids = [listing.id for listing in listings]

    reservations = (
        db.query(Booking)
        .filter(Booking.listing_id.in_(listing_ids))
        .order_by(Booking.created_at.desc())
        .all()
        if listing_ids
        else []
    )

    confirmed = [booking for booking in reservations if booking.status == "confirmed"]
    today = date.today()

    stats = HostStats(
        total_listings=len(listings),
        total_reservations=len(confirmed),
        total_earnings=round(sum(booking.total_price for booking in confirmed), 2),
        upcoming_reservations=sum(1 for booking in confirmed if booking.check_in >= today),
    )

    return HostDashboard(
        host=serialize_host(db, host),
        stats=stats,
        listings=[serialize_listing_card(db, listing, host) for listing in listings],
        reservations=[serialize_booking(booking) for booking in reservations],
    )
