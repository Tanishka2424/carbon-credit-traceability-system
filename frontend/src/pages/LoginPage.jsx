import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { loginCompany, googleAuth } from '../utils/api'
import { saveSession } from '../utils/auth'
import styles from './LoginPage.module.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GOOGLE_ENABLED = Boolean(
  GOOGLE_CLIENT_ID &&
  GOOGLE_CLIENT_ID !== 'your_google_client_id_here.apps.googleusercontent.com'
)

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from?.pathname || '/dashboard'

  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [gLoading, setGLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await loginCompany(form)
      saveSession(res)
      navigate(res.user.role === 'admin' ? '/admin' : from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setGLoading(true)
    try {
      const res = await googleAuth({ credential: credentialResponse.credential })
      saveSession(res)
      navigate(res.user.role === 'admin' ? '/admin' : from, { replace: true })
    } catch (err) {
      if (err.message === 'first_google_signup') {
        navigate('/register?google=1')
      } else {
        setError(err.message)
      }
    } finally {
      setGLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.leftPanel}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>CCT</span>
          <div>
            <div className={styles.brandName}>Carbon Credit Tracer</div>
            <div className={styles.brandSub}>AI + Blockchain Emission Verification</div>
          </div>
        </div>
        <div className={styles.tagline}>
          Verify emissions.<br />Earn credits.<br />
          <span className={styles.taglineGreen}>Trade on Polygon.</span>
        </div>
        <div className={styles.leftStats}>
          <div className={styles.lStat}><span className={styles.lNum}>8</span><span className={styles.lLabel}>IPCC Materials</span></div>
          <div className={styles.lStat}><span className={styles.lNum}>AI</span><span className={styles.lLabel}>Fraud Detection</span></div>
          <div className={styles.lStat}><span className={styles.lNum}>ERC-1155</span><span className={styles.lLabel}>Blockchain</span></div>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.card}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.sub}>Sign in to your company portal</p>

          {/* Google Sign-In — only when Client ID is configured */}
          {GOOGLE_ENABLED && (
            <div className={styles.googleWrap}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed. Please try again.')}
                useOneTap={false}
                width="100%"
                theme="filled_blue"
                text="signin_with"
                shape="rectangular"
              />
              {gLoading && <p className={styles.gLoadingText}>Signing in...</p>}
              <div className={styles.divider}><span>or sign in with email</span></div>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Company email</label>
              <input
                id="login-email"
                className={styles.input}
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="company@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                id="login-password"
                className={styles.input}
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              id="login-submit"
              type="submit"
              className={styles.submitBtn}
              disabled={loading || gLoading}
            >
              {loading ? <span className={styles.spinner} /> : 'Sign In →'}
            </button>
          </form>

          <div className={styles.adminNote}>
            🔐 <strong>Admin?</strong> Use the same email/password form above — you'll be redirected to the admin portal automatically.
          </div>

          <p className={styles.registerLink}>
            No account?{' '}
            <Link to="/register" className={styles.link}>Register your company</Link>
          </p>
          <p className={styles.backLink}>
            <Link to="/" className={styles.link}>← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
