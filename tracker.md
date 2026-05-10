# 📋 PROJECT TRACKER — Carbon Credit Tracer (CCT)
> Last updated: 2026-04-27 | v2.2.0 — Full frontend + backend bug fix session

---

## Session Log

| Date | Session | Summary |
|---|---|---|
| 2026-04-27 | Session 1 | Initial audit, created memory.md + tracker.md + improvement_prompts.md |
| 2026-04-27 | Session 2 | Full v2.0.0 implementation: auth, landing page, admin portal, 8 materials, all bug fixes |
| 2026-04-27 | Session 3 | v2.1.0: Google OAuth sign-in, Gmail App Password fix, bcrypt v4 pin, dev OTP fallback |
| 2026-04-27 | Session 4 | v2.2.0: 8 bugs fixed — registration crash, pagination, ML encoding, particle re-render, admin button loop, CO₂ sign, marketplace NaN |

---

## ✅ Completed Features (v2.0.0)

### 🔐 Authentication System
- [x] JWT-based authentication (python-jose + bcrypt 4.2.1)
- [x] Company registration with email OTP verification (Gmail SMTP + App Password)
- [x] **Google Sign-In** on Login + Register pages (`@react-oauth/google`)
- [x] Google OAuth backend verification (`google-auth` library)
- [x] Auto-register new Google users (no OTP needed — Google verified email)
- [x] Auto-login existing Google users
- [x] Google users complete company details on first sign-up (company-details step)
- [x] Dev OTP fallback — OTP auto-filled in UI when email not configured
- [x] OTP resend with 60s countdown timer
- [x] Login endpoint returning JWT token
- [x] Auto-login after OTP verification
- [x] Role-based access (company / admin)
- [x] Admin account seed script (`create_admin.py`)
- [x] `/api/auth/me` profile endpoint
- [x] Frontend auth.js token helpers (getToken, setToken, isLoggedIn, isAdmin)
- [x] Axios JWT interceptor (auto-attach Authorization header)
- [x] 401 auto-logout and redirect to /login
- [x] ProtectedRoute, AdminRoute, PublicRoute components

### 🌿 Landing Page
- [x] Public landing page at `/`
- [x] Animated particle hero with gradient background
- [x] How-it-works 4-step section
- [x] 6-feature grid
- [x] 8-material table with IPCC factors and color coding
- [x] CTA buttons → login / register
- [x] Responsive footer with network badges

### 🏢 Company Portal
- [x] Company dashboard showing only own submissions (B3 data isolation)
- [x] Welcome message with company name from JWT
- [x] Auto-refresh toggle (30s polling)
- [x] Last updated timestamp
- [x] Manual refresh button (fixes B7)
- [x] Submit report with dynamic emission factors from API (fixes B5)
- [x] Inline result view after submission
- [x] Paginated submissions list (fixes P9)
- [x] ai_verdict displayed from API (fixes B1)
- [x] All 8 materials in filter dropdowns

### 🔐 Admin Portal
- [x] Separate admin sidebar layout (indigo theme)
- [x] Platform-wide stats dashboard (total companies, submissions, credits, approval rate)
- [x] Companies table with search, expandable detail panel
- [x] Company deactivation with confirmation modal
- [x] All submissions table with status + material filters
- [x] Pagination (20 per page)
- [x] Correction email modal (custom or default AI-generated message)
- [x] Email sent status tracking (`correction_email_sent` flag in DB)

### 🐛 Bug Fixes
- [x] **B1** — `ai_verdict` added to `SubmissionListItem` schema and all routes
- [x] **B3** — Period format validated with `YYYY-Q[1-4]` regex
- [x] **B4** — MongoDB indexes created on startup (unique + compound)
- [x] **B5** — Frontend no longer uses hardcoded emission factors (fetches from API)
- [x] **B6** — Removed redundant `ml_service.train()` from app startup lifespan
- [x] **B7** — Dashboard refresh button + auto-refresh toggle added

### 📧 Email Fixes (v2.1.0)
- [x] Fixed SSL cert error (`VALIDATE_CERTS=False` in ConnectionConfig)
- [x] Fixed Gmail auth — uses App Password, not regular password
- [x] Admin correction email now has console fallback log
- [x] OTP email has console fallback (shown in `[DEV OTP]` block)
- [x] bcrypt pinned to 4.2.1 (fixes passlib Python 3.14 incompatibility)

### 🔧 Backend Improvements
- [x] **P2** — Expanded materials from 3 → 8 (cement, steel, aluminum, coal, natural_gas, paper, glass, plastics)
- [x] **P7** — slowapi added to requirements (rate limiting ready)
- [x] **P8** — LoggingMiddleware (method, path, status, duration_ms, IP)
- [x] **P9** — Pagination (skip/limit) on submissions GET endpoint
- [x] **P11** — Auto-refresh on dashboard (30s interval toggle)

---

## ✅ Bugs Fixed (v2.2.0 — Session 4)

| ID | Description | Fix |
|---|---|---|
| **B8** | `_send_otp_bg` undefined in `auth.py` → NameError on every registration | Defined helper + changed to sync send with dev_otp fallback |
| **B9** | `register` endpoint never returned `dev_otp` → OTP screen stuck in dev mode | Register now returns `dev_otp` when email fails (sync send) |
| **B10** | `GET /submissions/` returned plain array → SubmissionsPage pagination broken | Changed to return `{items, total, page, per_page, total_pages}` |
| **B11** | `LandingPage` particles used `Math.random()` in JSX → positions re-shuffled on every render | Stabilized with `useMemo` |
| **B12** | Admin Portal Login button on LoginPage navigated to `/login` (itself) — self-loop | Replaced with informational note box |
| **B13** | CO₂ Saved column in SubmissionsPage showed `−` for savings (inverted sign) | Fixed: savings shown as `+`, excess shown as negative |
| **B15** | `MATERIAL_ENCODING` in `ml_service.py` only had 3 materials → `KeyError: 'coal'` on backend startup when pkl was missing | Auto-build encoding dict from `EMISSION_FACTORS` so it's always in sync with all 8 materials |
| **B2** | Marketplace `avgPrice` NaN crash when no live listings | Added `live.length > 0` guard |

## ⚠️ Known Bugs (Unresolved)

| ID | Description | Priority |
|---|---|---|
| **B14** | Admin dashboard submission rows navigate to company portal route (no admin-specific detail page) | Low — SubmissionDetailPage works for admins too via role check |

---

## 🔜 Planned Improvements (Next Sessions)

### High Priority
| ID | Feature | Notes |
|---|---|---|
| **P10** | CSV export on admin + company submissions | StreamingResponse backend + download trigger |
| **P13** | Connect marketplace to real DB | Replace mock data with real listings |
| **P7-impl** | Actually apply slowapi rate limits on POST /submit | 10/min per IP |

### Medium Priority
| ID | Feature | Notes |
|---|---|---|
| **P12** | Blockchain integration | ERC-1155 on Polygon — needs Web3.py + wallet |
| **P14** | Company profile editing | Allow updating phone, industry from dashboard |
| **P15** | Password reset flow | Forgot password via email |
| **P16** | Submission PDF export | Single submission as PDF report |

### Low Priority / Future
| ID | Feature | Notes |
|---|---|---|
| **P20** | Unit tests | pytest for credit_service, baseline, ml_service |
| **P21** | Integration tests | httpx + AsyncClient for all routes |
| **P23** | GitHub Actions CI | test + build + lint pipeline |
| **P24** | Production Docker | Nginx, multi-worker Uvicorn, env secrets |

---

## 📁 File Change Summary (v2.0.0 Session)

### New Backend Files
- `backend/app/utils/auth.py` — JWT, bcrypt, OTP
- `backend/app/utils/email.py` — Gmail SMTP
- `backend/app/models/user_schemas.py` — Company auth models
- `backend/app/routes/auth.py` — Auth endpoints
- `backend/app/routes/admin.py` — Admin endpoints
- `backend/app/middleware/logging.py` — Request logger
- `backend/create_admin.py` — Admin seed script

### Modified Backend Files
- `backend/requirements.txt` — +python-jose, passlib, fastapi-mail, slowapi
- `backend/.env.example` — +JWT + SMTP vars
- `backend/main.py` — Added routers, middleware, fixed B6
- `backend/app/utils/database.py` — +indexes for submissions+companies+otp_store
- `backend/app/utils/baseline.py` — 3→8 materials
- `backend/app/models/schemas.py` — +user_id, +ai_verdict (B1), +period validator (B3)
- `backend/app/routes/submissions.py` — Auth required, company scoped, pagination
- `backend/docker-compose.yml` — +JWT + SMTP env vars

### New Frontend Files
- `frontend/src/utils/auth.js` — Token helpers
- `frontend/src/utils/api.js` — Updated with interceptors + all endpoints
- `frontend/src/components/ProtectedRoute.jsx` — Route guards
- `frontend/src/components/AdminLayout.jsx` + `.css`
- `frontend/src/pages/LandingPage.jsx` + `.css`
- `frontend/src/pages/LoginPage.jsx` + `.css`
- `frontend/src/pages/RegisterPage.jsx` + `.css`
- `frontend/src/pages/admin/AdminDashboardPage.jsx` + `.css`
- `frontend/src/pages/admin/AdminCompaniesPage.jsx` + `.css`
- `frontend/src/pages/admin/AdminSubmissionsPage.jsx` + `.css`

### Modified Frontend Files
- `frontend/src/App.jsx` — Full new routing tree
- `frontend/src/components/Layout.jsx` — +company info, logout
- `frontend/src/components/Layout.module.css` — +companyInfo, logoutBtn styles
- `frontend/src/pages/DashboardPage.jsx` — Welcome, refresh, auto-refresh, company scoped
- `frontend/src/pages/DashboardPage.module.css` — New style additions
- `frontend/src/pages/SubmitPage.jsx` — Dynamic factors (B5), auth user
- `frontend/src/pages/SubmissionsPage.jsx` — Pagination, ai_verdict (B1), 8 materials
- `frontend/src/pages/SubmissionsPage.module.css` — Pagination styles

## v2.1.0 File Changes

### Backend
- `backend/.env` — Gmail App Password + GOOGLE_CLIENT_ID added
- `backend/requirements.txt` — +google-auth, bcrypt pinned to 4.2.1
- `backend/app/routes/auth.py` — +POST /auth/google (Google OAuth endpoint)
- `backend/app/models/user_schemas.py` — +GoogleAuthRequest schema
- `backend/app/utils/email.py` — SSL fix, console OTP fallback, correction email fallback
- `backend/create_admin.py` — Removed emoji (Windows cp1252 fix)

### Frontend
- `frontend/src/main.jsx` — +GoogleOAuthProvider wrapper
- `frontend/.env.local` — VITE_GOOGLE_CLIENT_ID placeholder
- `frontend/src/utils/api.js` — +googleAuth() API call
- `frontend/src/pages/LoginPage.jsx` — +Google Sign-In button
- `frontend/src/pages/LoginPage.module.css` — +googleBtn styles
- `frontend/src/pages/RegisterPage.jsx` — +Google Sign-Up button + google-details step
- `frontend/src/pages/RegisterPage.module.css` — +googleBtn, devBanner styles

## v2.2.0 File Changes (Session 4 — Bug Fixes)

### Backend
- `backend/app/routes/auth.py` — Defined `_send_otp_bg`, register now sends OTP synchronously + returns `dev_otp` on email failure (B8, B9)
- `backend/app/routes/submissions.py` — `GET /submissions/` now returns paginated `{items, total, ...}` object instead of raw array (B10)
- `backend/app/services/ml_service.py` — `MATERIAL_ENCODING` auto-built from `EMISSION_FACTORS` to cover all 8 materials (B15)

### Frontend
- `frontend/src/pages/LandingPage.jsx` — Particles stabilized with `useMemo`, removed unused imports (B11)
- `frontend/src/pages/LoginPage.jsx` — Removed self-looping admin portal button, replaced with info note (B12)
- `frontend/src/pages/LoginPage.module.css` — Updated `.adminNote` to styled info box
- `frontend/src/pages/SubmissionsPage.jsx` — Fixed CO₂ Saved column sign direction (B13)
