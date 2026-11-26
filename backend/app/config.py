import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    BASE_DIR: Path = BASE_DIR
    PROJECT_NAME: str = "AgriShield – Smart Farmer Safety Platform"
    API_V1_STR: str = "/api/v1"
    
    # Database
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_DB: str = "agrishield"
    DATABASE_URL: str = ""
    
    # Security
    SECRET_KEY: str = "agrishield-super-secret-jwt-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DEV_MODE_ALLOW_TEST_AUTH: bool = True
    ADMIN_SETUP_TOKEN: str = "AGRISHIELD_ADMIN_SETUP_SECURE_TOKEN_2026"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8001"
    ]

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "allow"

settings = Settings()
