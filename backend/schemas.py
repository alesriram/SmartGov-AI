import datetime
from typing import List, Optional

from pydantic import BaseModel


class ComplaintCreate(BaseModel):
    citizen_name: Optional[str] = None
    citizen_contact: Optional[str] = None
    description: str
    original_language: Optional[str] = "en"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None


class ComplaintOut(BaseModel):
    id: int
    citizen_name: Optional[str]
    citizen_contact: Optional[str] = None
    description: str
    original_language: Optional[str] = "en"
    translated_description: Optional[str]
    category: Optional[str]
    subcategory: Optional[str]
    priority: str
    status: str
    latitude: Optional[float]
    longitude: Optional[float]
    address: Optional[str]
    department: Optional[str] = None
    department_head: Optional[dict] = None
    ai_summary: Optional[str]
    ai_response: Optional[str]
    detected_objects: Optional[str]
    image_path: Optional[str]
    created_at: datetime.datetime
    email_dispatched: Optional[bool] = None

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_complaints: int
    received: int
    in_progress: int
    resolved: int
    critical_open: int
    avg_resolution_hours: Optional[float]
    category_breakdown: dict
    priority_breakdown: dict


class ForecastPoint(BaseModel):
    date: str
    predicted_count: float


class HotspotOut(BaseModel):
    latitude: float
    longitude: float
    category: str
    complaint_count: int
    intensity: str
