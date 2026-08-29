"""ORM models for complaints, departments, and status history."""
import datetime
import enum

from sqlalchemy import (Column, DateTime, Enum, Float, ForeignKey, Integer,
                         String, Text)
from sqlalchemy.orm import relationship

from database import Base


class ComplaintStatus(str, enum.Enum):
    RECEIVED = "received"
    CLASSIFIED = "classified"
    ROUTED = "routed"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class Priority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    category = Column(String, index=True)  # e.g. "roads", "sanitation"
    email = Column(String, nullable=True)
    active_officers = Column(Integer, default=5)

    complaints = relationship("Complaint", back_populates="department")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    citizen_name = Column(String, nullable=True)
    citizen_contact = Column(String, nullable=True)
    description = Column(Text)
    original_language = Column(String, default="en")
    translated_description = Column(Text, nullable=True)

    image_path = Column(String, nullable=True)
    detected_objects = Column(Text, nullable=True)  # JSON string of CV results

    category = Column(String, nullable=True, index=True)
    subcategory = Column(String, nullable=True)
    priority = Column(Enum(Priority), default=Priority.MEDIUM)
    status = Column(Enum(ComplaintStatus), default=ComplaintStatus.RECEIVED)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String, nullable=True)

    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department", back_populates="complaints")

    ai_summary = Column(Text, nullable=True)
    ai_response = Column(Text, nullable=True)
    agent_trace = Column(Text, nullable=True)  # JSON log of agent decisions

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow,
                         onupdate=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
