from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import datetime
from app.models import Notebook
from app.schemas import NotebookCreate, NotebookUpdate

def get_notebooks(db: Session, skip: int = 0, limit: int = 100, search: str = None, category: str = None):
    query = db.query(Notebook)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Notebook.title.ilike(search_pattern),
                Notebook.content.ilike(search_pattern),
                Notebook.tags.ilike(search_pattern)
            )
        )
    if category and category.strip() and category != "All":
        query = query.filter(Notebook.category.ilike(category.strip()))
    
    return query.order_by(Notebook.updated_at.desc()).offset(skip).limit(limit).all()

def get_notebook_by_id(db: Session, notebook_id: int):
    return db.query(Notebook).filter(Notebook.id == notebook_id).first()

def create_notebook(db: Session, notebook_in: NotebookCreate):
    db_notebook = Notebook(
        title=notebook_in.title,
        content=notebook_in.content,
        category=notebook_in.category or "General",
        tags=notebook_in.tags or "",
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    db.add(db_notebook)
    db.commit()
    db.refresh(db_notebook)
    return db_notebook

def update_notebook(db: Session, notebook_id: int, notebook_in: NotebookUpdate):
    db_notebook = get_notebook_by_id(db, notebook_id)
    if not db_notebook:
        return None
    
    update_data = notebook_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(db_notebook, field, value)
    
    db_notebook.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(db_notebook)
    return db_notebook

def delete_notebook(db: Session, notebook_id: int):
    db_notebook = get_notebook_by_id(db, notebook_id)
    if not db_notebook:
        return False
    db.delete(db_notebook)
    db.commit()
    return True

def get_stats(db: Session):
    total = db.query(func.count(Notebook.id)).scalar() or 0
    categories = db.query(Notebook.category).distinct().all()
    cat_list = [c[0] for c in categories if c[0]]
    
    return {
        "total_notebooks": total,
        "categories_count": len(cat_list),
        "recent_activity_count": min(total, 5),
        "categories": cat_list
    }
