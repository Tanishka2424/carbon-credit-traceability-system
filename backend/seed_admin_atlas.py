"""
One-shot admin seeder for Atlas -- no user input needed.
Edit ADMIN_EMAIL and ADMIN_PASSWORD below, then run:
  python seed_admin_atlas.py
"""
import asyncio, uuid, os
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# -- Set your admin credentials here ------------------------------------------
ADMIN_EMAIL    = "projectaalphaa@gmail.com"
ADMIN_PASSWORD = "Admin@2711"        # change this to what you want
# -----------------------------------------------------------------------------

from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt as _bcrypt


def hash_pw(plain):
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


async def main():
    url = os.getenv("MONGODB_URL")
    db_name = os.getenv("DATABASE_NAME", "carbon_credit_tracer")
    client = AsyncIOMotorClient(url)
    db = client[db_name]

    existing = await db.companies.find_one({"email": ADMIN_EMAIL})
    if existing:
        await db.companies.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {
                "password_hash": hash_pw(ADMIN_PASSWORD),
                "role": "admin",
                "is_verified": True,
            }}
        )
        print("DONE: Admin updated and password re-hashed ->", ADMIN_EMAIL)
    else:
        await db.companies.insert_one({
            "user_id":        str(uuid.uuid4()),
            "email":          ADMIN_EMAIL,
            "password_hash":  hash_pw(ADMIN_PASSWORD),
            "company_name":   "CCT Admin",
            "company_id":     "ADMIN-001",
            "industry":       "Administration",
            "contact_phone":  None,
            "role":           "admin",
            "is_verified":    True,
            "created_at":     datetime.now(timezone.utc),
        })
        print("DONE: Admin created ->", ADMIN_EMAIL)

    print("  Password :", ADMIN_PASSWORD)
    print("  DB       :", db_name)
    client.close()


asyncio.run(main())
