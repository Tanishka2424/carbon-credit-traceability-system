# Carbon Credit Tracer (CCT)

> **AI-powered carbon emission verification and credit issuance platform.**  
> Industrial companies submit CO₂ reports → IPCC baseline check → AI fraud detection → Carbon credits awarded.

🌐 **Live Demo:** https://carbon-credit-frontend.onrender.com  
🔧 **API Docs:** https://carbon-credit-api-7845.onrender.com/docs

---

## 📸 Features

- ✅ Company registration with OTP email verification
- ✅ Google OAuth sign-in
- ✅ IPCC-sourced emission baseline for 8 industrial materials
- ✅ AI anomaly detection (Isolation Forest) to catch fraudulent reports
- ✅ Carbon credit (CCT) token issuance for genuine emission reductions
- ✅ Company dashboard — stats, charts, submission history
- ✅ Admin portal — monitor all companies, send correction emails
- ✅ CCT Marketplace UI (smart contract integration: future roadmap)

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + CSS Modules |
| Routing | React Router v6 |
| HTTP Client | Axios (JWT interceptors) |
| Google Auth | @react-oauth/google |
| Backend | FastAPI (Python 3.14) |
| Database | MongoDB Atlas + Motor (async) |
| AI Model | scikit-learn — IsolationForest |
| Auth | JWT (python-jose) + bcrypt |
| Email | fastapi-mail + Gmail SMTP |
| Deployment | Render (backend + frontend static site) |

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB running locally OR MongoDB Atlas connection string

### 1. Clone
```bash
git clone https://github.com/PanthDhoriyani/Carbon_credit.git
cd Carbon_credit
```

### 2. Backend
```bash
cd backend

# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env       # fill in your values
python main.py
```
Backend runs at: **http://localhost:8000**  
Swagger docs: **http://localhost:8000/docs**

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: **http://localhost:5173**

---

## ⚙️ Environment Variables

### `backend/.env`
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=carbon_credit_tracer
ALLOWED_ORIGINS=http://localhost:5173

SECRET_KEY=your-random-64-char-hex
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_FROM=your@gmail.com
MAIL_FROM_NAME=Carbon Credit Tracer
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Auto-creates admin on startup if set:
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=StrongPass1
```

### `frontend/.env.local`
```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
# For production only (leave blank in dev — Vite proxy handles it):
VITE_API_URL=https://your-api.onrender.com
```

---

## 📁 Project Structure

```
carbon-credit-traceability-system/
│
├── backend/
│   ├── main.py                        # App entry point, CORS, startup
│   ├── requirements.txt
│   ├── .env                           # Local secrets (not committed)
│   ├── .env.example
│   ├── create_admin.py                # Interactive admin creation script
│   ├── seed_admin_atlas.py            # Non-interactive admin seeder
│   └── app/
│       ├── routes/
│       │   ├── auth.py                # Register, Login, OTP, Google OAuth
│       │   ├── submissions.py         # Emission report CRUD
│       │   ├── dashboard.py           # Stats, charts, recent feed
│       │   ├── admin.py               # Admin: companies, reports, emails
│       │   └── health.py              # /api/health, /api/baseline-factors
│       ├── models/
│       │   ├── schemas.py             # Submission request/response models
│       │   ├── user_schemas.py        # Auth models (register, login, OTP)
│       │   ├── isolation_forest.pkl   # Trained AI model (binary)
│       │   └── scaler.pkl             # Feature scaler (binary)
│       ├── services/
│       │   ├── ml_service.py          # IsolationForest train/load/predict
│       │   └── credit_service.py      # Credit issuance calculation
│       ├── utils/
│       │   ├── auth.py                # JWT, bcrypt, OTP helpers
│       │   ├── database.py            # MongoDB connect + index creation
│       │   ├── email.py               # OTP + correction emails via Gmail
│       │   └── baseline.py            # IPCC emission factors table
│       └── middleware/
│           └── logging.py             # Request/response logging
│
└── frontend/
    ├── public/
    │   └── _redirects                 # Render: all paths → index.html
    ├── vite.config.js                 # Dev proxy /api → localhost:8000
    └── src/
        ├── App.jsx                    # Route definitions
        ├── utils/
        │   ├── api.js                 # All API calls (Axios)
        │   └── auth.js                # Token helpers, logout
        ├── components/
        │   ├── ProtectedRoute.jsx     # Auth + admin route guards
        │   ├── Layout.jsx             # Company portal shell
        │   ├── AdminLayout.jsx        # Admin portal shell
        │   ├── StatusBadge.jsx        # APPROVED/REJECTED badges
        │   └── StatCard.jsx           # Dashboard stat cards
        └── pages/
            ├── LandingPage.jsx        # Public homepage
            ├── LoginPage.jsx          # Email + Google login
            ├── RegisterPage.jsx       # Register + OTP step
            ├── DashboardPage.jsx      # Company stats + charts
            ├── SubmitPage.jsx         # Emission report form
            ├── SubmissionsPage.jsx    # Report history list
            ├── SubmissionDetailPage.jsx # Single report detail
            ├── MarketplacePage.jsx    # CCT token marketplace
            └── admin/
                ├── AdminDashboardPage.jsx    # Platform-wide stats
                ├── AdminCompaniesPage.jsx    # All companies
                └── AdminSubmissionsPage.jsx  # All reports + correction email
```

---

## 🔄 System Flow

```
User Registration:
  Fill form → POST /api/auth/register
  → OTP sent to email (6-digit, 10 min expiry)
  → POST /api/auth/verify-otp
  → Account activated + JWT issued → Dashboard

Emission Report Submission:
  Company submits (material, quantity, reported CO₂, period)
  → Step 1: IPCC baseline = quantity × emission_factor
  → Step 2: IsolationForest AI → NORMAL or SUSPICIOUS
  → Step 3: Credits = baseline − reported  (if NORMAL + reported < baseline)
  → APPROVED (credits earned) or REJECTED (0 credits)
  → Saved to MongoDB

Admin Workflow:
  Monitor all companies + submissions
  Filter by status, material, company
  Send "Correction Required" email to company via Gmail SMTP
```

---

## 🤖 AI Model — Isolation Forest

- **Algorithm:** Isolation Forest (scikit-learn, 200 trees, 10% contamination)
- **Training data:** Synthetic — 8 materials × 300 normal + 40 fraud samples
  - Normal: reported within ±15% of IPCC baseline (Gaussian noise)
  - Fraud: reported at only 10–40% of baseline (drastic under-reporting)
- **Features:**
  1. `reported_intensity` = reported_CO₂ / quantity
  2. `baseline_intensity` = IPCC factor
  3. `ratio` = reported / baseline ← key feature
  4. `material_encoded` = numeric material ID
- **Output:** `NORMAL` / `SUSPICIOUS` verdict + anomaly score + confidence

---

## 🌍 IPCC Emission Factors (8 Materials)

| Material | Factor (t CO₂/t) | Source |
|----------|-----------------|--------|
| Cement | 0.90 | IPCC 2006 Vol 3 Ch 2 |
| Steel | 1.80 | World Steel Association 2023 |
| Aluminum | 11.50 | IPCC 2006 Vol 3 Ch 4 |
| Coal | 2.42 | IPCC 2006 Vol 2 Ch 2 |
| Natural Gas | 2.75 | IEA 2023 |
| Paper | 1.00 | IPCC 2006 Vol 3 Ch 7 |
| Glass | 0.85 | European Glass Federation 2022 |
| Plastics | 1.90 | IPCC 2006 Vol 3 Ch 6 |

---

## 🔐 Security

| Feature | Implementation |
|---------|---------------|
| Passwords | bcrypt (direct, work factor 12) |
| Auth tokens | JWT HS256, 24-hour expiry |
| OTP | 6-digit random, MongoDB TTL index (10 min auto-delete) |
| Route guards | ProtectedRoute (login) + AdminRoute (role=admin) |
| CORS | Locked to configured ALLOWED_ORIGINS |
| Google OAuth | ID token verified server-side via google-auth |

---

## 🌐 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | None | Server + DB status |
| GET | `/api/baseline-factors` | None | IPCC factors for all materials |
| POST | `/api/auth/register` | None | Register company |
| POST | `/api/auth/verify-otp` | None | Verify email OTP |
| POST | `/api/auth/resend-otp` | None | Resend OTP |
| POST | `/api/auth/login` | None | Login → JWT token |
| POST | `/api/auth/google` | None | Google OAuth login |
| GET | `/api/auth/me` | JWT | Get own profile |
| POST | `/api/submissions/` | JWT | Submit emission report |
| GET | `/api/submissions/` | JWT | List own reports |
| GET | `/api/submissions/{id}` | JWT | Get single report |
| GET | `/api/dashboard/stats` | JWT | Company dashboard stats |
| GET | `/api/dashboard/recent` | JWT | Recent submissions |
| GET | `/api/dashboard/credits-by-material` | JWT | Credits chart data |
| GET | `/api/admin/stats` | Admin | Platform-wide stats |
| GET | `/api/admin/companies` | Admin | All companies |
| GET | `/api/admin/submissions` | Admin | All reports |
| POST | `/api/admin/notify-correction/{id}` | Admin | Send correction email |
| DELETE | `/api/admin/companies/{id}` | Admin | Deactivate company |

Full interactive docs: **https://carbon-credit-api-7845.onrender.com/docs**

---

## 🚀 Deployment (Render)

Both services deploy automatically on every `git push` to `main`.

| Service | Type | URL |
|---------|------|-----|
| Backend | Render Web Service | https://carbon-credit-api-7845.onrender.com |
| Frontend | Render Static Site | https://carbon-credit-frontend.onrender.com |
| Database | MongoDB Atlas M0 | cloud.mongodb.com |

**Backend env vars on Render:** Set all variables from `backend/.env` in the Render dashboard.  
**Frontend env vars on Render:** Set `VITE_API_URL=https://carbon-credit-api-7845.onrender.com`

> ⚠️ Render free tier sleeps after 15 min of inactivity. First request may take ~30 seconds to wake up.

---

## 📊 Token Economy

- **1 CCT** = 1 tonne CO₂ saved below IPCC baseline
- Tokens minted only after AI verification passes (NORMAL verdict)
- Marketplace: under-emitters (sellers) ↔ over-emitters (buyers)
- Planned: ERC-1155 on Polygon (Hardhat + OpenZeppelin)

---

## 🗺️ Roadmap

- [ ] Polygon smart contract deployment (ERC-1155)
- [ ] IPFS metadata pinning for each submission
- [ ] Real marketplace with on-chain settlement
- [ ] CSV export for admin and company reports
- [ ] Password reset flow (forgot password)
- [ ] Company profile editing
- [ ] IoT sensor data ingestion
- [ ] Rate limiting on submission endpoint (slowapi)
- [ ] Unit + integration tests (pytest + httpx)
- [ ] GitHub Actions CI/CD pipeline

---

## 👤 Admin Account

Create admin using the seeding script:

```bash
cd backend
# Interactive:
python create_admin.py

# Non-interactive (edit email/password inside first):
python seed_admin_atlas.py
```

Or set `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars on Render — admin account is auto-created on startup.

---

## 📄 License

MIT License — see [LICENSE](LICENSE)
