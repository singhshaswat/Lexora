from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.settings.get_env import (
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MIN,
    REFRESH_TOKEN_EXPIRE_DAYS
)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MIN)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, ACCESS_TOKEN_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, REFRESH_TOKEN_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str) -> Optional[dict]:
    """Verify and decode an access token"""
    try:
        payload = jwt.decode(token, ACCESS_TOKEN_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None

def verify_refresh_token(token: str) -> Optional[dict]:
    """Verify and decode a refresh token"""
    try:
        payload = jwt.decode(token, REFRESH_TOKEN_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None
