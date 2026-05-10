from motor.motor_asyncio import AsyncIOMotorClient
import os

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DATABASE_NAME", "carbon_credit_tracer")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # ── Submissions indexes ────────────────────────────────────────────────
    await db.submissions.create_index("submission_id", unique=True)
    await db.submissions.create_index("company_id")
    await db.submissions.create_index("user_id")
    await db.submissions.create_index("created_at")
    await db.submissions.create_index("final_status")
    await db.submissions.create_index([("material", 1), ("final_status", 1)])

    # ── Companies indexes ──────────────────────────────────────────────────
    await db.companies.create_index("email", unique=True)
    await db.companies.create_index("company_id", unique=True)
    await db.companies.create_index("user_id", unique=True)
    await db.companies.create_index("role")

    # ── OTP TTL index (auto-delete after 10 min) ───────────────────────────
    await db.otp_store.create_index("expires_at", expireAfterSeconds=0)

    print(f"Connected to MongoDB: {db_name} | Indexes ready")


async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")


def get_db():
    return db
