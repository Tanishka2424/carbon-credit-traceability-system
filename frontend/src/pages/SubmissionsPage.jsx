import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSubmissions } from '../utils/api'
import StatusBadge from '../components/StatusBadge'
import styles from './SubmissionsPage.module.css'

const fmt     = (n) => new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(n)
const fmtDate = (d) => new Date(d).toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })
const PER_PAGE = 20

export default function SubmissionsPage() {
  const navigate = useNavigate()
  const [rows, setRows]           = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)
  const [statusFilter, setStatusFilter]     = useState('')
  const [materialFilter, setMaterialFilter] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = { page, limit: PER_PAGE }
    if (statusFilter)   params.status   = statusFilter
    if (materialFilter) params.material = materialFilter
    getSubmissions(params)
      .then(data => {
        // API returns array or paginated object
        if (Array.isArray(data)) {
          setRows(data)
          setTotal(data.length)
        } else {
          setRows(data.items || data)
          setTotal(data.total || (data.items || data).length)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, statusFilter, materialFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [statusFilter, materialFilter])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Submissions</h1>
          <p className={styles.sub}>Your company's full emission report audit trail</p>
        </div>
        <button className={styles.ctaBtn} onClick={() => navigate('/submit')}>+ New Report</button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select className={styles.filterSelect} value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}>
          <option value="">All materials</option>
          {['cement','steel','aluminum','coal','natural_gas','paper','glass','plastics'].map(m =>
            <option key={m} value={m}>{m.replace('_', ' ')}</option>
          )}
        </select>
        <span className={styles.count}>{total} records</span>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Period</th><th>Material</th><th>Qty (t)</th>
              <th>Reported CO₂</th><th>Baseline CO₂</th><th>CO₂ Saved</th>
              <th>Credits (CCT)</th><th>AI</th><th>Status</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} className={styles.loading}>Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={10} className={styles.empty}>No submissions found</td></tr>}
            {!loading && rows.map(r => {
              const saved = r.baseline_co2_tonnes - r.reported_co2_tonnes
              return (
                <tr key={r.submission_id} onClick={() => navigate(`/submissions/${r.submission_id}`)} className={styles.row}>
                  <td className={`mono ${styles.period}`}>{r.period || '—'}</td>
                  <td><span className={styles.mat}>{r.material}</span></td>
                  <td className="mono">{fmt(r.quantity_tonnes)}</td>
                  <td className="mono">{fmt(r.reported_co2_tonnes)}t</td>
                  <td className="mono">{fmt(r.baseline_co2_tonnes)}t</td>
                  <td className={`mono ${saved > 0 ? styles.savedPos : styles.savedNeg}`}>
                    {saved > 0 ? `+${fmt(saved)}t` : `${fmt(saved)}t`}
                  </td>
                  <td className={`mono ${styles.credits}`}>{r.credits_earned > 0 ? `+${fmt(r.credits_earned)}` : '0'}</td>
                  <td><StatusBadge status={r.ai_verdict} /></td>
                  <td><StatusBadge status={r.final_status} /></td>
                  <td className={styles.date}>{fmtDate(r.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>← Prev</button>
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>Next →</button>
        </div>
      )}
    </div>
  )
}
