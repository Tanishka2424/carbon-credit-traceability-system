"""
Auth routes: register, verify OTP, login, me, resend OTP, Google OAuth.
"""
import uuid
import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.models.user_schemas import (
    CompanyRegister,
    CompanyLogin,
    OTPVerify,
    OTPResend,
    CompanyResponse,
    TokenResponse,
    GoogleAuthRequest,
)
from app.utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    generate_otp,
    store_otp,
    verify_otp,
    get_current_user,
)
from app.utils.database import get_db
from app.utils.email import send_otp_email

router = APIRouter()


async def _send_otp_bg(email: str, company_name: str, otp: str):
    """Background task helper: send OTP email, log on failure."""
    try:
        await send_otp_email(email, company_name, otp)
    except Exception as e:
        print(f"[DEV OTP] Email send failed for {email}: {e}")
        print(f"[DEV OTP] OTP for {email}: {otp}")


@router.post("/register", status_code=201)
async def register(body: CompanyRegister):
    """Register a new company account. Sends OTP to email for verification.
    Returns dev_otp in the response when email is not configured (dev mode).
    If the email exists but is unverified (e.g. wrong email entered before),
    the old record is replaced so the user can retry with any email.
    """
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Check if email already exists
    existing_email = await db.companies.find_one({"email": body.email})
    if existing_email:
        if existing_email.get("is_verified"):
            # Already a real verified account → hard block
            raise HTTPException(status_code=409, detail="Email already registered")
        else:
            # Unverified account (e.g. user entered wrong email before)
            # → delete the stale record and allow fresh registration
            await db.companies.delete_one({"email": body.email})
            await db.otp_store.delete_many({"email": body.email})

    # Check company_id collision — only block if the OTHER account is verified
    existing_cid = await db.companies.find_one({"company_id": body.company_id.upper()})
    if existing_cid and existing_cid.get("email") != body.email:
        if existing_cid.get("is_verified"):
            raise HTTPException(status_code=409, detail="Company ID already taken")
        else:
            # Stale unverified record with same company_id → clean it up
            await db.companies.delete_one({"company_id": body.company_id.upper()})

    user_id = str(uuid.uuid4())
    otp = generate_otp()

    company_doc = {
        "user_id": user_id,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "company_name": body.company_name,
        "company_id": body.company_id.upper(),
        "industry": body.industry,
        "contact_phone": body.contact_phone,
        "role": "company",
        "is_verified": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.companies.insert_one(company_doc)
    await store_otp(body.email, otp)

    # Try to send email; return dev_otp in response if sending fails
    email_sent = True
    try:
        await send_otp_email(body.email, body.company_name, otp)
    except Exception as e:
        email_sent = False
        print(f"[DEV OTP] Email send failed for {body.email}: {e}")
        print(f"[DEV OTP] OTP for {body.email}: {otp}")

    response = {"message": f"Registration successful. OTP sent to {body.email}. Verify within 10 minutes."}
    if not email_sent:
        response["dev_otp"] = otp
        response["warning"] = "Email not configured — use dev_otp field to verify during development"
    return response



@router.post("/verify-otp")
async def verify_email(body: OTPVerify):
    """Verify the OTP sent to company email and activate account."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user = await db.companies.find_one({"email": body.email})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.get("is_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")

    valid = await verify_otp(body.email, body.otp_code)
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    await db.companies.update_one(
        {"email": body.email},
        {"$set": {"is_verified": True}}
    )

    # Auto-login: create token
    token = create_access_token({"sub": user["user_id"], "role": user["role"]})
    user_resp = CompanyResponse(
        user_id=user["user_id"],
        email=user["email"],
        company_name=user["company_name"],
        company_id=user["company_id"],
        industry=user["industry"],
        role=user["role"],
        is_verified=True,
        created_at=user["created_at"],
    )
    return TokenResponse(access_token=token, user=user_resp)


@router.post("/resend-otp")
async def resend_otp(body: OTPResend):
    """Resend OTP to the registered email."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user = await db.companies.find_one({"email": body.email})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.get("is_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")

    otp = generate_otp()
    await store_otp(body.email, otp)
    email_sent = True
    try:
        await send_otp_email(body.email, user["company_name"], otp)
    except Exception as e:
        email_sent = False
        print(f"Resend OTP email failed: {e}")

    response = {"message": "OTP resent successfully"}
    if not email_sent:
        response["dev_otp"] = otp
        response["warning"] = "Email not configured — use dev_otp field to verify during development"
    return response



@router.post("/login", response_model=TokenResponse)
async def login(body: CompanyLogin):
    """Login with email and password. Returns JWT token."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user = await db.companies.find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_verified"):
        raise HTTPException(status_code=403, detail="Email not verified. Check your inbox for OTP.")

    token = create_access_token({"sub": user["user_id"], "role": user["role"]})
    user_resp = CompanyResponse(
        user_id=user["user_id"],
        email=user["email"],
        company_name=user["company_name"],
        company_id=user["company_id"],
        industry=user.get("industry", ""),
        role=user["role"],
        is_verified=user["is_verified"],
        created_at=user["created_at"],
    )
    return TokenResponse(access_token=token, user=user_resp)


@router.get("/me", response_model=CompanyResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return CompanyResponse(
        user_id=current_user["user_id"],
        email=current_user["email"],
        company_name=current_user["company_name"],
        company_id=current_user["company_id"],
        industry=current_user.get("industry", ""),
        role=current_user["role"],
        is_verified=current_user["is_verified"],
        created_at=current_user["created_at"],
    )


@router.post("/google", response_model=TokenResponse)
async def google_login(body: GoogleAuthRequest):
    """
    Google Sign-In:
    - Verifies Google's credential JWT
    - If email exists → auto-login
    - If email new → auto-register with is_verified=True (Google verified it)
    """
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    if not client_id or client_id == "your_google_client_id_here.apps.googleusercontent.com":
        raise HTTPException(
            status_code=501,
            detail="Google Sign-In not configured. Add GOOGLE_CLIENT_ID to backend/.env"
        )

    # Verify Google's token
    try:
        idinfo = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            client_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

    email        = idinfo["email"]
    google_name  = idinfo.get("name", "")
    is_verified  = idinfo.get("email_verified", False)

    if not is_verified:
        raise HTTPException(status_code=400, detail="Google account email not verified")

    # --- Existing user → auto-login ---
    existing = await db.companies.find_one({"email": email})
    if existing:
        if not existing.get("is_verified"):
            # Mark verified (they signed in with Google)
            await db.companies.update_one({"email": email}, {"$set": {"is_verified": True}})
            existing["is_verified"] = True

        token = create_access_token({"sub": existing["user_id"], "role": existing["role"]})
        user_resp = CompanyResponse(
            user_id=existing["user_id"],
            email=existing["email"],
            company_name=existing["company_name"],
            company_id=existing["company_id"],
            industry=existing.get("industry", ""),
            role=existing["role"],
            is_verified=True,
            created_at=existing["created_at"],
        )
        return TokenResponse(access_token=token, user=user_resp)

    # --- New user → auto-register ---
    # Require company details on first Google sign-up
    if not body.company_name or not body.company_id:
        raise HTTPException(
            status_code=422,
            detail="first_google_signup"  # frontend detects this and shows registration form
        )

    company_id_upper = body.company_id.upper().strip()
    if await db.companies.find_one({"company_id": company_id_upper}):
        raise HTTPException(status_code=409, detail="Company ID already taken")

    user_id = str(uuid.uuid4())
    company_doc = {
        "user_id":       user_id,
        "email":         email,
        "password_hash": None,        # Google users have no password
        "company_name":  body.company_name,
        "company_id":    company_id_upper,
        "industry":      body.industry or "Other",
        "contact_phone": None,
        "role":          "company",
        "is_verified":   True,        # Google verified their email
        "auth_provider": "google",
        "created_at":    datetime.now(timezone.utc),
    }
    await db.companies.insert_one(company_doc)

    # Send welcome OTP-less email
    try:
        otp_placeholder = "GOOGLE"
        await send_otp_email(email, body.company_name, otp_placeholder)
    except Exception:
        pass  # Welcome email failure is non-blocking

    token = create_access_token({"sub": user_id, "role": "company"})
    user_resp = CompanyResponse(
        user_id=user_id,
        email=email,
        company_name=body.company_name,
        company_id=company_id_upper,
        industry=body.industry or "Other",
        role="company",
        is_verified=True,
        created_at=company_doc["created_at"],
    )
    return TokenResponse(access_token=token, user=user_resp)
