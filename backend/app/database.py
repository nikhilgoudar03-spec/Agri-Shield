import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings, BASE_DIR

logger = logging.getLogger("agrishield.database")

def get_database_url() -> str:
    if settings.DATABASE_URL:
        return settings.DATABASE_URL
    if settings.MYSQL_USER and settings.MYSQL_DB:
        user = settings.MYSQL_USER
        pwd = f":{settings.MYSQL_PASSWORD}" if settings.MYSQL_PASSWORD else ""
        host = settings.MYSQL_HOST
        port = settings.MYSQL_PORT
        db = settings.MYSQL_DB
        return f"mysql+pymysql://{user}{pwd}@{host}:{port}/{db}?charset=utf8mb4"
    return f"sqlite:///{settings.BASE_DIR / 'agrishield.db'}"

primary_url = get_database_url()
engine = None

try:
    if primary_url.startswith("mysql"):
        test_engine = create_engine(primary_url, pool_pre_ping=True, connect_args={"connect_timeout": 3})
        # Test connection
        with test_engine.connect() as conn:
            pass
        engine = test_engine
        logger.info(f"Connected to MySQL database at {settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DB}")
    else:
        engine = create_engine(primary_url, connect_args={"check_same_thread": False})
        logger.info(f"Connected to SQLite database at {primary_url}")
except Exception as e:
    logger.warning(f"Could not connect to configured database ({primary_url}): {e}")
    logger.info("Falling back to local SQLite database (sqlite:///./agrishield.db) to ensure high availability.")
    engine = create_engine(f"sqlite:///{settings.BASE_DIR / 'agrishield.db'}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
