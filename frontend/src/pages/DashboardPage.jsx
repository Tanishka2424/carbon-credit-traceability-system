import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getDashboardStats, getRecentSubmissions, getCreditsByMaterial } from '../utils/api'
import { getUser } from '../utils/auth'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import styles from './DashboardPage.module.css'

const fmt     = (n) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(n)
const fmtDate = (d) => new Date(d).toLocaleDateString('en', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })

export default function DashboardPage() {
  const navigate    = useNavigate()
  const user        = getUser()
  const [stats, setStats]         = useState(null)
  const [recent, setRecent]       = useState([])
  const [byMaterial, setByMaterial] = useState([])
  const [loading, setLoading]     = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      getDashboardStats(),
      getRecentSubmissions(8),
      getCreditsByMaterial(),
    ]).then(([s, r, m]) => {
      setStats(s)
      setRecent(r)
      setByMaterial(m)
      setLastUpdated(new Date())
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadData])

  const COLORS = { cement:'#f0a500', steel:'#4a9fd4', aluminum:'#4ac864', coal:'#94a3b8', natural_gas:'#a78bfa', paper:'#34d399', glass:'#60a5fa', plastics:'#f472b6' }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Welcome back, <span className={styles.companyName}>{user?.company_name}</span>
          </h1>
          <p className={styles.sub}>
            {user?.company_id} · Carbon credit verification &amp; issuance tracker
            {lastUpdated && <span className={styles.lastUpdated}> · Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.autoRefreshToggle}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto-refresh
          </label>
          <button className={styles.refreshBtn} onClick={loadData} disabled={loading}>↻</button>
          <button className={styles.ctaBtn} onClick={() => navigate('/submit')}>+ Submit Report</button>
        </div>
      </div>

      {/* Stats row */}
      <div className={styles.statsGrid}>
        <StatCard label="Total Submissions"  value={loading ? '—' : fmt(stats?.total_submissions)}              loading={loading} accent="white" />
        <StatCard label="CCT Credits Issued" value={loading ? '—' : fmt(stats?.total_credits_issued)} sub="1 CCT = 1 tonne CO₂ saved" loading={loading} accent="green" />
        <StatCard label="CO₂ Saved"          value={loading ? '—' : `${fmt(stats?.total_co2_saved_tonnes)}t`}  loading={loading} accent="green" />
        <StatCard label="Approval Rate"      value={loading ? '—' : `${stats?.approval_rate}%`}                loading={loading} accent="amber" />
        <StatCard label="Rejected"           value={loading ? '—' : fmt(stats?.rejected_count)} sub="Flagged by AI model" loading={loading} accent="red" />
      </div>

      <div className={styles.middle}>
        {/* Chart */}
        <div className={styles.chartCard}>
          <div className={styles.cardTitle}>Credits by material</div>
          {byMaterial.length === 0 ? (
            <div className={styles.empty}>No data yet — submit reports to see chart</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byMaterial} barSize={40}>
                <XAxis dataKey="material" tick={{ fill:'#8fa892', fontSize:12, fontFamily:'DM Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#5a6e5c', fontSize:11, fontFamily:'DM Mono' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background:'#1a2318', border:'1px solid rgba(74,200,100,0.2)', borderRadius:8, fontFamily:'DM Mono', fontSize:12 }}
                  labelStyle={{ color:'#e8f0e9' }} itemStyle={{ color:'#4ac864' }}
                />
                <Bar dataKey="total_credits" radius={[4,4,0,0]}>
                  {byMaterial.map(entry => (
                    <Cell key={entry.material} fill={COLORS[entry.material] || '#4ac864'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Verification breakdown */}
        <div className={styles.breakdownCard}>
          <div className={styles.cardTitle}>Verification breakdown</div>
          {stats && (
            <div className={styles.breakdown}>
              <div className={styles.breakRow}>
                <span className={styles.breakLabel}>Approved</span>
                <div className={styles.breakBar}>
                  <div className={styles.barFill} style={{ width: stats.total_submissions ? `${(stats.approved_count/stats.total_submissions)*100}%` : '0%', background:'var(--green)' }} />
                </div>
                <span className={`${styles.breakVal} ${styles.greenVal}`}>{stats.approved_count}</span>
              </div>
              <div className={styles.breakRow}>
                <span className={styles.breakLabel}>Rejected</span>
                <div className={styles.breakBar}>
                  <div className={styles.barFill} style={{ width: stats.total_submissions ? `${(stats.rejected_count/stats.total_submissions)*100}%` : '0%', background:'var(--red)' }} />
                </div>
                <span className={`${styles.breakVal} ${styles.redVal}`}>{stats.rejected_count}</span>
              </div>
            </div>
          )}
          <div className={styles.baselineNote}>
            <div className={styles.noteTitle}>Your top material</div>
            <div className={styles.noteRow}>
              <span>Most submitted</span>
              <span className="mono">{stats?.top_material || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent submissions table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <span className={styles.cardTitle}>Recent submissions</span>
          <button className={styles.viewAll} onClick={() => navigate('/submissions')}>View all →</button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Company</th><th>Material</th><th>Reported CO₂</th>
              <th>Baseline CO₂</th><th>Credits</th><th>AI</th><th>Status</th><th>Time</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={8} className={styles.emptyRow}>No submissions yet — <button className={styles.submitLink} onClick={() => navigate('/submit')}>submit your first report</button></td></tr>
            )}
            {recent.map(r => (
              <tr key={r.submission_id} onClick={() => navigate(`/submissions/${r.submission_id}`)} className={styles.clickRow}>
                <td className={styles.company}>{r.company_name}</td>
                <td><span className={styles.material}>{r.material}</span></td>
                <td className="mono">{fmt(r.reported_co2_tonnes)}t</td>
                <td className="mono">{fmt(r.baseline_co2_tonnes)}t</td>
                <td className={`mono ${styles.credits}`}>{r.credits_earned > 0 ? `+${fmt(r.credits_earned)}` : '0'}</td>
                <td><StatusBadge status={r.ai_verdict} /></td>
                <td><StatusBadge status={r.final_status} /></td>
                <td className={styles.time}>{fmtDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
