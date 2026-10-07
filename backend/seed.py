"""
Seed script — builds the SQLite database and fills it with realistic demo data.

Usage (from inside backend/):

    python seed.py

It is destructive by design: it drops every table and recreates them, so you
always end up with a clean, reproducible dataset. Photos are hot-linked from
Unsplash (real, distinct home photos) so there are no binary assets to commit.
"""

from datetime import date, timedelta

from database import Base, SessionLocal, engine
from models import Amenity, Booking, Favorite, Listing, ListingImage, Review, User

TODAY = date.today()


def img(photo_id: str, width: int = 1600) -> str:
    """Build an Unsplash CDN URL for a given photo id (verified to resolve)."""
    return f"https://images.unsplash.com/photo-{photo_id}?auto=format&fit=crop&w={width}&q=80"


def total_price(listing: Listing, nights: int) -> float:
    """Same pricing formula used by the booking endpoint (kept in sync)."""
    return round(
        listing.price_per_night * nights + listing.cleaning_fee + listing.service_fee, 2
    )


# --------------------------------------------------------------------------- #
# Static reference data
# --------------------------------------------------------------------------- #
AMENITIES = [
    ("Wifi", "Wifi"),
    ("Kitchen", "ChefHat"),
    ("Free parking", "Car"),
    ("Pool", "Waves"),
    ("TV", "Tv"),
    ("Washer", "WashingMachine"),
    ("Air conditioning", "Wind"),
    ("Heating", "Thermometer"),
    ("Dedicated workspace", "Laptop"),
    ("Fireplace", "Flame"),
    ("Hot tub", "Bath"),
    ("BBQ grill", "CookingPot"),
    ("Gym", "Dumbbell"),
    ("Pets allowed", "PawPrint"),
    ("Smoke alarm", "ShieldCheck"),
    ("Coffee maker", "Coffee"),
    ("Beach access", "Umbrella"),
    ("Mountain view", "Mountain"),
    ("Self check-in", "Key"),
    ("EV charger", "Zap"),
]

# Demo profiles. ids are assigned in insertion order: 1 = guest, 2 = host.
USERS = [
    # (name, email, avatar, role)
    ("Alex Chen", "alex@demo.airbnb", "https://randomuser.me/api/portraits/men/32.jpg", "guest"),
    ("Sarah Mitchell", "sarah@demo.airbnb", "https://randomuser.me/api/portraits/women/44.jpg", "both"),
    ("Marco Rossi", "marco@demo.airbnb", "https://randomuser.me/api/portraits/men/45.jpg", "host"),
    ("Priya Nair", "priya@demo.airbnb", "https://randomuser.me/api/portraits/women/68.jpg", "host"),
    ("James Carter", "james@demo.airbnb", "https://randomuser.me/api/portraits/men/22.jpg", "host"),
    ("Sofia Alvarez", "sofia@demo.airbnb", "https://randomuser.me/api/portraits/women/33.jpg", "host"),
    ("Kenji Tanaka", "kenji@demo.airbnb", "https://randomuser.me/api/portraits/men/76.jpg", "host"),
    # Extra guests so listings have a believable spread of reviewers.
    ("Emma Wilson", "emma@demo.airbnb", "https://randomuser.me/api/portraits/women/12.jpg", "guest"),
    ("Liam O'Brien", "liam@demo.airbnb", "https://randomuser.me/api/portraits/men/54.jpg", "guest"),
    ("Olivia Brown", "olivia@demo.airbnb", "https://randomuser.me/api/portraits/women/25.jpg", "guest"),
    ("Noah Garcia", "noah@demo.airbnb", "https://randomuser.me/api/portraits/men/15.jpg", "guest"),
    ("Ava Martinez", "ava@demo.airbnb", "https://randomuser.me/api/portraits/women/90.jpg", "guest"),
]

# Listing definitions. host is an index into the host subset below.
# photos[0] becomes the primary image.
LISTINGS = [
    {
        "title": "Oceanfront Malibu Villa with Private Pool",
        "description": (
            "Wake up to the sound of waves in this light-filled villa perched above "
            "Malibu's most exclusive stretch of coastline. Floor-to-ceiling glass opens "
            "onto a private infinity pool, and the primary suite has its own ocean-view "
            "terrace. A chef's kitchen, fire pit and direct beach access make it ideal "
            "for families or a group of friends."
        ),
        "category": "Beachfront",
        "property_type": "Villa",
        "location": "Point Dume, Malibu",
        "city": "Malibu",
        "country": "United States",
        "price_per_night": 620.0,
        "cleaning_fee": 180.0,
        "service_fee": 95.0,
        "max_guests": 8,
        "bedrooms": 4,
        "beds": 5,
        "baths": 3.5,
        "latitude": 34.0259,
        "longitude": -118.7798,
        "photos": ["1501785888041-af3ef285b470", "1520250497591-112f2f40a3f4", "1540541338287-41700207dee6", "1499793983690-e29da59ef1c2", "1600210492486-724fe5c67fb0"],
        "amenities": ["Pool", "Wifi", "Kitchen", "Beach access", "Air conditioning", "Free parking", "BBQ grill", "Coffee maker"],
    },
    {
        "title": "Cozy A-Frame Cabin in the Redwoods",
        "description": (
            "Escape to this hand-built A-frame tucked among towering redwoods. "
            "A wood-burning fireplace anchors the double-height living room, and the "
            "wrap-around deck is perfect for morning coffee with the birds. Ten minutes "
            "from Big Sur's best trails and a short drive to quiet coves."
        ),
        "category": "Cabins",
        "property_type": "Cabin",
        "location": "Big Sur",
        "city": "Big Sur",
        "country": "United States",
        "price_per_night": 285.0,
        "cleaning_fee": 120.0,
        "service_fee": 65.0,
        "max_guests": 4,
        "bedrooms": 2,
        "beds": 3,
        "baths": 1.5,
        "latitude": 36.2704,
        "longitude": -121.8081,
        "photos": ["1583608205776-bfd35f0d9f83", "1449158743715-0a90ebb6d2d8", "1518780664697-55e3ad937233", "1470770841072-f978cf4d019e"],
        "amenities": ["Fireplace", "Wifi", "Kitchen", "Heating", "Free parking", "Coffee maker", "Self check-in", "Pets allowed"],
    },
    {
        "title": "Designer Loft in Downtown Manhattan",
        "description": (
            "A sun-drenched designer loft in the heart of SoHo, steps from the best "
            "coffee, galleries and shopping in the city. Exposed brick and original "
            "cast-iron columns meet a fully renovated kitchen and a king bed with "
            "hotel-grade linens."
        ),
        "category": "Iconic cities",
        "property_type": "Loft",
        "location": "SoHo, Manhattan",
        "city": "New York",
        "country": "United States",
        "price_per_night": 410.0,
        "cleaning_fee": 130.0,
        "service_fee": 75.0,
        "max_guests": 3,
        "bedrooms": 1,
        "beds": 2,
        "baths": 1.0,
        "latitude": 40.7233,
        "longitude": -74.0030,
        "photos": ["1554995207-c18c203602cb", "1522708323590-d24dbb6b0267", "1502672260266-1c1ef2d93688", "1493809842364-78817add7ffb"],
        "amenities": ["Wifi", "Kitchen", "Air conditioning", "Heating", "Dedicated workspace", "TV", "Self check-in", "Washer"],
    },
    {
        "title": "Tiny Home with Blue Ridge Mountain Views",
        "description": (
            "A thoughtfully designed tiny home on 12 private acres with sweeping "
            "views of the Blue Ridge Mountains. Watch the sunrise from the queen loft "
            "bed, cook s'mores at the fire pit, and stargaze from the hot tub. "
            "Off-grid feel, all the comforts."
        ),
        "category": "Tiny homes",
        "property_type": "Tiny home",
        "location": "Blue Ridge Mountains",
        "city": "Asheville",
        "country": "United States",
        "price_per_night": 145.0,
        "cleaning_fee": 60.0,
        "service_fee": 35.0,
        "max_guests": 2,
        "bedrooms": 1,
        "beds": 1,
        "baths": 1.0,
        "latitude": 35.5951,
        "longitude": -82.5515,
        "photos": ["1502672023488-70e25813eb80", "1510798831971-661eb04b3739", "1512918728675-ed5a9ecdebfd", "1600585154526-990dced4db0d"],
        "amenities": ["Mountain view", "Hot tub", "Wifi", "Kitchen", "Heating", "Fireplace", "Free parking", "Coffee maker"],
    },
    {
        "title": "Lakeside Cottage with Private Dock",
        "description": (
            "Classic Tahoe cottage right on the water with its own private dock. "
            "Paddle out at sunrise, then gather on the deck for dinner as the sun sets "
            "behind the pines. Three bedrooms plus a bunk room make it an easy group "
            "getaway any season."
        ),
        "category": "Lakefront",
        "property_type": "Cottage",
        "location": "West Shore, Lake Tahoe",
        "city": "Lake Tahoe",
        "country": "United States",
        "price_per_night": 320.0,
        "cleaning_fee": 110.0,
        "service_fee": 60.0,
        "max_guests": 6,
        "bedrooms": 3,
        "beds": 4,
        "baths": 2.0,
        "latitude": 39.0968,
        "longitude": -120.0324,
        "photos": ["1470770841072-f978cf4d019e", "1520250497591-112f2f40a3f4", "1600210492486-724fe5c67fb0"],
        "amenities": ["Mountain view", "Fireplace", "Kitchen", "Wifi", "Free parking", "Heating", "BBQ grill", "Coffee maker"],
    },
    {
        "title": "Sunlit Beach House Steps from the Sand",
        "description": (
            "Bright, airy and just 60 steps from the sand. This three-bedroom beach "
            "house has a chef's kitchen, an outdoor shower and a sunny patio with a "
            "grill. Walk to the pier, cafes and bike rentals in under ten minutes."
        ),
        "category": "Beachfront",
        "property_type": "House",
        "location": "North of Montana, Santa Monica",
        "city": "Santa Monica",
        "country": "United States",
        "price_per_night": 355.0,
        "cleaning_fee": 125.0,
        "service_fee": 70.0,
        "max_guests": 6,
        "bedrooms": 3,
        "beds": 4,
        "baths": 2.0,
        "latitude": 34.0195,
        "longitude": -118.4912,
        "photos": ["1501785888041-af3ef285b470", "1540541338287-41700207dee6", "1600047509807-ba8f99d2cdde"],
        "amenities": ["Beach access", "Wifi", "Kitchen", "Air conditioning", "Free parking", "BBQ grill", "Washer", "TV"],
    },
    {
        "title": "Modern Desert Villa with Infinity Pool",
        "description": (
            "Architectural desert retreat set against the McDowell Mountains. The "
            "great room opens completely to an infinity-edge pool, and every bedroom "
            "has an en-suite bath. Sunset here — with the mountains turning pink — is "
            "the whole point."
        ),
        "category": "Amazing views",
        "property_type": "Villa",
        "location": "North Scottsdale",
        "city": "Scottsdale",
        "country": "United States",
        "price_per_night": 540.0,
        "cleaning_fee": 200.0,
        "service_fee": 110.0,
        "max_guests": 8,
        "bedrooms": 4,
        "beds": 5,
        "baths": 4.0,
        "latitude": 33.4942,
        "longitude": -111.9261,
        "photos": ["1613490493576-7fde63acd811", "1600596542815-ffad4c1539a9", "1600607687939-ce8a6c25118c"],
        "amenities": ["Pool", "Mountain view", "Wifi", "Kitchen", "Air conditioning", "Free parking", "Gym", "BBQ grill"],
    },
    {
        "title": "Rustic Log Cabin on a Working Farm",
        "description": (
            "A genuine log cabin on a working Vermont farm. Gather eggs for breakfast, "
            "meet the goats, and snowshoe straight from the door in winter. The cabin "
            "sleeps five with a wood stove, a deep soaking tub and a porch made for "
            "slow afternoons."
        ),
        "category": "Countryside",
        "property_type": "Cabin",
        "location": "Green Mountains",
        "city": "Burlington",
        "country": "United States",
        "price_per_night": 210.0,
        "cleaning_fee": 85.0,
        "service_fee": 45.0,
        "max_guests": 5,
        "bedrooms": 2,
        "beds": 3,
        "baths": 1.5,
        "latitude": 44.4759,
        "longitude": -73.2121,
        "photos": ["1449158743715-0a90ebb6d2d8", "1518780664697-55e3ad937233", "1583608205776-bfd35f0d9f83"],
        "amenities": ["Fireplace", "Heating", "Kitchen", "Wifi", "Free parking", "Pets allowed", "Coffee maker", "Self check-in"],
    },
    {
        "title": "Historic Brownstone Near Boston Common",
        "description": (
            "A beautifully restored parlor-level apartment in a Back Bay brownstone. "
            "Twelve-foot ceilings, a marble fireplace and bay windows overlooking a "
            "quiet, tree-lined street — with the Common and the T just two blocks away."
        ),
        "category": "Iconic cities",
        "property_type": "Apartment",
        "location": "Back Bay",
        "city": "Boston",
        "country": "United States",
        "price_per_night": 275.0,
        "cleaning_fee": 95.0,
        "service_fee": 55.0,
        "max_guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "baths": 1.0,
        "latitude": 42.3554,
        "longitude": -71.0605,
        "photos": ["1493809842364-78817add7ffb", "1600585154340-be6161a56a0c", "1522708323590-d24dbb6b0267"],
        "amenities": ["Wifi", "Kitchen", "Heating", "Air conditioning", "Washer", "TV", "Dedicated workspace", "Self check-in"],
    },
    {
        "title": "Cliffside Santorini Cave House",
        "description": (
            "A whitewashed cave house carved into the Oia cliffs, with a private "
            "terrace overlooking the caldera. Swim in your plunge pool as the famous "
            "Santorini sunset sets the sky on fire. Fresh breakfast is delivered to "
            "your door each morning."
        ),
        "category": "Luxe",
        "property_type": "House",
        "location": "Oia, Santorini",
        "city": "Santorini",
        "country": "Greece",
        "price_per_night": 480.0,
        "cleaning_fee": 160.0,
        "service_fee": 90.0,
        "max_guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "baths": 2.0,
        "latitude": 36.4618,
        "longitude": 25.3753,
        "photos": ["1512917774080-9991f1c4c750", "1600596542815-ffad4c1539a9", "1580587771525-78b9dba3b914"],
        "amenities": ["Pool", "Wifi", "Kitchen", "Air conditioning", "Coffee maker", "Self check-in", "Beach access"],
    },
    {
        "title": "Secluded Treehouse in the Rainforest",
        "description": (
            "Sleep among the canopy in an off-grid treehouse above the Costa Rican "
            "jungle. Wake to howler monkeys, spot toucans from the deck, and fall "
            "asleep to the sound of the river below. Solar-powered with an outdoor "
            "rainfall shower."
        ),
        "category": "Off-the-grid",
        "property_type": "Treehouse",
        "location": "Uvita",
        "city": "Uvita",
        "country": "Costa Rica",
        "price_per_night": 190.0,
        "cleaning_fee": 70.0,
        "service_fee": 40.0,
        "max_guests": 2,
        "bedrooms": 1,
        "beds": 1,
        "baths": 1.0,
        "latitude": 9.1590,
        "longitude": -83.7412,
        "photos": ["1583608205776-bfd35f0d9f83", "1510798831971-661eb04b3739", "1470770841072-f978cf4d019e"],
        "amenities": ["Mountain view", "Wifi", "Kitchen", "Free parking", "Coffee maker", "Self check-in", "Pets allowed"],
    },
    {
        "title": "Chic Parisian Apartment with Balcony",
        "description": (
            "A stylish one-bedroom in the 6th arrondissement with a wrought-iron "
            "balcony overlooking the rooftops of Saint-Germain. Parquet floors, "
            "a well-stocked kitchen and the best croissants in Paris around the corner. "
            "Metro station 90 seconds away."
        ),
        "category": "Iconic cities",
        "property_type": "Apartment",
        "location": "Saint-Germain-des-Prés, 6e",
        "city": "Paris",
        "country": "France",
        "price_per_night": 330.0,
        "cleaning_fee": 100.0,
        "service_fee": 60.0,
        "max_guests": 3,
        "bedrooms": 1,
        "beds": 2,
        "baths": 1.0,
        "latitude": 48.8541,
        "longitude": 2.3336,
        "photos": ["1560448204-e02f11c3d0e2", "1522708323590-d24dbb6b0267", "1554995207-c18c203602cb"],
        "amenities": ["Wifi", "Kitchen", "Heating", "Washer", "Coffee maker", "TV", "Self check-in"],
    },
    {
        "title": "Modern Mountain Chalet with Hot Tub",
        "description": (
            "A timber-and-glass chalet ten minutes from the Whistler gondola. Ski "
            "all day, then soak in the cedar hot tub under the stars. Four bedrooms, "
            "a media room and a huge open kitchen for group dinners."
        ),
        "category": "Cabins",
        "property_type": "Chalet",
        "location": "Creekside, Whistler",
        "city": "Whistler",
        "country": "Canada",
        "price_per_night": 465.0,
        "cleaning_fee": 170.0,
        "service_fee": 95.0,
        "max_guests": 8,
        "bedrooms": 4,
        "beds": 5,
        "baths": 3.0,
        "latitude": 50.1163,
        "longitude": -122.9574,
        "photos": ["1613490493576-7fde63acd811", "1512918728675-ed5a9ecdebfd", "1600566753086-00f18fb6b3ea"],
        "amenities": ["Hot tub", "Fireplace", "Mountain view", "Wifi", "Kitchen", "Heating", "Free parking", "Washer"],
    },
    {
        "title": "Bright Studio in the Heart of Shoreditch",
        "description": (
            "A compact, cleverly designed studio minutes from Shoreditch High Street. "
            "Great natural light, a proper kitchen and fast wifi make it perfect for "
            "a solo traveler or couple exploring London's best food and nightlife."
        ),
        "category": "Trending",
        "property_type": "Apartment",
        "location": "Shoreditch",
        "city": "London",
        "country": "United Kingdom",
        "price_per_night": 165.0,
        "cleaning_fee": 55.0,
        "service_fee": 30.0,
        "max_guests": 2,
        "bedrooms": 1,
        "beds": 1,
        "baths": 1.0,
        "latitude": 51.5251,
        "longitude": -0.0783,
        "photos": ["1502672260266-1c1ef2d93688", "1560448204-e02f11c3d0e2", "1560185007-cde436f6a4d0"],
        "amenities": ["Wifi", "Kitchen", "Heating", "Washer", "Dedicated workspace", "TV", "Self check-in"],
    },
    {
        "title": "Coastal Retreat with Panoramic Ocean Views",
        "description": (
            "A serene three-bedroom home above Camps Bay with floor-to-ceiling views "
            "of the Atlantic. Expect dramatic sunsets, a sheltered pool deck and easy "
            "access to the city, wine routes and Table Mountain."
        ),
        "category": "Amazing views",
        "property_type": "House",
        "location": "Camps Bay",
        "city": "Cape Town",
        "country": "South Africa",
        "price_per_night": 300.0,
        "cleaning_fee": 105.0,
        "service_fee": 60.0,
        "max_guests": 6,
        "bedrooms": 3,
        "beds": 3,
        "baths": 2.0,
        "latitude": -33.9500,
        "longitude": 18.3775,
        "photos": ["1540541338287-41700207dee6", "1499793983690-e29da59ef1c2", "1600573472592-401b489a3cdc"],
        "amenities": ["Pool", "Beach access", "Wifi", "Kitchen", "Free parking", "BBQ grill", "Air conditioning"],
    },
    {
        "title": "Ski-In Ski-Out Condo at the Base",
        "description": (
            "True ski-in, ski-out convenience at the base of Aspen Mountain. A "
            "renovated three-bedroom condo with a stone fireplace, a boot room and "
            "a balcony over the slopes. Restaurants and the gondola are at your door."
        ),
        "category": "Trending",
        "property_type": "Condo",
        "location": "Aspen Mountain",
        "city": "Aspen",
        "country": "United States",
        "price_per_night": 390.0,
        "cleaning_fee": 140.0,
        "service_fee": 80.0,
        "max_guests": 6,
        "bedrooms": 3,
        "beds": 4,
        "baths": 2.0,
        "latitude": 39.1911,
        "longitude": -106.8175,
        "photos": ["1560185127-6ed189bf02f4", "1600210492486-724fe5c67fb0", "1564013799919-ab600027ffc6"],
        "amenities": ["Fireplace", "Mountain view", "Hot tub", "Wifi", "Kitchen", "Heating", "Free parking", "Gym"],
    },
]

# (rating, comment) pool, cycled across listings so every review reads naturally.
REVIEW_POOL = [
    (5, "Absolutely stunning stay. The photos don't do it justice — we're already planning a return."),
    (5, "Immaculate, beautifully designed and the host thought of everything. Ten out of ten."),
    (4, "Lovely place and great location. Only minor note is street parking can be tight at night."),
    (5, "The view alone is worth the price. Check-in was seamless and the beds were so comfortable."),
    (4, "Great value and very clean. A little far from the main strip but we loved the quiet."),
    (5, "Perfect for our group. Plenty of space, a great kitchen and a wonderful outdoor area."),
    (4, "Charming and full of character. Wifi was a touch slow but everything else was excellent."),
    (5, "One of the best Airbnbs we've stayed in. The host was responsive and incredibly kind."),
    (3, "Nice spot overall, though the place is a bit smaller than it looks in the photos."),
    (5, "We didn't want to leave. Thoughtful touches everywhere and spotlessly clean."),
]

# (listing_index, user_id, start_offset_days, nights, guests, status)
BOOKINGS = [
    (1, 1, 12, 4, 4, "confirmed"),    # Alex's upcoming Malibu trip
    (1, 8, 22, 5, 6, "confirmed"),    # blocks a second window on listing 1
    (3, 1, -45, 3, 2, "confirmed"),   # Alex's past NYC trip
    (2, 9, 8, 3, 2, "confirmed"),
    (5, 10, 15, 4, 5, "confirmed"),
    (7, 11, 5, 6, 8, "confirmed"),
    (9, 12, -20, 2, 2, "cancelled"),  # cancelled history shouldn't block dates
]

# Listings Alex has wishlisted.
FAVORITES = [(1, 2), (1, 5), (1, 9), (1, 13)]


def seed() -> None:
    # Start from a clean slate every run.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # --- Users -------------------------------------------------------- #
        users = [
            User(name=name, email=email, avatar_url=avatar, role=role)
            for name, email, avatar, role in USERS
        ]
        db.add_all(users)
        db.flush()  # assigns ids so we can reference them below

        host_pool = [u for u in users if u.role in ("host", "both")]

        # --- Amenities ---------------------------------------------------- #
        amenities = [Amenity(name=name, icon_name=icon) for name, icon in AMENITIES]
        db.add_all(amenities)
        db.flush()
        amenity_by_name = {a.name: a for a in amenities}

        # --- Listings (with photos + amenities) --------------------------- #
        listings: list[Listing] = []
        for index, data in enumerate(LISTINGS):
            host = host_pool[index % len(host_pool)]
            listing = Listing(
                host_id=host.id,
                title=data["title"],
                description=data["description"],
                category=data["category"],
                property_type=data["property_type"],
                location=data["location"],
                city=data["city"],
                country=data["country"],
                price_per_night=data["price_per_night"],
                cleaning_fee=data["cleaning_fee"],
                service_fee=data["service_fee"],
                max_guests=data["max_guests"],
                bedrooms=data["bedrooms"],
                beds=data["beds"],
                baths=data["baths"],
                latitude=data["latitude"],
                longitude=data["longitude"],
            )
            listing.images = [
                ListingImage(url=img(photo_id), is_primary=(i == 0))
                for i, photo_id in enumerate(data["photos"])
            ]
            listing.amenities = [amenity_by_name[name] for name in data["amenities"]]
            db.add(listing)
            listings.append(listing)
        db.flush()

        # --- Reviews ------------------------------------------------------ #
        # Reviewers are the extra guest profiles only. The demo guest (id 1) is
        # deliberately excluded so their own completed stays remain reviewable
        # in the demo.
        reviewer_ids = [u.id for u in users if u.role == "guest" and u.id != 1]
        for index, listing in enumerate(listings):
            for offset in range(3):  # 3 reviews per listing
                rating, comment = REVIEW_POOL[(index * 3 + offset) % len(REVIEW_POOL)]
                reviewer_id = reviewer_ids[(index + offset) % len(reviewer_ids)]
                db.add(
                    Review(
                        listing_id=listing.id,
                        user_id=reviewer_id,
                        rating=rating,
                        comment=comment,
                    )
                )

        # --- Bookings ----------------------------------------------------- #
        for listing_index, user_id, start_offset, nights, guests, status in BOOKINGS:
            listing = listings[listing_index - 1]
            check_in = TODAY + timedelta(days=start_offset)
            check_out = check_in + timedelta(days=nights)
            db.add(
                Booking(
                    listing_id=listing.id,
                    user_id=user_id,
                    check_in=check_in,
                    check_out=check_out,
                    guest_count=guests,
                    total_price=total_price(listing, nights),
                    status=status,
                )
            )

        # --- Favorites ---------------------------------------------------- #
        for user_id, listing_index in FAVORITES:
            db.add(Favorite(user_id=user_id, listing_id=listings[listing_index - 1].id))

        db.commit()

        # --- Summary ------------------------------------------------------ #
        print("Database seeded successfully.")
        print(f"  users:      {len(users)}")
        print(f"  amenities:  {len(amenities)}")
        print(f"  listings:   {len(listings)}")
        print(f"  images:     {sum(len(l.images) for l in listings)}")
        print(f"  reviews:    {len(listings) * 3}")
        print(f"  bookings:   {len(BOOKINGS)}")
        print(f"  favorites:  {len(FAVORITES)}")
        print("\nDemo profiles (send as X-User-Id header):")
        print("  1 = Alex Chen (guest)")
        print("  2 = Sarah Mitchell (host)")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
