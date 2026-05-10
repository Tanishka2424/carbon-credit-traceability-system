from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, Literal
from datetime import datetime


class CompanyRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    company_name: str = Field(..., min_length=2, max_length=100)
    company_id: str = Field(..., min_length=2, max_length=50)
    industry: str = Field(..., description="Industry sector")
    contact_phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("company_id")
    @classmethod
    def validate_company_id(cls, v):
        return v.upper().strip()


class CompanyLogin(BaseModel):
    email: EmailStr
    password: str


class OTPVerify(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)


class OTPResend(BaseModel):
    email: EmailStr


class CompanyResponse(BaseModel):
    user_id: str
    email: str
    company_name: str
    company_id: str
    industry: str
    role: Literal["company", "admin"]
    is_verified: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 1440  # minutes
    user: CompanyResponse


class AdminEmailRequest(BaseModel):
    custom_message: Optional[str] = ""


class GoogleAuthRequest(BaseModel):
    """Credential is the JWT token returned by Google Identity Services."""
    credential: str
    company_name: Optional[str] = None   # required on first sign-up
    company_id:   Optional[str] = None
    industry:     Optional[str] = None
