import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitEmission, getBaselineFactors } from '../utils/api'
import { getUser } from '../utils/auth'
import StatusBadge from '../components/StatusBadge'
import styles from './SubmitPage.module.css'

const fmt = (n) => new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(n)

const INITIAL = {
  material: 'cement',
  quantity_tonnes: '',
  reported_co2_tonnes: '',
  period: '',
}

export default function SubmitPage() {
  const navigate = useNavigate()
  const user     = getUser()

  const [form, setForm]       = useState(INITIAL)
  const [factors, setFactors] = useState({ cement: 0.90, steel: 1.80, aluminum: 11.50 })
  const [materials, setMaterials] = useState([])
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Fetch emission factors dynamically from API (fixes B5)
  useEffect(() => {
    getBaselineFactors()
      .then(data => {
        const f = {}
        const mats = []
        Object.entries(data).forEach(([mat, info]) => {
          f[mat] = info.factor
          mats.push({ value: mat, label: `${mat.replace('_', ' ')} — ${info.factor} t CO₂/t`, factor: info.factor })
        })
        setFactors(f)
        setMaterials(mats)
        if (mats.length > 0 && !f[form.material]) {
          setForm(prev => ({ ...prev, material: mats[0].value }))
        }
      })
      .catch(() => {
        // Fallback to defaults if API unavailable
        setMaterials([
          { value: 'cement',   label: 'Cement — 0.90 t CO₂/t',   factor: 0.90 },
          { value: 'steel',    label: 'Steel — 1.80 t CO₂/t',    factor: 1.80 },
          { value: 'aluminum', label: 'Aluminum — 11.50 t CO₂/t', factor: 11.50 },
        ])
      })
  }, [])

  const baseline     = form.quantity_tonnes && form.material ? parseFloat(form.quantity_tonnes) * (factors[form.material] || 0) : null
  const creditPreview = baseline && form.reported_co2_tonnes ? Math.max(0, baseline - parseFloat(form.reported_co2_tonnes)) : null

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const payload = {
        ...form,
        company_name: user?.company_name,
        company_id:   user?.company_id,
        quantity_tonnes:       parseFloat(form.quantity_tonnes),
        reported_co2_tonnes:   parseFloat(form.reported_co2_tonnes),
      }
      const res = await submitEmission(payload)
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return <ResultView result={result} onNew={() => { setResult(null); setForm(INITIAL) }} onDetail={() => navigate(`/submissions/${result.submission_id}`)} />
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Submit Emission Report</h1>
        <p className={styles.sub}>Verified against IPCC baseline + AI anomaly detection · <strong>{user?.company_name}</strong></p>
      </div>

      <div className={styles.layout}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Emission data</div>
            <div className={styles.field}>
              <label className={styles.label}>Material type</label>
              <select className={styles.select} value={form.material} onChange={set('material')}>
                {materials.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Quantity produced (tonnes)</label>
                <input className={styles.input} type="number" min="0.01" step="0.01" value={form.quantity_tonnes} onChange={set('quantity_tonnes')} placeholder="1000" required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Reported CO₂ (tonnes)</label>
                <input className={styles.input} type="number" min="0.01" step="0.01" value={form.reported_co2_tonnes} onChange={set('reported_co2_tonnes')} placeholder="700" required />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Reporting period</label>
              <input className={styles.input} value={form.period} onChange={set('period')} placeholder="2024-Q2" required />
              <span className={styles.hint}>Format: YYYY-Q1 to YYYY-Q4</span>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Verifying...' : 'Submit & Verify'}
          </button>
        </form>

        {/* Live preview */}
        <div className={styles.preview}>
          <div className={styles.previewTitle}>Live preview</div>
          <div className={styles.previewRow}><span>Material factor</span><span className="mono">{factors[form.material] || '—'} t CO₂/t</span></div>
          <div className={styles.previewRow}><span>Expected baseline</span><span className="mono">{baseline ? `${fmt(baseline)} t` : '—'}</span></div>
          <div className={styles.previewRow}><span>Reported CO₂</span><span className="mono">{form.reported_co2_tonnes ? `${fmt(form.reported_co2_tonnes)} t` : '—'}</span></div>
          <div className={styles.divider} />
          <div className={styles.previewRow}>
            <span>Estimated credits</span>
            <span className={`mono ${creditPreview > 0 ? styles.creditPos : styles.creditZero}`}>
              {creditPreview !== null ? (creditPreview > 0 ? `+${fmt(creditPreview)} CCT` : '0 CCT') : '—'}
            </span>
          </div>
          {creditPreview !== null && creditPreview <= 0 && baseline && (
            <div className={styles.previewWarning}>Reported CO₂ meets or exceeds baseline — no credits will be issued</div>
          )}
          {creditPreview > 0 && (
            <div className={styles.previewSuccess}>Looks good! Pending AI verification</div>
          )}
          <div className={styles.divider} />
          <div className={styles.previewInfo}>
            <div className={styles.infoTitle}>How it works</div>
            <div className={styles.infoStep}><span className={styles.stepNum}>1</span> Baseline = quantity × IPCC factor</div>
            <div className={styles.infoStep}><span className={styles.stepNum}>2</span> AI checks for anomalies</div>
            <div className={styles.infoStep}><span className={styles.stepNum}>3</span> Credits = baseline − reported</div>
            <div className={styles.infoStep}><span className={styles.stepNum}>4</span> CCT tokens issued on Polygon</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultView({ result, onNew, onDetail }) {
  const approved = result.final_status === 'APPROVED'
  return (
    <div className={styles.page}>
      <div className={`${styles.resultCard} ${approved ? styles.resultApproved : styles.resultRejected}`}>
        <div className={styles.resultIcon}>{approved ? '✓' : '✗'}</div>
        <h2 className={styles.resultTitle}>{approved ? 'Verified & Approved' : 'Verification Failed'}</h2>
        <p className={styles.resultSub}>{result.credits.reason}</p>
        <div className={styles.resultGrid}>
          <div className={styles.resultItem}><div className={styles.rLabel}>Baseline CO₂</div><div className={styles.rVal}>{fmt(result.baseline.baseline_co2_tonnes)} t</div></div>
          <div className={styles.resultItem}><div className={styles.rLabel}>Reported CO₂</div><div className={styles.rVal}>{fmt(result.reported_co2_tonnes)} t</div></div>
          <div className={styles.resultItem}><div className={styles.rLabel}>AI verdict</div><div className={styles.rVal}><StatusBadge status={result.ai_verification.verdict} /></div></div>
          <div className={styles.resultItem}>
            <div className={styles.rLabel}>Credits earned</div>
            <div className={`${styles.rVal} ${approved ? styles.creditBig : ''}`}>{approved ? `${fmt(result.credits.credits_earned)} CCT` : '0 CCT'}</div>
          </div>
        </div>
        <div className={styles.resultActions}>
          <button className={styles.detailBtn} onClick={onDetail}>View full report →</button>
          <button className={styles.newBtn} onClick={onNew}>Submit another</button>
        </div>
      </div>
    </div>
  )
}
