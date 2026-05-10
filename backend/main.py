from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import logging
import os

from app.routes import submissions, dashboard, health, auth, admin
from app.services.ml_service import MLService
from app.utils.database import connect_db, close_db
from app.middleware.logging import LoggingMiddleware

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)

ml_service = MLService()  # loads from pkl if exists, trains only if not


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    # ML already loaded/trained in MLService.__init__ via _load_or_train()
    app.state.ml_service = ml_service
    yield
    await close_db()


app = FastAPI(
    title="Carbon Credit Tracer API",
    description="AI-powered carbon emission verification and credit issuance system",
    version="2.0.0",
    lifespan=lifespan,
)

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)

app.include_router(health.router,       prefix="/api",             tags=["Health"])
app.include_router(auth.router,         prefix="/api/auth",        tags=["Auth"])
app.include_router(submissions.router,  prefix="/api/submissions",  tags=["Submissions"])
app.include_router(dashboard.router,    prefix="/api/dashboard",   tags=["Dashboard"])
app.include_router(admin.router,        prefix="/api/admin",       tags=["Admin"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
