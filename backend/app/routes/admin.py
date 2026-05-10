"""
Admin-only routes: companies management, all submissions, correction emails.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from app.utils.auth import get_admin_user
from app.utils.database import get_db
from app.utils.email import send_correction_email
from app.models.user_schemas import AdminEmailRequest
from app.models.schemas import DashboardStats

router = APIRouter()


@router.get("/stats")
async def admin_stats(admin=Depends(get_admin_user)):
    """Platform-wide stats for admin dashboard."""
    db = get_db()
    if db is None:
        return {}

    total_companies = await db.companies.count_documents({"role": "company"})
    verified_companies = await db.companies.count_documents({"role": "company", "is_verified": True})
    total = await db.submissions.count_documents({})
    approved = await db.submissions.count_documents({"final_status": "APPROVED"})
    rejected = await db.submissions.count_documents({"final_status": "REJECTED"})

    pipeline_credits = [
        {"$match": {"final_status": "APPROVED"}},
        {"$group": {"_id": None, "total": {"$sum": "$credits_earned"}}},
    ]
    credits_result = await db.submissions.aggregate(pipeline_credits).to_list(1)
    total_credits = credits_result[0]["total"] if credits_result else 0.0
    approval_rate = round((approved / total * 100), 1) if total > 0 else 0.0

    return {
        "total_companies": total_companies,
        "verified_companies": verified_companies,
        "total_submissions": total,
        "approved_count": approved,
        "rejected_count": rejected,
        "total_credits_issued": round(total_credits, 2),
        "total_co2_saved_tonnes": round(total_credits, 2),
        "approval_rate": approval_rate,
    }


@router.get("/companies")
async def list_companies(
    limit: int = Query(50, ge=1, le=200),
    search: str = Query(None),
    admin=Depends(get_admin_user),
):
    """List all registered companies with submission stats."""
    db = get_db()
    if db is None:
        return []

    query = {"role": "company"}
    if search:
        query["$or"] = [
            {"company_name": {"$regex": search, "$options": "i"}},
            {"company_id": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    companies = await db.companies.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    # Enrich with submission counts
    result = []
    for c in companies:
        sub_count = await db.submissions.count_documents({"company_id": c["company_id"]})
        approved_count = await db.submissions.count_documents({"company_id": c["company_id"], "final_status": "APPROVED"})
        credits_pipeline = [
            {"$match": {"company_id": c["company_id"], "final_status": "APPROVED"}},
            {"$group": {"_id": None, "total": {"$sum": "$credits_earned"}}},
        ]
        cr = await db.submissions.aggregate(credits_pipeline).to_list(1)
        total_credits = round(cr[0]["total"], 2) if cr else 0.0

        result.append({
            **c,
            "created_at": c["created_at"].isoformat() if c.get("created_at") else None,
            "total_submissions": sub_count,
            "approved_submissions": approved_count,
            "total_credits_earned": total_credits,
        })

    return result


@router.get("/companies/{company_id}")
async def get_company(company_id: str, admin=Depends(get_admin_user)):
    """Get a single company profile with full stats."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    company = await db.companies.find_one(
        {"company_id": company_id.upper()},
        {"_id": 0, "password_hash": 0}
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    submissions = await db.submissions.find(
        {"company_id": company_id.upper()},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)

    return {
        **company,
        "created_at": company["created_at"].isoformat() if company.get("created_at") else None,
        "recent_submissions": [
            {**s, "created_at": s["created_at"].isoformat() if s.get("created_at") else None}
            for s in submissions
        ],
    }


@router.get("/submissions")
async def admin_list_submissions(
    limit: int = Query(50, ge=1, le=200),
    page: int = Query(1, ge=1),
    status: str = Query(None),
    material: str = Query(None),
    company_id: str = Query(None),
    admin=Depends(get_admin_user),
):
    """List all submissions across all companies (admin only)."""
    db = get_db()
    if db is None:
        return {"items": [], "total": 0, "page": 1, "per_page": limit, "total_pages": 0}

    query = {}
    if status:
        query["final_status"] = status.upper()
    if material:
        query["material"] = material.lower()
    if company_id:
        query["company_id"] = company_id.upper()

    total = await db.submissions.count_documents(query)
    skip = (page - 1) * limit
    docs = await db.submissions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    items = [
        {**d, "created_at": d["created_at"].isoformat() if d.get("created_at") else None}
        for d in docs
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": limit,
        "total_pages": max(1, -(-total // limit)),
    }


@router.post("/notify-correction/{submission_id}")
async def send_correction_notification(
    submission_id: str,
    body: AdminEmailRequest,
    admin=Depends(get_admin_user),
):
    """Send a correction suggestion email to the company that owns this submission."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Get submission
    submission = await db.submissions.find_one({"submission_id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    if submission.get("final_status") == "APPROVED":
        raise HTTPException(status_code=400, detail="Can only send correction emails for REJECTED submissions")

    # Get company email
    company = await db.companies.find_one({"company_id": submission["company_id"]})
    if not company:
        raise HTTPException(status_code=404, detail="Company account not found for this submission")

    try:
        await send_correction_email(
            company_email=company["email"],
            company_name=company["company_name"],
            submission_id=submission_id,
            material=submission["material"],
            reported_co2=submission["reported_co2_tonnes"],
            baseline_co2=submission["baseline_co2_tonnes"],
            anomaly_score=submission["anomaly_score"],
            custom_message=body.custom_message or "",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")

    # Log the notification
    await db.submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {"correction_email_sent": True, "correction_email_by": admin["user_id"]}}
    )

    return {"message": f"Correction email sent to {company['email']}"}


@router.delete("/companies/{company_id}")
async def deactivate_company(company_id: str, admin=Depends(get_admin_user)):
    """Deactivate (soft-delete) a company account."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    result = await db.companies.update_one(
        {"company_id": company_id.upper()},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")

    return {"message": f"Company {company_id} deactivated"}
