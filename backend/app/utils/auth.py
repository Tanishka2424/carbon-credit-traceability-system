"""
JWT authentication and OTP utilities.
"""
import os
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt as _bcrypt

from app.utils.database import get_db

# ─── Config ────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
OTP_EXPIRE_MINUTES = 10

# ─── Password hashing (direct bcrypt — avoids passlib version issues) ────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ─── JWT tokens ────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── Dependency: current user ──────────────────────────────────────────────
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_token(token)
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user = await db.companies.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.get("is_verified", False):
        raise HTTPException(status_code=403, detail="Email not verified. Check your inbox.")
    return user


async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ─── OTP ───────────────────────────────────────────────────────────────────
def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


async def store_otp(email: str, otp: str):
    db = get_db()
    if db is None:
        return
    await db.otp_store.delete_many({"email": email})  # clear old OTPs
    await db.otp_store.insert_one({
        "email": email,
        "otp": otp,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
    })


async def verify_otp(email: str, otp: str) -> bool:
    db = get_db()
    if db is None:
        return False
    record = await db.otp_store.find_one({"email": email, "otp": otp})
    if not record:
        return False
    # Motor returns datetime objects that may be naive (UTC) or aware depending on driver.
    # Normalise both sides to offset-aware UTC for a safe comparison.
    expires_at = record["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        await db.otp_store.delete_one({"_id": record["_id"]})
        return False
    await db.otp_store.delete_one({"_id": record["_id"]})
    return True
