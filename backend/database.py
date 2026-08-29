"""
Database configuration for the AI Smart City Complaint Management Platform.
Uses SQLite for local/demo purposes. Swap SQLALCHEMY_DATABASE_URL for a
PostgreSQL connection string (e.g. postgresql://user:pass@host/db) in production.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./smartcity.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
