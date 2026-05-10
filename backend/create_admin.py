# -*- coding: utf-8 -*-
"""
One-time admin seeding script.
Run this ONCE after setting up the project to create the admin account.

Usage:
  cd backend
  python create_admin.py
"""
import asyncio
import uuid
import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed_admin():
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name   = os.getenv("DATABASE_NAME", "carbon_credit_tracer")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print("\n=== Carbon Credit Tracer - Admin Account Setup ===")
    print("=" * 50)

    email    = input("Admin email: ").strip()
    password = input("Admin password (min 8 chars): ").strip()

    if len(password) < 8:
        print("ERROR: Password too short. Minimum 8 characters.")
        client.close()
        return

    existing = await db.companies.find_one({"email": email})
    if existing:
        if existing.get("role") == "admin":
            print(f"WARNING: Admin with email '{email}' already exists.")
        else:
            await db.companies.update_one(
                {"email": email},
                {"$set": {"role": "admin", "is_verified": True}}
            )
            print(f"OK: Existing account '{email}' promoted to admin.")
        client.close()
        return

    admin_doc = {
        "user_id":      str(uuid.uuid4()),
        "email":        email,
        "password_hash": pwd_context.hash(password),
        "company_name": "CCT Admin",
        "company_id":   "ADMIN-001",
        "industry":     "Administration",
        "contact_phone": None,
        "role":         "admin",
        "is_verified":  True,
        "created_at":   datetime.now(timezone.utc),
    }

    await db.companies.insert_one(admin_doc)

    print("\nAdmin account created successfully!")
    print(f"  Email : {email}")
    print(f"  Role  : admin")
    print(f"  DB    : {db_name}")
    print("\nYou can now login at http://localhost:5173/login")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_admin())
