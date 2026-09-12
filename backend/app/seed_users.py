import logging

from sqlmodel import Session

from app import crud
from app.core.db import engine
from app.models import UserCreate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add an entry here for each approved user you want provisioned, then run:
#   uv run python -m app.seed_users
# Safe to re-run - existing emails are skipped, never overwritten. Rotate
# these initial passwords (via the API or the account's own Settings page)
# once the person has logged in.
#
# Example:
# ADDITIONAL_USERS: list[UserCreate] = [
#     UserCreate(email="alex@example.com", password="changeme123", full_name="Alex Roaster"),
# ]
ADDITIONAL_USERS: list[UserCreate] = []


def seed_users(session: Session) -> None:
    created, skipped = 0, 0
    for user_in in ADDITIONAL_USERS:
        existing = crud.get_user_by_email(session=session, email=user_in.email)
        if existing:
            skipped += 1
            logger.info("Skipping existing user %r", user_in.email)
            continue
        crud.create_user(session=session, user_create=user_in)
        created += 1
    logger.info("User seed: %d created, %d already present (skipped)", created, skipped)


def main() -> None:
    logger.info("Seeding additional users")
    with Session(engine) as session:
        seed_users(session)
    logger.info("User seed complete")


if __name__ == "__main__":
    main()
