import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminStats, getAdminSubmissions } from '../../utils/api'
import styles from './AdminDashboardPage.module.css'

const fmt = (n) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(n ?? 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats]   = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      getAdminStats(),
      getAdminSubmissions({ limit: 10, page: 1 }),
    ]).then(([s, r]) => {
      setStats(s)
      setRecent(r.items || [])
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const statCards = stats ? [
    { label: 'Total Companies',    value: stats.total_companies,     sub: `${stats.verified_companies} verified`, color: '#6366f1' },
    { label: 'Total Submissions',  value: stats.total_submissions,   sub: null,                                   color: '#a5b4fc' },
    { label: 'CCT Credits Issued', value: fmt(stats.total_credits_issued), sub: '1 CCT = 1t CO₂', color: '#4ac864' },
    { label: 'Approval Rate',      value: `${stats.approval_rate}%`, sub: `${stats.approved_count} approved`,   color: '#f0a500' },
    { label: 'Rejected',           value: stats.rejected_count,      sub: 'AI flagged',                          color: '#f87171' },
  ] : []

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Overview</h1>
          <p className={styles.sub}>Platform-wide statistics and activity</p>
        </div>
        <button className={styles.refreshBtn} onClick={load} disabled={loading}>↻ Refresh</button>
      </div>

      <div className={styles.statsGrid}>
        {loading
          ? Array(5).fill(0).map((_, i) => <div key={i} className={styles.skeletonCard} />)
          : statCards.map(c => (
            <div key={c.label} className={styles.statCard} style={{ '--accent': c.color }}>
              <div className={styles.statLabel}>{c.label}</div>
              <div className={styles.statValue}>{c.value}</div>
              {c.sub && <div className={styles.statSub}>{c.sub}</div>}
            </div>
          ))
        }
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <span className={styles.cardTitle}>Recent Submissions (All Companies)</span>
          <button className={styles.viewAll} onClick={() => navigate('/admin/submissions')}>View all →</button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Company</th><th>Material</th><th>Reported CO₂</th>
              <th>Baseline CO₂</th><th>Credits</th><th>AI</th><th>Status</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            {!loading && recent.length === 0 && (
              <tr><td colSpan={8} className={styles.empty}>No submissions yet</td></tr>
            )}
            {recent.map(r => (
              <tr
                key={r.submission_id}
                onClick={() => navigate(`/submissions/${r.submission_id}`)}
                className={styles.clickRow}
                title="View submission detail"
              >
                <td className={styles.company}>{r.company_name}</td>
                <td><span className={styles.mat}>{r.material}</span></td>
                <td className="mono">{fmt(r.reported_co2_tonnes)}t</td>
                <td className="mono">{fmt(r.baseline_co2_tonnes)}t</td>
                <td className={`mono ${styles.credits}`}>{r.credits_earned > 0 ? `+${fmt(r.credits_earned)}` : '0'}</td>
                <td><span className={`${styles.badge} ${r.ai_verdict === 'SUSPICIOUS' ? styles.badgeSusp : styles.badgeNorm}`}>{r.ai_verdict}</span></td>
                <td><span className={`${styles.badge} ${r.final_status === 'APPROVED' ? styles.badgeApproved : styles.badgeRejected}`}>{r.final_status}</span></td>
                <td className={styles.date}>{fmtDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
