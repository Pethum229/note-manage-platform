from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class NotebookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Title of the notebook")
    content: str = Field(..., description="Main content/body of the note")
    category: Optional[str] = Field("General", max_length=100)
    tags: Optional[str] = Field("", max_length=255, description="Comma separated tags")

class NotebookCreate(NotebookBase):
    pass

class NotebookUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None

class NotebookResponse(NotebookBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StatsResponse(BaseModel):
    total_notebooks: int
    categories_count: int
    recent_activity_count: int
    categories: List[str]
