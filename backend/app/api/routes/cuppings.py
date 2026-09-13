import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep, get_current_user
from app.models import (
    Cupping,
    CuppingCreate,
    CuppingPublic,
    CuppingsPublic,
    CuppingUpdate,
)

router = APIRouter(
    prefix="/cuppings", tags=["cuppings"], dependencies=[Depends(get_current_user)]
)


@router.get("/", response_model=CuppingsPublic)
def read_cuppings(
    session: SessionDep,
    start_ms: int | None = None,
    end_ms: int | None = None,
    skip: int = 0,
    limit: int = 200,
) -> Any:
    """
    Retrieve cuppings, oldest first, optionally filtered to a date range.
    """
    statement = select(Cupping)
    count_statement = select(func.count()).select_from(Cupping)
    if start_ms is not None:
        statement = statement.where(Cupping.date >= start_ms)
        count_statement = count_statement.where(Cupping.date >= start_ms)
    if end_ms is not None:
        statement = statement.where(Cupping.date <= end_ms)
        count_statement = count_statement.where(Cupping.date <= end_ms)

    count = session.exec(count_statement).one()
    statement = statement.order_by(col(Cupping.date).asc()).offset(skip).limit(limit)
    cuppings = session.exec(statement).all()
    return CuppingsPublic(data=cuppings, count=count)


@router.get("/{id}", response_model=CuppingPublic)
def read_cupping(session: SessionDep, id: uuid.UUID) -> Any:
    """
    Get a cupping by ID.
    """
    cupping = session.get(Cupping, id)
    if not cupping:
        raise HTTPException(status_code=404, detail="Cupping not found")
    return cupping


@router.post("/", response_model=CuppingPublic)
def create_cupping(
    session: SessionDep, current_user: CurrentUser, cupping_in: CuppingCreate
) -> Any:
    """
    Create a new cupping. `date` and `who_tasted` are set server-side.
    """
    cupping = Cupping.model_validate(
        cupping_in,
        update={"who_tasted": current_user.full_name or current_user.email},
    )
    session.add(cupping)
    session.commit()
    session.refresh(cupping)
    return cupping


@router.put("/{id}", response_model=CuppingPublic)
def update_cupping(
    session: SessionDep, id: uuid.UUID, cupping_in: CuppingUpdate
) -> Any:
    """
    Update a cupping's fields. `date` and `who_tasted` are immutable.
    """
    cupping = session.get(Cupping, id)
    if not cupping:
        raise HTTPException(status_code=404, detail="Cupping not found")
    update_dict = cupping_in.model_dump(exclude_unset=True)
    cupping.sqlmodel_update(update_dict)
    session.add(cupping)
    session.commit()
    session.refresh(cupping)
    return cupping
