from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
from app.utils.baseline import SUPPORTED_MATERIALS
import re


class SubmissionRequest(BaseModel):
    company_name: Optional[str] = None   # read from JWT token on backend
    company_id: Optional[str] = None     # read from JWT token on backend
    material: str = Field(..., description=f"One of: {SUPPORTED_MATERIALS}")
    quantity_tonnes: float = Field(..., gt=0, description="Quantity of material produced in tonnes")
    reported_co2_tonnes: float = Field(..., gt=0, description="Self-reported CO2 emissions in tonnes")
    period: str = Field(..., description="Reporting period e.g. '2024-Q1'")

    @field_validator("material")
    @classmethod
    def validate_material(cls, v):
        v = v.lower().strip()
        if v not in SUPPORTED_MATERIALS:
            raise ValueError(f"Material must be one of: {SUPPORTED_MATERIALS}")
        return v

    @field_validator("period")
    @classmethod
    def validate_period(cls, v):
        if not re.match(r"^\d{4}-Q[1-4]$", v.strip()):
            raise ValueError("Period must be in format YYYY-Q[1-4], e.g. '2024-Q2'")
        return v.strip()


class BaselineResult(BaseModel):
    material: str
    quantity_tonnes: float
    emission_factor: float
    baseline_co2_tonnes: float
    unit: str
    source: str


class AIVerificationResult(BaseModel):
    anomaly_score: float
    is_anomaly: bool
    confidence: float
    verdict: Literal["NORMAL", "SUSPICIOUS"]


class CreditResult(BaseModel):
    credits_earned: float
    eligible: bool
    reason: str


class SubmissionResponse(BaseModel):
    submission_id: str
    company_name: str
    company_id: str
    user_id: Optional[str] = None
    material: str
    quantity_tonnes: float
    reported_co2_tonnes: float
    period: str
    baseline: BaselineResult
    ai_verification: AIVerificationResult
    credits: CreditResult
    final_status: Literal["APPROVED", "REJECTED"]
    blockchain_ref: Optional[str] = None
    created_at: datetime


class SubmissionListItem(BaseModel):
    submission_id: str
    company_name: str
    company_id: str
    material: str
    quantity_tonnes: float
    reported_co2_tonnes: float
    baseline_co2_tonnes: float
    credits_earned: float
    ai_verdict: str          # fix B1 — was missing
    final_status: str
    period: Optional[str] = None
    created_at: datetime


class DashboardStats(BaseModel):
    total_submissions: int
    approved_count: int
    rejected_count: int
    total_credits_issued: float
    total_co2_saved_tonnes: float
    approval_rate: float
    top_material: Optional[str]
