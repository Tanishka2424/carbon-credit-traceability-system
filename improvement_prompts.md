# 🚀 CCT Improvement Prompts — Ready to Execute

> Each prompt below is self-contained and copy-paste ready.
> Reference: memory.md + tracker.md in this repo root.

---

## 🐛 BUG FIXES

---

### B1 — Add `ai_verdict` to SubmissionListItem

**Prompt:**
```
In the Carbon Credit Traceability System (FastAPI + React):

1. In `backend/app/models/schemas.py`, add `ai_verdict: str` field to the `SubmissionListItem` class.

2. In `backend/app/routes/submissions.py`, in the `list_submissions` endpoint, add `ai_verdict=d["ai_verdict"]` to each `SubmissionListItem(...)` constructor call.

3. In `frontend/src/pages/SubmissionsPage.jsx`, remove the fallback `|| 'NORMAL'` from the ai_verdict StatusBadge — it should now use the real value from the API: `<StatusBadge status={r.ai_verdict} />`.

The bug: SubmissionListItem schema was missing ai_verdict, so the frontend was always showing NORMAL for AI verdict in the submissions table.
```

---

### B2 — Fix Marketplace avgPrice NaN bug

**Prompt:**
```
In `frontend/src/pages/MarketplacePage.jsx`:

Fix the avgPrice calculation on line 26. Currently:
  const avgPrice = (live.reduce((a, b) => a + b.price, 0) / live.length).toFixed(2)

If `live.length` is 0, this produces NaN. Fix it:
  const avgPrice = live.length > 0
    ? (live.reduce((a, b) => a + b.price, 0) / live.length).toFixed(2)
    : '0.00'

Also guard the totalCCT display in JSX with: {totalCCT > 0 ? fmt(totalCCT) : '0'}
```

---

### B3 — Add period format validation

**Prompt:**
```
In `backend/app/models/schemas.py`, add a field_validator for the `period` field in `SubmissionRequest`:

@field_validator("period")
@classmethod
def validate_period(cls, v):
    import re
    pattern = r"^\d{4}-Q[1-4]$"
    if not re.match(pattern, v.strip()):
        raise ValueError("Period must be in format YYYY-Q[1-4], e.g. '2024-Q2'")
    return v.strip()

Also update the placeholder in `frontend/src/pages/SubmitPage.jsx` to show "2024-Q2" and add a helper text below the period input: "Format: YYYY-Q1 to YYYY-Q4".
```

---

### B4 — Add MongoDB indexes

**Prompt:**
```
In `backend/app/utils/database.py`, after connecting to MongoDB, create indexes on the submissions collection:

async def connect_db():
    global client, db
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DATABASE_NAME", "carbon_credit_tracer")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    # Create indexes for performance
    await db.submissions.create_index("submission_id", unique=True)
    await db.submissions.create_index("company_id")
    await db.submissions.create_index("created_at")
    await db.submissions.create_index("final_status")
    await db.submissions.create_index([("material", 1), ("final_status", 1)])
    print(f"Connected to MongoDB: {db_name} | Indexes created")
```

---

### B5 — Dynamic material factors from API in frontend

**Prompt:**
```
In `frontend/src/pages/SubmitPage.jsx`:

1. Remove the hardcoded `const FACTORS = { cement: 0.90, steel: 1.80, aluminum: 11.50 }` at the top.

2. Import `getBaselineFactors` from `../utils/api`.

3. Add state: `const [factors, setFactors] = useState({ cement: 0.90, steel: 1.80, aluminum: 11.50 })`
   (keep defaults as fallback).

4. Add a useEffect on mount:
   useEffect(() => {
     getBaselineFactors().then(data => {
       const f = {}
       Object.entries(data).forEach(([mat, info]) => { f[mat] = info.factor })
       setFactors(f)
     }).catch(() => {}) // silent fallback to defaults
   }, [])

5. Update the material <select> options to be dynamically generated from `Object.entries(factors)`.

6. Replace all `FACTORS[form.material]` references with `factors[form.material] || 0`.

This ensures the frontend always reflects the backend's current emission factors without hardcoding.
```

---

### B6 — Fix double ML train on startup

**Prompt:**
```
In `backend/main.py`, the lifespan function currently calls `ml_service.train()` explicitly:

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    ml_service.train()          # ← BUG: always retrains even if pkl exists
    app.state.ml_service = ml_service
    yield
    await close_db()

Fix: The MLService.__init__ already calls `_load_or_train()` which loads from disk if pkl exists.
Remove the explicit `ml_service.train()` call from lifespan:

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    # MLService already loaded/trained in __init__ via _load_or_train()
    app.state.ml_service = ml_service
    yield
    await close_db()

This prevents unnecessary retraining on every server restart.
```

---

### B7 — Add dashboard refresh button

**Prompt:**
```
In `frontend/src/pages/DashboardPage.jsx`:

1. Extract the data-loading logic into a named function `loadData`:
   const loadData = useCallback(() => {
     setLoading(true)
     Promise.all([getDashboardStats(), getRecentSubmissions(8), getCreditsByMaterial()])
       .then(([s, r, m]) => { setStats(s); setRecent(r); setByMaterial(m) })
       .catch(console.error)
       .finally(() => setLoading(false))
   }, [])

2. Change useEffect to call loadData: useEffect(() => { loadData() }, [loadData])

3. Add a refresh button next to the "+ Submit Report" CTA in the header:
   <button className={styles.refreshBtn} onClick={loadData} disabled={loading}>
     {loading ? '↻' : '↻ Refresh'}
   </button>

4. Add `.refreshBtn` style in `DashboardPage.module.css` — small ghost button with rotation animation on loading.
```

---

## 🔴 HIGH PRIORITY IMPROVEMENTS

---

### P1 — JWT Authentication System

**Prompt:**
```
Add JWT authentication to the Carbon Credit Traceability System:

BACKEND:
1. Add to requirements.txt: `python-jose[cryptography]==3.3.0`, `passlib[bcrypt]==1.7.4`

2. Create `backend/app/models/user_schemas.py`:
   - UserRegister(BaseModel): email, password, company_name, company_id
   - UserLogin(BaseModel): email, password
   - UserResponse(BaseModel): user_id, email, company_name, company_id, created_at
   - TokenResponse(BaseModel): access_token, token_type="bearer", expires_in

3. Create `backend/app/utils/auth.py`:
   - SECRET_KEY from env (generate with: openssl rand -hex 32)
   - ALGORITHM = "HS256", ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 (24 hrs)
   - `hash_password(plain)` → bcrypt hash
   - `verify_password(plain, hashed)` → bool
   - `create_access_token(data: dict)` → JWT string
   - `get_current_user(token: str = Depends(oauth2_scheme))` → user dict or 401

4. Create `backend/app/routes/auth.py`:
   - POST /api/auth/register → create user in `db.users`, return UserResponse
   - POST /api/auth/login → verify password, return TokenResponse

5. Protect POST /api/submissions/ with `current_user = Depends(get_current_user)`
   - Store `user_id` and `company_id` from token in the submission document

6. Add auth router to main.py: `app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])`

FRONTEND:
1. Create `frontend/src/pages/LoginPage.jsx` and `RegisterPage.jsx` with styled forms.
2. Create `frontend/src/utils/auth.js`:
   - `getToken()`, `setToken(t)`, `removeToken()` using localStorage
   - `isLoggedIn()` → bool
3. Add Axios interceptor in `api.js` to attach `Authorization: Bearer <token>` header.
4. Add routes `/login` and `/register` in `App.jsx` outside the Layout.
5. In `Layout.jsx`, add a logout button in the sidebar footer.
6. Redirect to /login if not authenticated when accessing protected pages.
```

---

### P2 — Expand Material Support

**Prompt:**
```
Expand the Carbon Credit Traceability System to support more industrial materials:

BACKEND — `backend/app/utils/baseline.py`:
Add these materials to EMISSION_FACTORS:

"coal": {
    "factor": 2.42,
    "unit": "t CO2 / t coal",
    "description": "Bituminous coal combustion",
    "source": "IPCC 2006 Guidelines, Vol 2, Ch 2",
    "tolerance_pct": 12.0,
},
"natural_gas": {
    "factor": 2.75,
    "unit": "t CO2 / t natural gas",
    "description": "Natural gas combustion (per tonne equivalent)",
    "source": "IEA, 2023",
    "tolerance_pct": 10.0,
},
"paper": {
    "factor": 1.0,
    "unit": "t CO2 / t paper",
    "description": "Paper and pulp manufacturing",
    "source": "IPCC 2006 Guidelines, Vol 3, Ch 7",
    "tolerance_pct": 20.0,
},
"glass": {
    "factor": 0.85,
    "unit": "t CO2 / t glass",
    "description": "Flat and container glass production",
    "source": "European Glass Federation, 2022",
    "tolerance_pct": 18.0,
},
"plastics": {
    "factor": 1.9,
    "unit": "t CO2 / t plastics",
    "description": "Thermoplastic polymer production",
    "source": "IPCC 2006 Guidelines, Vol 3, Ch 6",
    "tolerance_pct": 22.0,
},

BACKEND — `backend/app/services/ml_service.py`:
Update MATERIAL_ENCODING to include new materials:
MATERIAL_ENCODING = {"cement":0, "steel":1, "aluminum":2, "coal":3, "natural_gas":4, "paper":5, "glass":6, "plastics":7}

Delete the existing pkl files (app/models/isolation_forest.pkl and scaler.pkl) so the model retrains with the new materials on next startup.

FRONTEND — `frontend/src/pages/SubmitPage.jsx`:
Follow the B5 fix (fetch factors from API dynamically) so new materials appear automatically in the dropdown.
```

---

### P3 — MongoDB Indexes (see B4 above — same prompt)

---

### P4 — Fix ML double-train (see B6 above — same prompt)

---

## 🟡 MEDIUM PRIORITY IMPROVEMENTS

---

### P6 — Period Validation (see B3 above — same prompt)

---

### P7 — Rate Limiting Middleware

**Prompt:**
```
Add rate limiting to the FastAPI backend:

1. Add to requirements.txt: `slowapi==0.1.9`

2. In `backend/main.py`:
   from slowapi import Limiter, _rate_limit_exceeded_handler
   from slowapi.util import get_remote_address
   from slowapi.errors import RateLimitExceeded

   limiter = Limiter(key_func=get_remote_address)
   app.state.limiter = limiter
   app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

3. In `backend/app/routes/submissions.py`, add rate limit to POST endpoint:
   from slowapi import Limiter
   from slowapi.util import get_remote_address
   limiter = Limiter(key_func=get_remote_address)

   @router.post("/", ...)
   @limiter.limit("10/minute")
   async def submit_emission(request: Request, body: SubmissionRequest):
       ...

4. Apply a looser limit to GET endpoints: @limiter.limit("60/minute")

5. Return a proper 429 JSON response with retry-after header.
```

---

### P8 — Request Logging Middleware

**Prompt:**
```
Add request logging to the FastAPI backend using the empty middleware folder:

1. Create `backend/app/middleware/logging.py`:

import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("cct.api")

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 2)
        logger.info(
            f"{request.method} {request.url.path} "
            f"→ {response.status_code} [{duration_ms}ms] "
            f"| IP: {request.client.host}"
        )
        return response

2. In `backend/main.py`, import and add the middleware:
   from app.middleware.logging import LoggingMiddleware
   app.add_middleware(LoggingMiddleware)

3. Configure logging in main.py:
   import logging
   logging.basicConfig(
       level=logging.INFO,
       format="%(asctime)s | %(name)s | %(levelname)s | %(message)s"
   )

This fills the currently empty middleware directory with a real logging implementation.
```

---

### P9 — Pagination for Submissions Page

**Prompt:**
```
Add cursor-based pagination to the submissions list:

BACKEND — `backend/app/routes/submissions.py`:
Add `page: int = Query(1, ge=1)` and `per_page: int = Query(20, ge=1, le=100)` params to list_submissions.
Calculate skip = (page - 1) * per_page.
Use `.skip(skip).limit(per_page)` on the cursor.
Add a total count to the response by wrapping in a new schema:

class PaginatedSubmissions(BaseModel):
    items: list[SubmissionListItem]
    total: int
    page: int
    per_page: int
    total_pages: int

FRONTEND — `frontend/src/pages/SubmissionsPage.jsx`:
1. Add `page` state: `const [page, setPage] = useState(1)`
2. Pass `page` and `per_page=20` as params to `getSubmissions()`
3. Display total count: "Showing X of Y records"
4. Add pagination controls at the bottom:
   - "← Previous" button (disabled if page === 1)
   - "Page X of Y" label
   - "Next →" button (disabled if page === total_pages)
5. Reset page to 1 when filters change.
6. Add `.pagination` styles in `SubmissionsPage.module.css` — flex row, ghost buttons.
```

---

### P10 — Export to CSV

**Prompt:**
```
Add CSV export to the submissions audit table:

BACKEND — add new endpoint in `backend/app/routes/submissions.py`:
from fastapi.responses import StreamingResponse
import csv
import io

@router.get("/export/csv")
async def export_submissions_csv(status: str = Query(None), material: str = Query(None)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    query = {}
    if status: query["final_status"] = status.upper()
    if material: query["material"] = material.lower()
    docs = await db.submissions.find(query).sort("created_at", -1).to_list(10000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Submission ID","Company","Company ID","Material","Quantity (t)",
                     "Reported CO2 (t)","Baseline CO2 (t)","Credits (CCT)",
                     "AI Verdict","Status","Period","Date"])
    for d in docs:
        writer.writerow([d["submission_id"], d["company_name"], d["company_id"],
                         d["material"], d["quantity_tonnes"], d["reported_co2_tonnes"],
                         d["baseline_co2_tonnes"], d["credits_earned"],
                         d["ai_verdict"], d["final_status"], d.get("period",""),
                         d["created_at"].strftime("%Y-%m-%d %H:%M")])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cct_submissions.csv"}
    )

FRONTEND:
1. Add `export const exportSubmissionsCSV = (params) => api.get('/submissions/export/csv', { params, responseType: 'blob' })` to `api.js`.
2. Add "Export CSV" button in `SubmissionsPage.jsx` header, next to "+ New Report":
   async function handleExport() {
     const blob = await exportSubmissionsCSV({ status: statusFilter, material: materialFilter })
     const url = URL.createObjectURL(blob)
     const a = document.createElement('a')
     a.href = url; a.download = 'cct_submissions.csv'; a.click()
   }
```

---

### P11 — Real-time Dashboard Refresh (Polling)

**Prompt:**
```
Add auto-refresh polling to DashboardPage in `frontend/src/pages/DashboardPage.jsx`:

1. After extracting loadData into a useCallback (see B7 fix):

2. Add a polling interval state: `const [autoRefresh, setAutoRefresh] = useState(false)`

3. Add a useEffect for polling:
   useEffect(() => {
     if (!autoRefresh) return
     const interval = setInterval(loadData, 30000) // refresh every 30s
     return () => clearInterval(interval)
   }, [autoRefresh, loadData])

4. Add a toggle in the header:
   <label className={styles.autoRefreshToggle}>
     <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
     Auto-refresh (30s)
   </label>

5. Show a subtle "Last updated: HH:MM:SS" timestamp below the stats grid.
   Add state: `const [lastUpdated, setLastUpdated] = useState(null)`
   Update it in loadData's .finally(): `setLastUpdated(new Date())`

6. Add styles for the toggle and timestamp in DashboardPage.module.css.
```

---

### P13 — Connect Marketplace to Real Data

**Prompt:**
```
Replace the mock data in MarketplacePage with real approved submission data:

BACKEND — add new endpoint in `backend/app/routes/submissions.py`:
@router.get("/marketplace/listings")
async def get_marketplace_listings():
    """Return approved submissions with credits > 0, formatted as marketplace listings."""
    db = get_db()
    if db is None: return []
    docs = await db.submissions.find(
        {"final_status": "APPROVED", "credits_earned": {"$gt": 0}},
        {"_id": 0, "submission_id": 1, "company_name": 1, "material": 1,
         "credits_earned": 1, "created_at": 1, "period": 1}
    ).sort("created_at", -1).limit(50).to_list(50)
    return [
        {
            "id": d["submission_id"][:8].upper(),
            "seller": d["company_name"],
            "material": d["material"],
            "credits": round(d["credits_earned"], 2),
            "price": 18.50,  # placeholder price (to be set by seller in future)
            "status": "live",
            "period": d.get("period", ""),
        }
        for d in docs
    ]

FRONTEND:
1. Add `export const getMarketplaceListings = () => api.get('/submissions/marketplace/listings')` to api.js.
2. In MarketplacePage.jsx, replace MOCK_LISTINGS with state:
   const [listings, setListings] = useState([])
   useEffect(() => { getMarketplaceListings().then(setListings).catch(console.error) }, [])
3. Keep the MOCK_LISTINGS as fallback if listings is empty and show a "No verified listings yet" message.
4. Recompute avgPrice and totalCCT from real listings data.
```

---

## 🟢 LOW PRIORITY / FUTURE IMPROVEMENTS

---

### P20 — Unit Tests for Services

**Prompt:**
```
Add a pytest test suite for the backend services:

1. Add to requirements.txt: `pytest==8.2.0`, `pytest-asyncio==0.23.6`, `httpx==0.27.0`

2. Create `backend/tests/__init__.py`

3. Create `backend/tests/test_credit_service.py`:
   from app.services.credit_service import calculate_credits

   def test_suspicious_verdict_returns_zero():
       result = calculate_credits(700, 900, "SUSPICIOUS")
       assert result["eligible"] == False
       assert result["credits_earned"] == 0.0

   def test_emissions_above_baseline_returns_zero():
       result = calculate_credits(1000, 900, "NORMAL")
       assert result["eligible"] == False
       assert result["credits_earned"] == 0.0

   def test_valid_submission_returns_credits():
       result = calculate_credits(700, 900, "NORMAL")
       assert result["eligible"] == True
       assert result["credits_earned"] == 200.0

4. Create `backend/tests/test_baseline.py`:
   from app.utils.baseline import get_baseline
   import pytest

   def test_cement_baseline():
       result = get_baseline("cement", 1000)
       assert result["baseline_co2_tonnes"] == 900.0
       assert result["emission_factor"] == 0.90

   def test_invalid_material_raises():
       with pytest.raises(ValueError):
           get_baseline("wood", 1000)

5. Create `backend/tests/test_ml_service.py`:
   from app.services.ml_service import MLService

   def test_predict_normal():
       svc = MLService()
       result = svc.predict("cement", 1000, 850, 900)
       assert result["verdict"] in ["NORMAL", "SUSPICIOUS"]
       assert 0.0 <= result["confidence"] <= 1.0

   def test_predict_suspicious():
       svc = MLService()
       # Drastically under-reported (10% of baseline)
       result = svc.predict("cement", 1000, 90, 900)
       assert result["verdict"] == "SUSPICIOUS"

6. Run with: `cd backend && pytest tests/ -v`
```

---

### P21 — Integration Tests for API

**Prompt:**
```
Add FastAPI integration tests using httpx AsyncClient:

Create `backend/tests/test_api.py`:

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "cement" in data["supported_materials"]

@pytest.mark.asyncio
async def test_baseline_factors():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/baseline-factors")
    assert response.status_code == 200
    data = response.json()
    assert "cement" in data
    assert data["cement"]["factor"] == 0.90

@pytest.mark.asyncio
async def test_submit_emission_valid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/submissions/", json={
            "company_name": "Test Corp",
            "company_id": "TEST-001",
            "material": "cement",
            "quantity_tonnes": 1000,
            "reported_co2_tonnes": 700,
            "period": "2024-Q2"
        })
    assert response.status_code == 201
    data = response.json()
    assert data["final_status"] in ["APPROVED", "REJECTED"]
    assert "submission_id" in data

@pytest.mark.asyncio
async def test_submit_invalid_material():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/submissions/", json={
            "company_name": "Test Corp",
            "company_id": "TEST-001",
            "material": "wood",
            "quantity_tonnes": 1000,
            "reported_co2_tonnes": 700,
            "period": "2024-Q2"
        })
    assert response.status_code == 422

Add to `backend/pytest.ini`:
[pytest]
asyncio_mode = auto
```

---

### P23 — GitHub Actions CI/CD

**Prompt:**
```
Create a GitHub Actions CI pipeline for the CCT project:

Create `.github/workflows/ci.yml`:

name: CCT CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7.0
        ports: ["27017:27017"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - name: Install dependencies
        run: cd backend && pip install -r requirements.txt pytest pytest-asyncio httpx
      - name: Run tests
        env:
          MONGODB_URL: mongodb://localhost:27017
          DATABASE_NAME: carbon_credit_tracer_test
        run: cd backend && pytest tests/ -v --tb=short

  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - name: Install & build
        run: cd frontend && npm install && npm run build
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: frontend/dist/

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - name: Install ruff
        run: pip install ruff
      - name: Lint backend
        run: ruff check backend/
```

---

### P24 — Production Docker Config

**Prompt:**
```
Create a production-ready Docker Compose configuration:

Create `docker-compose.prod.yml`:

version: "3.9"
services:
  mongodb:
    image: mongo:7.0
    container_name: cct_mongo_prod
    restart: always
    ports: ["27017:27017"]
    volumes:
      - mongo_data_prod:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASS}
      MONGO_INITDB_DATABASE: carbon_credit_tracer

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: cct_backend_prod
    restart: always
    ports: ["8000:8000"]
    environment:
      MONGODB_URL: mongodb://${MONGO_USER}:${MONGO_PASS}@mongodb:27017
      DATABASE_NAME: carbon_credit_tracer
      ALLOWED_ORIGINS: ${FRONTEND_URL}
      SECRET_KEY: ${JWT_SECRET_KEY}
    depends_on: [mongodb]
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: cct_frontend_prod
    restart: always
    ports: ["80:80"]
    depends_on: [backend]

volumes:
  mongo_data_prod:

Create `frontend/Dockerfile.prod`:
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

Create `frontend/nginx.conf`:
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api { proxy_pass http://backend:8000; }
}

Create `.env.prod.example`:
MONGO_USER=cctadmin
MONGO_PASS=your_secure_password_here
FRONTEND_URL=https://yourdomain.com
JWT_SECRET_KEY=generate_with_openssl_rand_hex_32

Run with: docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```
