import axios from 'axios'
import { getToken, logout } from './auth'

// In dev: Vite proxy forwards /api → localhost:8000 (no env var needed)
// In production (Render/Vercel): set VITE_API_URL=https://your-api.onrender.com
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,  // 60s — email/SMTP calls on Render free tier can be slow on cold start
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach JWT ───────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: unwrap data, handle 401 ─────────────────────────
// Auth endpoints (login/register) legitimately return 401/403 on bad creds —
// don't auto-logout for those, just pass the real error to the caller.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/verify-otp', '/auth/google', '/auth/resend-otp']

api.interceptors.response.use(
  (r) => r.data,
  (err) => {
    const url = err.config?.url || ''
    const isAuthEndpoint = AUTH_ENDPOINTS.some(ep => url.includes(ep))
    const status = err.response?.status

    // Only force-logout on 401 from protected (non-auth) endpoints
    if (status === 401 && !isAuthEndpoint) {
      logout()
      return Promise.reject(new Error('Session expired. Please login again.'))
    }

    // 503 or no response = backend cold start on Render free tier
    if (status === 503 || !err.response) {
      return Promise.reject(new Error('Server is starting up (this can take ~30 seconds on first use). Please wait a moment and try again.'))
    }

    const msg = err.response?.data?.detail || err.message || 'Request failed'
    return Promise.reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)))
  }
)

// ── Auth ───────────────────────────────────────────────────────────────────
export const registerCompany  = (data) => api.post('/auth/register', data)
export const verifyOTP        = (data) => api.post('/auth/verify-otp', data)
export const resendOTP        = (data) => api.post('/auth/resend-otp', data)
export const loginCompany     = (data) => api.post('/auth/login', data)
export const googleAuth       = (data) => api.post('/auth/google', data)
export const getMyProfile     = ()     => api.get('/auth/me')

// ── Submissions ────────────────────────────────────────────────────────────
export const submitEmission   = (data)   => api.post('/submissions/', data)
export const getSubmissions   = (params) => api.get('/submissions/', { params })
export const getSubmission    = (id)     => api.get(`/submissions/${id}`)

// ── Dashboard ──────────────────────────────────────────────────────────────
export const getDashboardStats      = ()      => api.get('/dashboard/stats')
export const getRecentSubmissions   = (limit) => api.get(`/dashboard/recent?limit=${limit || 8}`)
export const getCreditsByMaterial   = ()      => api.get('/dashboard/credits-by-material')

// ── Baseline & health ──────────────────────────────────────────────────────
export const getBaselineFactors = () => api.get('/baseline-factors')
export const getHealth          = () => api.get('/health')

// ── Admin ──────────────────────────────────────────────────────────────────
export const getAdminStats        = ()       => api.get('/admin/stats')
export const getAdminCompanies    = (params) => api.get('/admin/companies', { params })
export const getAdminCompany      = (id)     => api.get(`/admin/companies/${id}`)
export const getAdminSubmissions  = (params) => api.get('/admin/submissions', { params })
export const sendCorrectionEmail  = (id, data) => api.post(`/admin/notify-correction/${id}`, data)
export const deactivateCompany    = (id)     => api.delete(`/admin/companies/${id}`)

export default api
