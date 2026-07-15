from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings


def create_database_engine(url: str):
    engine = create_engine(
        url,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        connect_args={"connect_timeout": 5},
    )
    # Confirm database connectivity immediately.
    conn = engine.connect()
    conn.close()
    return engine


try:
    engine = create_database_engine(settings.DATABASE_URL)
except OperationalError:
    print("WARNING: PostgreSQL unreachable, falling back to SQLite local DB.")
    engine = create_engine(
        settings.LOCAL_DB_FALLBACK_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
