"""
Database configuration.

We use a single SQLite file (``airbnb.db``) because the assignment calls for a
local, fully relational database with zero infrastructure. SQLAlchemy 2.0's
modern typed ORM is used throughout so the schema is declared once in Python
and generates the SQLite tables automatically.

Everything about *how we connect* lives here; everything about *what the tables
look like* lives in ``models.py``. Keeping those two concerns apart makes it
easy to swap SQLite for Postgres later by changing only this file.
"""

from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# A file-backed SQLite database in the backend/ directory. The four slashes in
# "sqlite:///" mean "a relative path", so running the app from backend/ always
# finds the same file.
DATABASE_URL = "sqlite:///./airbnb.db"

engine = create_engine(
    DATABASE_URL,
    # FastAPI runs sync endpoints in a thread pool, so the same connection can
    # be used from a different thread than the one that created it. SQLite
    # forbids that by default; this flag relaxes the check.
    connect_args={"check_same_thread": False},
    echo=False,  # set to True to log every SQL statement while debugging
)


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    """
    SQLite ignores foreign-key constraints unless you explicitly turn them on
    for every connection. This makes ON DELETE CASCADE behave the way the
    models expect (i.e. deleting a listing removes its images, reviews, etc.).
    """
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# sessionmaker is a factory that hands out short-lived Session objects.
# autoflush=False keeps inserts from firing half-way through a request and
# autocommit=False forces us to call db.commit() explicitly, which is safer
# and easier to reason about.
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Shared declarative base. Every ORM model inherits from this."""


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that opens a session per request and *always* closes it,
    even if the request raises. Endpoints declare ``db: Session = Depends(get_db)``
    and never have to think about connection lifecycle.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
