import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

const FEATURES = [
  { icon: '🤖', title: 'AI Verification', desc: 'Isolation Forest anomaly detection flags fraudulent emission reports in real-time.' },
  { icon: '📊', title: 'IPCC Baseline', desc: 'Every report is benchmarked against official IPCC 2006 emission factors for 8 materials.' },
  { icon: '⛓️', title: 'Blockchain Records', desc: 'Every approved credit is queued for ERC-1155 token minting on Polygon mainnet.' },
  { icon: '🔍', title: 'Full Audit Trail', desc: 'Immutable step-by-step verification log: baseline → AI → credits → blockchain.' },
  { icon: '💹', title: 'CCT Marketplace', desc: 'Trade Carbon Credit Tokens between under-emitters and over-emitters.' },
  { icon: '🛡️', title: 'Admin Control', desc: 'Admin portal to review all reports and email correction suggestions to companies.' },
]

const STEPS = [
  { num: '01', title: 'Submit Report', desc: 'Companies submit material production data and self-reported CO₂ emissions.' },
  { num: '02', title: 'Baseline Check', desc: 'System calculates expected CO₂ using IPCC emission factors for your material.' },
  { num: '03', title: 'AI Verification', desc: 'Isolation Forest ML model detects anomalies and flags suspicious under-reporting.' },
  { num: '04', title: 'Credits Issued', desc: 'Verified companies earn CCT tokens: 1 token = 1 tonne CO₂ saved below baseline.' },
]

const MATERIALS = [
  { name: 'Cement',      factor: '0.90', color: '#f0a500' },
  { name: 'Steel',       factor: '1.80', color: '#4a9fd4' },
  { name: 'Aluminum',    factor: '11.50', color: '#4ac864' },
  { name: 'Coal',        factor: '2.42', color: '#94a3b8' },
  { name: 'Natural Gas', factor: '2.75', color: '#a78bfa' },
  { name: 'Paper',       factor: '1.00', color: '#34d399' },
  { name: 'Glass',       factor: '0.85', color: '#60a5fa' },
  { name: 'Plastics',    factor: '1.90', color: '#f472b6' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  // Generate particle positions ONCE (not on every render)
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${(i * 13.7 + 7) % 100}%`,
      animationDelay: `${(i * 0.41) % 8}s`,
      animationDuration: `${6 + (i * 0.37) % 6}s`,
    })),
  [])

  return (
    <div className={styles.page}>
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <span className={styles.navLogoMark}>CCT</span>
          <span className={styles.navLogoText}>Carbon Credit Tracer</span>
        </div>
        <div className={styles.navActions}>
          <button className={styles.navLogin}  onClick={() => navigate('/login')}>Login</button>
          <button className={styles.navSignup} onClick={() => navigate('/register')}>Get Started →</button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          {particles.map(p => (
            <div key={p.id} className={styles.particle} style={{
              left: p.left,
              animationDelay: p.animationDelay,
              animationDuration: p.animationDuration,
            }} />
          ))}
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>🌿 AI + Blockchain | Carbon Credit System</div>
          <h1 className={styles.heroTitle}>
            Verify. Certify.<br />
            <span className={styles.heroGreen}>Trade Carbon Credits.</span>
          </h1>
          <p className={styles.heroSub}>
            An AI-powered platform that automatically verifies industrial emission reports
            against IPCC baselines, issues Carbon Credit Tokens on Polygon, and enables
            peer-to-peer trading between companies.
          </p>
          <div className={styles.heroCtas}>
            <button className={styles.ctaPrimary} onClick={() => navigate('/register')}>
              Register Your Company →
            </button>
            <button className={styles.ctaSecondary} onClick={() => navigate('/login')}>
              Login to Portal
            </button>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.hStat}><span className={styles.hNum}>8</span><span className={styles.hLabel}>Materials</span></div>
            <div className={styles.hDivider} />
            <div className={styles.hStat}><span className={styles.hNum}>AI</span><span className={styles.hLabel}>Fraud Detection</span></div>
            <div className={styles.hDivider} />
            <div className={styles.hStat}><span className={styles.hNum}>ERC-1155</span><span className={styles.hLabel}>Polygon Tokens</span></div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────── */}
      <section className={styles.howSection} id="how">
        <div className={styles.sectionLabel}>HOW IT WORKS</div>
        <h2 className={styles.sectionTitle}>Four steps from report to credit</h2>
        <div className={styles.stepsGrid}>
          {STEPS.map((s, i) => (
            <div key={i} className={styles.stepCard}>
              <div className={styles.stepNum}>{s.num}</div>
              <div className={styles.stepTitle}>{s.title}</div>
              <div className={styles.stepDesc}>{s.desc}</div>
              {i < STEPS.length - 1 && <div className={styles.stepArrow}>→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionLabel}>PLATFORM FEATURES</div>
        <h2 className={styles.sectionTitle}>Everything your company needs</h2>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <div key={i} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <div className={styles.featureTitle}>{f.title}</div>
              <div className={styles.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Materials ───────────────────────────────────── */}
      <section className={styles.materialsSection}>
        <div className={styles.sectionLabel}>SUPPORTED MATERIALS</div>
        <h2 className={styles.sectionTitle}>8 industrial materials with IPCC baselines</h2>
        <div className={styles.materialsGrid}>
          {MATERIALS.map((m) => (
            <div key={m.name} className={styles.materialCard}>
              <div className={styles.materialDot} style={{ background: m.color }} />
              <div className={styles.materialName}>{m.name}</div>
              <div className={styles.materialFactor} style={{ color: m.color }}>
                {m.factor} <span className={styles.materialUnit}>t CO₂/t</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────── */}
      <section className={styles.ctaBanner}>
        <h2 className={styles.ctaBannerTitle}>Ready to earn Carbon Credits?</h2>
        <p className={styles.ctaBannerSub}>
          Register your company today. Get AI-verified and start trading CCT tokens on Polygon.
        </p>
        <button className={styles.ctaPrimary} onClick={() => navigate('/register')}>
          Register Your Company →
        </button>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <span className={styles.navLogoMark}>CCT</span>
          <span>Carbon Credit Tracer v2.0</span>
        </div>
        <div className={styles.footerRight}>
          <span className={styles.footerBadge}>🔗 Polygon Testnet</span>
          <span className={styles.footerBadge}>🤖 Isolation Forest AI</span>
          <span className={styles.footerBadge}>📋 IPCC 2006</span>
        </div>
      </footer>
    </div>
  )
}
