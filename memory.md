# 🧠 PROJECT MEMORY — Carbon Credit Traceability System (CCT)
> Last updated: 2026-04-27 | Maintained by Antigravity AI | Version: v2.2.0

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Name** | Carbon Credit Tracer (CCT) |
| **Tagline** | AI + Blockchain-based carbon emission verification and credit issuance |
| **Version** | v2.2.0 — Full bug fix pass: registration crash, pagination, particles, admin UX, CO₂ signs |
| **Token** | CCT (Carbon Credit Token) — 1 CCT = 1 tonne CO₂ saved below IPCC baseline |
| **Chain** | Polygon (conceptual in MVP; ERC-1155 on Polygon planned for production) |
| **Repo Path** | `d:\projectaalphaa\Carbon_credits\carbon-credit-traceability-system` |

---

## 2. Architecture Overview

```
Public Landing Page (/)
        ↓
Login / Register (Email OTP or Google Sign-In)
        ↓
 ┌──────────────────────┬──────────────────────────┐
 │  Company Portal       │  Admin Portal             │
 │  /dashboard           │  /admin                   │
 │  /submit              │  /admin/companies         │
 │  /submissions         │  /admin/submissions       │
 │  /marketplace         │  (email correction)       │
 └──────────────────────┴──────────────────────────┘
        ↓
   FastAPI Backend (JWT-protected)
        ↓
   Baseline Lookup (IPCC table, 8 materials)
        ↓
   AI Anomaly Detection (Isolation Forest)
        ↓
   Credit Formula (baseline − reported)
        ↓
   MongoDB storage + Blockchain (Polygon, future)
```

### Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite 5, React Router v6, Recharts, Axios, CSS Modules |
| **Backend** | FastAPI (async), Python 3.11, Uvicorn |
| **Database** | MongoDB via Motor (async) |
| **Auth** | JWT (python-jose), bcrypt 4.2.1 (passlib), Email OTP, Google OAuth 2.0 |
| **Google OAuth** | `@react-oauth/google` (frontend) + `google-auth` (backend token verify) |
| **ML** | scikit-learn Isolation Forest, persisted as .pkl |
| **Email** | fastapi-mail (Gmail SMTP) |
| **Rate limiting** | slowapi |
| **Infrastructure** | Docker Compose (mongo + backend + frontend) |

---

## 3. MongoDB Collections

| Collection | Purpose | Key Indexes |
|---|---|---|
| `submissions` | All emission reports | `submission_id` (unique), `company_id`, `user_id`, `final_status`, `created_at` |
| `companies` | Registered company accounts (roles: company / admin) | `email` (unique), `company_id` (unique), `user_id` (unique) |
| `otp_store` | Temporary OTP codes | `expires_at` (TTL, auto-delete after 10 min) |

---

## 4. Environment Variables

| Variable | Purpose |
|---|---|
| `MONGODB_URL` | MongoDB connection string |
| `DATABASE_NAME` | DB name (default: `carbon_credit_tracer`) |
| `ALLOWED_ORIGINS` | CORS whitelist (comma-separated) |
| `SECRET_KEY` | JWT signing key (run `openssl rand -hex 32`) |
| `ALGORITHM` | JWT algorithm (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT TTL (default: 1440 = 24h) |
| `MAIL_USERNAME` | Gmail address for SMTP |
| `MAIL_PASSWORD` | Gmail App Password |
| `MAIL_FROM` | Sender email |
| `MAIL_FROM_NAME` | Sender display name |
| `MAIL_SERVER` | SMTP host (default: `smtp.gmail.com`) |
| `MAIL_PORT` | SMTP port (default: `587`) |

---

## 5. Backend Route Map

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Health check + supported materials |
| GET | `/api/baseline-factors` | Public | All IPCC emission factors |
| POST | `/api/auth/register` | Public | Register company + send OTP (returns `dev_otp` when email not configured) |
| POST | `/api/auth/verify-otp` | Public | Verify OTP + auto-login |
| POST | `/api/auth/resend-otp` | Public | Resend OTP (returns `dev_otp` on email failure) |
| POST | `/api/auth/login` | Public | Login → JWT |
| GET | `/api/auth/me` | JWT | Current user profile |
| POST | `/api/submissions/` | JWT (company) | Submit emission report |
| GET | `/api/submissions/` | JWT (company) | List own submissions (paginated `{items,total,page,per_page,total_pages}`) |
| GET | `/api/submissions/{id}` | JWT (company) | Single submission |
| GET | `/api/dashboard/stats` | JWT | Company-scoped stats |
| GET | `/api/dashboard/recent` | JWT | Recent submissions |
| GET | `/api/dashboard/credits-by-material` | JWT | Chart data |
| GET | `/api/admin/stats` | JWT (admin) | Platform-wide stats |
| GET | `/api/admin/companies` | JWT (admin) | All companies + stats |
| GET | `/api/admin/companies/{id}` | JWT (admin) | Single company + history |
| GET | `/api/admin/submissions` | JWT (admin) | All submissions (all companies) |
| POST | `/api/admin/notify-correction/{id}` | JWT (admin) | Email company correction |
| DELETE | `/api/admin/companies/{id}` | JWT (admin) | Deactivate company |

---

## 6. Frontend Route Map

| Path | Component | Access |
|---|---|---|
| `/` | LandingPage | Public |
| `/login` | LoginPage | Public (redirect if logged in) |
| `/register` | RegisterPage | Public (redirect if logged in) |
| `/dashboard` | DashboardPage | JWT (company) |
| `/submit` | SubmitPage | JWT (company) |
| `/submissions` | SubmissionsPage | JWT (company) |
| `/submissions/:id` | SubmissionDetailPage | JWT (company) |
| `/marketplace` | MarketplacePage | JWT (company) |
| `/admin` | AdminDashboardPage | JWT (admin only) |
| `/admin/companies` | AdminCompaniesPage | JWT (admin only) |
| `/admin/submissions` | AdminSubmissionsPage | JWT (admin only) |

---

## 7. Auth Flow

```
Register:
  Company fills form → POST /api/auth/register
  → OTP email sent via Gmail SMTP
  → Company enters 6-digit OTP (10 min TTL)
  → POST /api/auth/verify-otp → JWT returned → auto-login

Login:
  POST /api/auth/login (email + password)
  → JWT returned
  → role=="admin" → redirect /admin
  → role=="company" → redirect /dashboard

Admin:
  One-time seed: cd backend && python create_admin.py
  → prompts email + password → creates admin doc in companies collection
```

---

## 8. Supported Materials (IPCC Factors)

| Material | Factor (t CO₂/t) | Source |
|---|---|---|
| Cement | 0.90 | IPCC 2006 Vol 3 Ch 2 |
| Steel | 1.80 | World Steel Association 2023 |
| Aluminum | 11.50 | IPCC 2006 Vol 3 Ch 4 |
| Coal | 2.42 | IPCC 2006 Vol 2 Ch 2 |
| Natural Gas | 2.75 | IEA Emissions Factors 2023 |
| Paper | 1.00 | IPCC 2006 Vol 3 Ch 7 |
| Glass | 0.85 | European Glass Federation 2022 |
| Plastics | 1.90 | IPCC 2006 Vol 3 Ch 6 |

---

## 9. ML Service

| Detail | Value |
|---|---|
| Model | Isolation Forest (scikit-learn) |
| Features | material_encoded, quantity_tonnes, reported_co2, baseline_co2, ratio (reported/baseline) |
| Persistence | `backend/app/models/isolation_forest.pkl` |
| Startup | Loads pkl if exists, trains only if pkl missing (B6 fixed) |
| Verdict | NORMAL / SUSPICIOUS |
| Anomaly score threshold | contamination=0.1 |

---

## 10. Credit Formula

```
baseline_co2 = quantity_tonnes × emission_factor
credits_earned = max(0, baseline_co2 − reported_co2)

Conditions for APPROVED:
- credits_earned > 0
- AI verdict == "NORMAL"

1 CCT = 1 tonne CO₂ saved below IPCC baseline
```

---

## 11. Key File Locations

```
backend/
  main.py                        — FastAPI app entry point
  create_admin.py                — One-time admin seed script
  requirements.txt               — Python deps
  .env.example                   — All env var templates
  app/
    routes/
      auth.py                    — Register, OTP, login, me
      submissions.py             — Submit, list, detail
      admin.py                   — Admin CRUD + email
      dashboard.py               — Stats, recent, by-material
      health.py                  — Health + baseline-factors
    utils/
      auth.py                    — JWT, bcrypt, OTP logic
      email.py                   — Gmail SMTP (OTP + corrections)
      database.py                — MongoDB connect + indexes
      baseline.py                — IPCC factor table (8 materials)
    models/
      schemas.py                 — Submission Pydantic models
      user_schemas.py            — Company auth Pydantic models
    services/
      ml_service.py              — Isolation Forest
      credit_service.py          — Credit formula
    middleware/
      logging.py                 — Request logging middleware

frontend/
  src/
    App.jsx                      — Full routing tree
    utils/
      auth.js                    — Token helpers, isAdmin
      api.js                     — Axios client + all API calls
    components/
      Layout.jsx                 — Company sidebar layout
      AdminLayout.jsx            — Admin sidebar layout (indigo)
      ProtectedRoute.jsx         — Route guards
    pages/
      LandingPage.jsx            — Public landing page
      LoginPage.jsx              — Email/password login
      RegisterPage.jsx           — Registration + OTP step
      DashboardPage.jsx          — Company dashboard (own data)
      SubmitPage.jsx             — Submit report + result
      SubmissionsPage.jsx        — Paginated submissions list
      admin/
        AdminDashboardPage.jsx   — Platform-wide stats
        AdminCompaniesPage.jsx   — Companies table + deactivate
        AdminSubmissionsPage.jsx — All submissions + email modal
```
