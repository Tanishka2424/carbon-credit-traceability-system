import React, { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { registerCompany, verifyOTP, resendOTP, googleAuth } from '../utils/api'
import { saveSession } from '../utils/auth'
import styles from './RegisterPage.module.css'

const INDUSTRIES = [
  'Cement & Concrete', 'Steel & Iron', 'Aluminum & Metals', 'Coal Mining',
  'Oil & Natural Gas', 'Paper & Pulp', 'Glass Manufacturing', 'Plastics & Chemicals',
  'Automotive', 'Textile', 'Other',
]

const INITIAL = {
  company_name: '', company_id: '', email: '',
  password: '', confirm_password: '', industry: '', contact_phone: '',
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GOOGLE_ENABLED = Boolean(
  GOOGLE_CLIENT_ID &&
  GOOGLE_CLIENT_ID !== 'your_google_client_id_here.apps.googleusercontent.com'
)

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep]         = useState('form')   // 'form' | 'otp' | 'google-details'
  const [form, setForm]         = useState(INITIAL)
  const [otp, setOtp]           = useState(['', '', '', '', '', ''])
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [devOtp, setDevOtp]       = useState('')
  const [googleCred, setGoogleCred] = useState(null)
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Manual register ────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const { confirm_password, ...payload } = form
      const res = await registerCompany(payload)
      if (res.dev_otp) {
        setDevOtp(res.dev_otp)
        setOtp(res.dev_otp.split(''))
      }
      setStep('otp')
      startCountdown()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── OTP helpers ────────────────────────────────────────────────────────────
  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 5) otpRefs[i + 1].current?.focus()
  }

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus()
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) { setError('Enter all 6 digits'); return }
    setError('')
    setLoading(true)
    try {
      const res = await verifyOTP({ email: form.email, otp_code: code })
      saveSession(res)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
      setOtp(['', '', '', '', '', ''])
      otpRefs[0].current?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setError('')
    try {
      const res = await resendOTP({ email: form.email })
      if (res.dev_otp) {
        setDevOtp(res.dev_otp)
        setOtp(res.dev_otp.split(''))
      }
      setSuccess('New OTP sent!')
      setTimeout(() => setSuccess(''), 3000)
      startCountdown()
    } catch (err) {
      setError(err.message)
    }
  }

  const startCountdown = () => {
    setCountdown(60)
    const interval = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(interval); return 0 } return c - 1 })
    }, 1000)
  }

  // ── Google auth ────────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setGLoading(true)
    try {
      const res = await googleAuth({ credential: credentialResponse.credential })
      saveSession(res)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err.message === 'first_google_signup') {
        setGoogleCred(credentialResponse.credential)
        setStep('google-details')
      } else {
        setError(err.message)
      }
    } finally {
      setGLoading(false)
    }
  }

  const handleGoogleCompanySubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await googleAuth({
        credential:   googleCred,
        company_name: form.company_name,
        company_id:   form.company_id,
        industry:     form.industry,
      })
      saveSession(res)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── OTP step ───────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.otpIcon}>📬</div>
          <h1 className={styles.title}>Verify your email</h1>
          <p className={styles.sub}>
            We sent a 6-digit code to <strong className={styles.emailHighlight}>{form.email}</strong>
          </p>
          {devOtp && (
            <div className={styles.devBanner}>
              <strong>Dev Mode:</strong> Email not configured — OTP auto-filled below: <code>{devOtp}</code>
            </div>
          )}
          <div className={styles.otpRow}>
            {otp.map((v, i) => (
              <input
                key={i}
                ref={otpRefs[i]}
                className={styles.otpInput}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={v}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKey(i, e)}
                autoFocus={i === 0}
              />
            ))}
          </div>
          {error   && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.successMsg}>{success}</div>}
          <button className={styles.submitBtn} onClick={handleVerify} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Verify & Login →'}
          </button>
          <button
            className={styles.resendBtn}
            onClick={handleResend}
            disabled={countdown > 0}
          >
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
          </button>
          <p className={styles.backLink}>
            <button className={styles.textBtn} onClick={() => setStep('form')}>← Back to registration</button>
          </p>
        </div>
      </div>
    )
  }

  // ── Google new user: company details step ─────────────────────────────────
  if (step === 'google-details') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.otpIcon}>🏢</div>
          <h1 className={styles.title}>Almost there!</h1>
          <p className={styles.sub}>Complete your company profile to finish Google sign-up</p>
          <form onSubmit={handleGoogleCompanySubmit} className={styles.form}>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Company name *</label>
                <input className={styles.input} value={form.company_name} onChange={set('company_name')} placeholder="Acme Industries Ltd." required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Company ID *</label>
                <input className={styles.input} value={form.company_id} onChange={set('company_id')} placeholder="ACME-001" required />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Industry *</label>
              <select className={styles.select} value={form.industry} onChange={set('industry')} required>
                <option value="">Select your industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'Complete Registration →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Main register form ─────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.homeLink}>← Back to home</Link>
        <div className={styles.brand}>
          <span className={styles.brandMark}>CCT</span>
          <div>
            <div className={styles.brandName}>Carbon Credit Tracer</div>
            <div className={styles.brandSub}>Company Registration</div>
          </div>
        </div>

        <h1 className={styles.title}>Register your company</h1>
        <p className={styles.sub}>Join the AI-powered carbon credit verification platform</p>

        {/* Google Sign-Up — only when Client ID is configured */}
        {GOOGLE_ENABLED && (
          <div className={styles.googleWrap}>
            {gLoading
              ? <div className={styles.gLoadingText}>Signing in with Google...</div>
              : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-up failed. Please try again.')}
                  useOneTap={false}
                  width="100%"
                  theme="filled_blue"
                  text="signup_with"
                  shape="rectangular"
                />
              )
            }
            <div className={styles.divider}><span>or register with email</span></div>
          </div>
        )}

        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Company name *</label>
              <input className={styles.input} value={form.company_name} onChange={set('company_name')} placeholder="Acme Industries Ltd." required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Company ID *</label>
              <input className={styles.input} value={form.company_id} onChange={set('company_id')} placeholder="ACME-001" required />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Business email *</label>
            <input className={styles.input} type="email" value={form.email} onChange={set('email')} placeholder="contact@acme.com" required autoComplete="email" />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Industry *</label>
            <select className={styles.select} value={form.industry} onChange={set('industry')} required>
              <option value="">Select your industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Contact phone</label>
            <input className={styles.input} type="tel" value={form.contact_phone} onChange={set('contact_phone')} placeholder="+91 98765 43210" />
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Password *</label>
              <input className={styles.input} type="password" value={form.password} onChange={set('password')} placeholder="Min 8 chars + 1 digit" required autoComplete="new-password" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Confirm password *</label>
              <input className={styles.input} type="password" value={form.confirm_password} onChange={set('confirm_password')} placeholder="Repeat password" required />
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button id="register-submit" type="submit" className={styles.submitBtn} disabled={loading || gLoading}>
            {loading ? <span className={styles.spinner} /> : 'Create Account & Send OTP →'}
          </button>
        </form>

        <p className={styles.loginLink}>
          Already registered? <Link to="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
