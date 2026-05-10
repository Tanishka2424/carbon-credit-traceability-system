from fastapi import APIRouter
from app.utils.database import get_db
from app.utils.baseline import EMISSION_FACTORS

router = APIRouter()

@router.get("/health")
async def health_check():
    db = get_db()
    db_status = "connected" if db is not None else "disconnected"
    try:
        if db is not None:
            await db.command("ping")
    except Exception:
        db_status = "error"

    return {
        "status": "ok",
        "database": db_status,
        "supported_materials": list(EMISSION_FACTORS.keys()),
        "version": "2.0.0",
    }

@router.get("/baseline-factors")
async def get_baseline_factors():
    """Return all supported materials and their emission factors."""
    return {
        material: {
            "factor": data["factor"],
            "unit": data["unit"],
            "description": data["description"],
            "source": data["source"],
        }
        for material, data in EMISSION_FACTORS.items()
    }
