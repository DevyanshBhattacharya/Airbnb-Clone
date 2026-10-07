"""
Mock authentication.

The assignment asks for *lightweight* auth: no passwords, no OAuth, no
sessions. Instead the client identifies which seeded demo user it is acting as
by sending a header:

    X-User-Id: 1   -> Alex Chen (guest)
    X-User-Id: 2   -> Sarah Mitchell (host)

Switching between "Guest mode" and "Host mode" in the UI simply switches this
header value. If the header is missing we fall back to the guest user, so the
API is immediately usable from a browser or curl without any setup.

This is intentionally *not* secure — it is a demo affordance. Swapping it for
real JWT auth later means changing only this file plus the login endpoint.
"""

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User

# The id of the seeded demo guest, used when no header is supplied.
DEFAULT_DEMO_USER_ID = 1
# Roles that are allowed to perform host-only actions.
HOST_ROLES = {"host", "both"}


def get_current_user(
    x_user_id: int = Header(
        default=DEFAULT_DEMO_USER_ID,
        alias="X-User-Id",
        description="Id of the demo user to act as (mock authentication).",
    ),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the acting user from the X-User-Id header."""
    user = db.get(User, x_user_id)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail=f"No demo user with id={x_user_id}. Did you run `python seed.py`?",
        )
    return user


def require_host(user: User = Depends(get_current_user)) -> User:
    """Dependency for host-only endpoints (create/update/delete listings)."""
    if user.role not in HOST_ROLES:
        raise HTTPException(
            status_code=403,
            detail=f"User '{user.name}' is a {user.role} and cannot manage listings.",
        )
    return user
