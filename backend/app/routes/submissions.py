from fastapi import APIRouter, HTTPException, Request, Query, Depends
from datetime import datetime, timezone
import uuid

from app.models.schemas import (
    SubmissionRequest,
    SubmissionResponse,
    SubmissionListItem,
    BaselineResult,
    AIVerificationResult,
    CreditResult,
)
from app.utils.baseline import get_baseline
from app.utils.auth import get_current_user
from app.services.credit_service import calculate_credits
from app.utils.database import get_db

router = APIRouter()


@router.post("/", response_model=SubmissionResponse, status_code=201)
async def submit_emission(
    request: Request,
    body: SubmissionRequest,
    current_user: dict = Depends(get_current_user),
):
    """Submit an emission report. Requires authentication."""
    ml_service = request.app.state.ml_service
    db = get_db()

    # 1. Baseline lookup
    try:
        baseline_data = get_baseline(body.material, body.quantity_tonnes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    baseline_co2 = baseline_data["baseline_co2_tonnes"]

    # 2. AI anomaly detection
    ai_result = ml_service.predict(
        material=body.material,
        quantity_tonnes=body.quantity_tonnes,
        reported_co2=body.reported_co2_tonnes,
        baseline_co2=baseline_co2,
    )

    # 3. Credit calculation
    credit_result = calculate_credits(
        reported_co2=body.reported_co2_tonnes,
        baseline_co2=baseline_co2,
        ai_verdict=ai_result["verdict"],
    )

    # 4. Final status
    final_status = "APPROVED" if credit_result["eligible"] else "REJECTED"

    # 5. Build document
    submission_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    doc = {
        "submission_id": submission_id,
        "user_id": current_user["user_id"],
        "company_name": current_user["company_name"],
        "company_id": current_user["company_id"],
        "material": body.material,
        "quantity_tonnes": body.quantity_tonnes,
        "reported_co2_tonnes": body.reported_co2_tonnes,
        "period": body.period,
        "baseline_co2_tonnes": baseline_co2,
        "emission_factor": baseline_data["emission_factor"],
        "baseline_source": baseline_data["source"],
        "anomaly_score": ai_result["anomaly_score"],
        "is_anomaly": ai_result["is_anomaly"],
        "ai_confidence": ai_result["confidence"],
        "ai_verdict": ai_result["verdict"],
        "credits_earned": credit_result["credits_earned"],
        "credit_eligible": credit_result["eligible"],
        "credit_reason": credit_result["reason"],
        "final_status": final_status,
        "blockchain_ref": None,
        "correction_email_sent": False,
        "created_at": now,
    }

    if db is not None:
        await db.submissions.insert_one(doc)

    return SubmissionResponse(
        submission_id=submission_id,
        company_name=current_user["company_name"],
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        material=body.material,
        quantity_tonnes=body.quantity_tonnes,
        reported_co2_tonnes=body.reported_co2_tonnes,
        period=body.period,
        baseline=BaselineResult(
            material=body.material,
            quantity_tonnes=body.quantity_tonnes,
            emission_factor=baseline_data["emission_factor"],
            baseline_co2_tonnes=baseline_co2,
            unit=baseline_data["unit"],
            source=baseline_data["source"],
        ),
        ai_verification=AIVerificationResult(
            anomaly_score=ai_result["anomaly_score"],
            is_anomaly=ai_result["is_anomaly"],
            confidence=ai_result["confidence"],
            verdict=ai_result["verdict"],
        ),
        credits=CreditResult(
            credits_earned=credit_result["credits_earned"],
            eligible=credit_result["eligible"],
            reason=credit_result["reason"],
        ),
        final_status=final_status,
        blockchain_ref=None,
        created_at=now,
    )


@router.get("/")
async def list_submissions(
    limit: int = Query(50, ge=1, le=200),
    page: int = Query(1, ge=1),
    status: str = Query(None),
    material: str = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List submissions — companies see only their own. Returns paginated result."""
    db = get_db()
    if db is None:
        return {"items": [], "total": 0, "page": page, "per_page": limit, "total_pages": 0}

    query = {"company_id": current_user["company_id"]}
    if status:
        query["final_status"] = status.upper()
    if material:
        query["material"] = material.lower()

    total = await db.submissions.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.submissions.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    items = [
        SubmissionListItem(
            submission_id=d["submission_id"],
            company_name=d["company_name"],
            company_id=d["company_id"],
            material=d["material"],
            quantity_tonnes=d["quantity_tonnes"],
            reported_co2_tonnes=d["reported_co2_tonnes"],
            baseline_co2_tonnes=d["baseline_co2_tonnes"],
            credits_earned=d["credits_earned"],
            ai_verdict=d.get("ai_verdict", "NORMAL"),
            final_status=d["final_status"],
            period=d.get("period"),
            created_at=d["created_at"],
        )
        for d in docs
    ]

    return {
        "items": [i.model_dump() for i in items],
        "total": total,
        "page": page,
        "per_page": limit,
        "total_pages": max(1, -(-total // limit)),
    }


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Fetch a single submission. Companies can only view their own."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query = {"submission_id": submission_id}
    if current_user["role"] != "admin":
        query["company_id"] = current_user["company_id"]

    doc = await db.submissions.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")

    return SubmissionResponse(
        submission_id=doc["submission_id"],
        company_name=doc["company_name"],
        company_id=doc["company_id"],
        user_id=doc.get("user_id"),
        material=doc["material"],
        quantity_tonnes=doc["quantity_tonnes"],
        reported_co2_tonnes=doc["reported_co2_tonnes"],
        period=doc.get("period", ""),
        baseline=BaselineResult(
            material=doc["material"],
            quantity_tonnes=doc["quantity_tonnes"],
            emission_factor=doc["emission_factor"],
            baseline_co2_tonnes=doc["baseline_co2_tonnes"],
            unit=f"t CO2 / t {doc['material']}",
            source=doc["baseline_source"],
        ),
        ai_verification=AIVerificationResult(
            anomaly_score=doc["anomaly_score"],
            is_anomaly=doc["is_anomaly"],
            confidence=doc["ai_confidence"],
            verdict=doc["ai_verdict"],
        ),
        credits=CreditResult(
            credits_earned=doc["credits_earned"],
            eligible=doc["credit_eligible"],
            reason=doc["credit_reason"],
        ),
        final_status=doc["final_status"],
        blockchain_ref=doc.get("blockchain_ref"),
        created_at=doc["created_at"],
    )
