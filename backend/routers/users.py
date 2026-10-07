"""
User endpoints: the acting profile, the list of demo profiles, and favorites
(the wishlist toggle).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import Favorite, Listing, User
from schemas import FavoriteToggle, ListingCard, UserOut
from serializers import serialize_listing_card

router = APIRouter(prefix="/api", tags=["users"])


@router.get("/users", response_model=list[UserOut])
def list_demo_users(db: Session = Depends(get_db)):
    """
    Return every seeded profile. The frontend uses this to populate the
    "Switch to Host / Guest" menu and to know which X-User-Id to send.
    """
    return db.query(User).order_by(User.id).all()


@router.get("/users/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    """The currently acting demo user."""
    return user


@router.get("/favorites", response_model=list[ListingCard])
def list_favorites(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The acting user's wishlist, most recently added first."""
    favorites = (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id)
        .order_by(Favorite.id.desc())
        .all()
    )
    return [serialize_listing_card(db, favorite.listing, user) for favorite in favorites]


@router.post("/favorites/{listing_id}", response_model=FavoriteToggle)
def toggle_favorite(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Toggle a listing in/out of the acting user's wishlist.

    POST is used (rather than PUT/DELETE) because the client's intent is "flip
    the heart", not "set it to a value". The response tells the UI the new
    state so it can render the heart correctly.
    """
    listing = db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")

    existing = (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id, Favorite.listing_id == listing_id)
        .first()
    )

    if existing is not None:
        db.delete(existing)
        db.commit()
        return FavoriteToggle(listing_id=listing_id, favorited=False)

    db.add(Favorite(user_id=user.id, listing_id=listing_id))
    db.commit()
    return FavoriteToggle(listing_id=listing_id, favorited=True)
