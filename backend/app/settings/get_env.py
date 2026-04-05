"""
Centralized environment variable exporter.
All environment variables are loaded and exported from here.
"""
import os
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database
MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/reverba")

# Authentication
ACCESS_TOKEN_SECRET: str = os.getenv("ACCESS_TOKEN_SECRET", "")
REFRESH_TOKEN_SECRET: str = os.getenv("REFRESH_TOKEN_SECRET", "")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MIN: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MIN", "15"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

# OpenAI
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Cron
CRON_TIMEZONE: str = os.getenv("CRON_TIMEZONE", "Asia/Kolkata")

# Email (Resend)
RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "")

# Application
APP_SECRET_KEY: str = os.getenv("APP_SECRET_KEY", "")
APP_ENV: str = os.getenv("APP_ENV", "development")
CORS_ORIGINS: List[str] = [
    origin.strip() 
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
]

# Validate required environment variables
if APP_ENV == "production":
    required_vars = [
        ("ACCESS_TOKEN_SECRET", ACCESS_TOKEN_SECRET),
        ("REFRESH_TOKEN_SECRET", REFRESH_TOKEN_SECRET),
        ("MONGO_URI", MONGO_URI),
        ("OPENAI_API_KEY", OPENAI_API_KEY),
        ("APP_SECRET_KEY", APP_SECRET_KEY),
        ("RESEND_API_KEY", RESEND_API_KEY),
    ]
    
    missing_vars = [var_name for var_name, var_value in required_vars if not var_value]
    if missing_vars:
        raise ValueError(f"Missing required environment variables in production: {', '.join(missing_vars)}")
