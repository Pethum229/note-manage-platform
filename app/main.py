import os

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Query,
    Request,
)

from mudraid_middleware import MudraIDMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import engine, get_db
from app import models, schemas, crud


# ---------------------------------------------------------
# Database
# ---------------------------------------------------------

models.Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------
# FastAPI Application
# ---------------------------------------------------------

app = FastAPI(
    title="Notebook CRUD Platform",
    description="FastAPI Service for Notebook Operations",
    version="1.0.0",
)


# ---------------------------------------------------------
# MudraID Middleware
# ---------------------------------------------------------

app.add_middleware(
    MudraIDMiddleware
)


# ---------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Static / Template Configuration
# ---------------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

static_dir = os.path.join(
    BASE_DIR,
    "static"
)

templates_dir = os.path.join(
    BASE_DIR,
    "templates"
)


os.makedirs(
    static_dir,
    exist_ok=True
)

os.makedirs(
    templates_dir,
    exist_ok=True
)


app.mount(
    "/static",
    StaticFiles(directory=static_dir),
    name="static",
)


templates = Jinja2Templates(
    directory=templates_dir
)


# ---------------------------------------------------------
# Web UI
# ---------------------------------------------------------

@app.get(
    "/",
    response_class=HTMLResponse
)
def read_root(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
    )


# ---------------------------------------------------------
# Health
# ---------------------------------------------------------

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "Notebook CRUD Platform",
    }


# ---------------------------------------------------------
# LIST / SEARCH NOTEBOOKS
# ---------------------------------------------------------

@app.get(
    "/api/notebooks",
    response_model=List[schemas.NotebookResponse],
)
def read_notebooks(
    skip: int = 0,
    limit: int = 100,

    search: Optional[str] = Query(
        None,
        description="Search query in title, content or tags",
    ),

    category: Optional[str] = Query(
        None,
        description="Filter by category",
    ),

    db: Session = Depends(get_db),
):

    return crud.get_notebooks(
        db,
        skip=skip,
        limit=limit,
        search=search,
        category=category,
    )


# ---------------------------------------------------------
# GET SINGLE NOTEBOOK
# ---------------------------------------------------------

@app.get(
    "/api/notebooks/{notebook_id}",
    response_model=schemas.NotebookResponse,
)
def read_notebook(
    notebook_id: int,
    db: Session = Depends(get_db),
):

    db_notebook = crud.get_notebook_by_id(
        db,
        notebook_id=notebook_id,
    )

    if db_notebook is None:
        raise HTTPException(
            status_code=404,
            detail="Notebook not found",
        )

    return db_notebook


# ---------------------------------------------------------
# CREATE NOTEBOOK
# ---------------------------------------------------------

@app.post(
    "/api/notebooks",
    response_model=schemas.NotebookResponse,
    status_code=201,
)
def create_notebook(
    notebook: schemas.NotebookCreate,
    db: Session = Depends(get_db),
):

    return crud.create_notebook(
        db=db,
        notebook_in=notebook,
    )


# ---------------------------------------------------------
# UPDATE NOTEBOOK
# ---------------------------------------------------------

@app.put(
    "/api/notebooks/{notebook_id}",
    response_model=schemas.NotebookResponse,
)
def update_notebook(
    notebook_id: int,
    notebook: schemas.NotebookUpdate,
    db: Session = Depends(get_db),
):

    updated = crud.update_notebook(
        db=db,
        notebook_id=notebook_id,
        notebook_in=notebook,
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Notebook not found",
        )

    return updated


# ---------------------------------------------------------
# DELETE NOTEBOOK
# ---------------------------------------------------------

@app.delete(
    "/api/notebooks/{notebook_id}"
)
def delete_notebook(
    notebook_id: int,
    db: Session = Depends(get_db),
):

    success = crud.delete_notebook(
        db=db,
        notebook_id=notebook_id,
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Notebook not found",
        )

    return {
        "message": (
            f"Notebook #{notebook_id} "
            "deleted successfully"
        ),
        "id": notebook_id,
    }


# ---------------------------------------------------------
# STATS
# ---------------------------------------------------------

@app.get(
    "/api/stats",
    response_model=schemas.StatsResponse,
)
def get_platform_stats(
    db: Session = Depends(get_db)
):

    return crud.get_stats(db)