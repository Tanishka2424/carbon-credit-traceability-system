/**
 * Auth utilities — token storage, user helpers, route guards.
 */

const TOKEN_KEY = 'cct_token'
const USER_KEY  = 'cct_user'

// ── Token storage ──────────────────────────────────────────────────────────
export const getToken  = () => localStorage.getItem(TOKEN_KEY)
export const setToken  = (t) => localStorage.setItem(TOKEN_KEY, t)
export const removeToken = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY) }

// ── User storage ───────────────────────────────────────────────────────────
export const getUser   = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
}
export const setUser   = (u) => localStorage.setItem(USER_KEY, JSON.stringify(u))

// ── Auth checks ────────────────────────────────────────────────────────────
export const isLoggedIn = () => !!getToken()
export const isAdmin    = () => getUser()?.role === 'admin'

// ── Login / logout helpers ─────────────────────────────────────────────────
export const saveSession = ({ access_token, user }) => {
  setToken(access_token)
  setUser(user)
}

export const logout = () => {
  removeToken()
  window.location.href = '/login'
}
