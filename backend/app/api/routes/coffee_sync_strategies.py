from typing import Any

from fastapi import APIRouter, Depends
from sqlmodel import select

from app.api.deps import SessionDep, get_current_user
from app.models import RetoolCoffeeSyncStrategiesPublic, RetoolCoffeeSyncStrategy

router = APIRouter(
    prefix="/coffee-sync-strategies",
    tags=["coffee-sync-strategies"],
    dependencies=[Depends(get_current_user)],
)


@router.get(
    "/",
    response_model=RetoolCoffeeSyncStrategiesPublic,
    operation_id="read_coffee_sync_strategies",
)
def read_coffee_sync_strategies(session: SessionDep) -> Any:
    """
    Retrieve every coffee sync strategy row. This table is a one-time,
    read-only copy from Retool (not a live sync), so it's always loaded in
    full - there's no pagination or filtering to build against yet.
    """
    strategies = session.exec(
        select(RetoolCoffeeSyncStrategy).order_by(
            RetoolCoffeeSyncStrategy.name, RetoolCoffeeSyncStrategy.id
        )
    ).all()
    return RetoolCoffeeSyncStrategiesPublic(data=strategies, count=len(strategies))
