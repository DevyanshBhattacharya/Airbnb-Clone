"""
SQLAlchemy ORM models — the single source of truth for the database schema.

Design notes
------------
* We use SQLAlchemy 2.0's ``Mapped[...]`` / ``mapped_column(...)`` style so the
  Python type annotations *are* the schema. No separate migration files are
  needed for a local assignment; ``Base.metadata.create_all()`` builds the
  tables at startup.
* ``listing_amenities`` is a plain association table (many-to-many) because an
  amenity like "Wifi" belongs to many listings and a listing has many
  amenities. It has no payload of its own, so a full model class would be
  unnecessary.
* Foreign keys use ``ondelete="CASCADE"`` so deleting a listing cleans up its
  dependent rows at the database level. The matching ORM ``cascade`` settings
  keep the in-memory session consistent too.
"""

from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _utcnow() -> datetime:
    """Timezone-aware UTC timestamp used as a column default."""
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------- #
# Association table: listings <-> amenities (many-to-many)
# --------------------------------------------------------------------------- #
listing_amenities = Table(
    "listing_amenities",
    Base.metadata,
    Column("listing_id", ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True),
    Column("amenity_id", ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True),
)


# --------------------------------------------------------------------------- #
# User
# --------------------------------------------------------------------------- #
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    # "guest", "host" or "both". Kept as a string (not an Enum) for simplicity;
    # the API validates the allowed values when a user is created.
    role: Mapped[str] = mapped_column(String(20), default="guest", nullable=False)

    # Relationships (the ``back_populates`` pairs are declared on both sides)
    listings: Mapped[list["Listing"]] = relationship(
        back_populates="host", cascade="all, delete-orphan"
    )
    bookings: Mapped[list["Booking"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    reviews: Mapped[list["Review"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    favorites: Mapped[list["Favorite"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


# --------------------------------------------------------------------------- #
# Listing
# --------------------------------------------------------------------------- #
class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[int] = mapped_column(primary_key=True)
    host_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    property_type: Mapped[str] = mapped_column(String(50), nullable=False)

    location: Mapped[str] = mapped_column(String(200), nullable=False)
    city: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)

    price_per_night: Mapped[float] = mapped_column(Float, nullable=False)
    cleaning_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    service_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    max_guests: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    bedrooms: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    beds: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    # Float because half-baths (1.5, 2.5) are real in Airbnb listings.
    baths: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    latitude: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    # Relationships
    host: Mapped["User"] = relationship(back_populates="listings")
    images: Mapped[list["ListingImage"]] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
        order_by="ListingImage.id",
    )
    amenities: Mapped[list["Amenity"]] = relationship(
        secondary=listing_amenities, back_populates="listings"
    )
    bookings: Mapped[list["Booking"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan"
    )
    reviews: Mapped[list["Review"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan"
    )
    favorites: Mapped[list["Favorite"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan"
    )


# --------------------------------------------------------------------------- #
# ListingImage
# --------------------------------------------------------------------------- #
class ListingImage(Base):
    __tablename__ = "listing_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(
        ForeignKey("listings.id", ondelete="CASCADE"), index=True, nullable=False
    )
    url: Mapped[str] = mapped_column(String(600), nullable=False)
    # Exactly one image per listing should be flagged primary; the seed script
    # and the create/update endpoints enforce "first image = primary".
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    listing: Mapped["Listing"] = relationship(back_populates="images")


# --------------------------------------------------------------------------- #
# Amenity
# --------------------------------------------------------------------------- #
class Amenity(Base):
    __tablename__ = "amenities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    # Lucide React icon name (e.g. "Wifi", "Flame") so the frontend can render
    # the matching icon without hardcoding a mapping per amenity.
    icon_name: Mapped[str] = mapped_column(String(50), nullable=False)

    listings: Mapped[list["Listing"]] = relationship(
        secondary=listing_amenities, back_populates="amenities"
    )


# --------------------------------------------------------------------------- #
# Booking
# --------------------------------------------------------------------------- #
class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(
        ForeignKey("listings.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # Stored as dates (no time component) because Airbnb availability is
    # measured in whole nights.
    check_in: Mapped[date] = mapped_column(Date, nullable=False)
    check_out: Mapped[date] = mapped_column(Date, nullable=False)

    total_price: Mapped[float] = mapped_column(Float, nullable=False)
    guest_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="confirmed", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    listing: Mapped["Listing"] = relationship(back_populates="bookings")
    user: Mapped["User"] = relationship(back_populates="bookings")


# --------------------------------------------------------------------------- #
# Review
# --------------------------------------------------------------------------- #
class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(
        ForeignKey("listings.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1..5
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    listing: Mapped["Listing"] = relationship(back_populates="reviews")
    user: Mapped["User"] = relationship(back_populates="reviews")


# --------------------------------------------------------------------------- #
# Favorite (wishlist)
# --------------------------------------------------------------------------- #
class Favorite(Base):
    __tablename__ = "favorites"
    # A user can only favorite a given listing once — enforced at the DB level.
    __table_args__ = (UniqueConstraint("user_id", "listing_id", name="uq_favorite_user_listing"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    listing_id: Mapped[int] = mapped_column(
        ForeignKey("listings.id", ondelete="CASCADE"), index=True, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="favorites")
    listing: Mapped["Listing"] = relationship(back_populates="favorites")
