import React, { useEffect, useState, useCallback } from 'react'
import { getAdminSubmissions, sendCorrectionEmail } from '../../utils/api'
import styles from './AdminSubmissionsPage.module.css'

const fmt     = (n) => new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(n ?? 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

export default function AdminSubmissionsPage() {
  const [items, setItems]       = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [statusF, setStatusF]   = useState('')
  const [materialF, setMaterialF] = useState('')
  const [emailModal, setEmailModal] = useState(null)   // submission object
  const [customMsg, setCustomMsg]   = useState('')
  const [sending, setSending]       = useState(false)
  const [toast, setToast]           = useState('')
  const PER_PAGE = 20

  const load = useCallback(() => {
    setLoading(true)
    getAdminSubmissions({ page, limit: PER_PAGE, status: statusF || undefined, material: materialF || undefined })
      .then(res => { setItems(res.items || []); setTotal(res.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, statusF, materialF])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [statusF, materialF])

  const handleSendEmail = async () => {
    setSending(true)
    try {
      await sendCorrectionEmail(emailModal.submission_id, { custom_message: customMsg })
      setToast('✓ Correction email sent!')
      setEmailModal(null)
      setCustomMsg('')
      load()
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      setToast(`✕ ${err.message}`)
      setTimeout(() => setToast(''), 4000)
    } finally {
      setSending(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className={styles.page}>
      {toast && <div className={`${styles.toast} ${toast.startsWith('✓') ? styles.toastOk : styles.toastErr}`}>{toast}</div>}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>All Submissions</h1>
          <p className={styles.sub}>{total} total records</p>
        </div>
        <div className={styles.filters}>
          <select className={styles.filterSelect} value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select className={styles.filterSelect} value={materialF} onChange={e => setMaterialF(e.target.value)}>
            <option value="">All materials</option>
            {['cement','steel','aluminum','coal','natural_gas','paper','glass','plastics'].map(m =>
              <option key={m} value={m}>{m}</option>
            )}
          </select>
        </div>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Company</th><th>Period</th><th>Material</th><th>Reported CO₂</th>
              <th>Baseline</th><th>Credits</th><th>AI</th><th>Status</th><th>Date</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} className={styles.loading}>Loading...</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td colSpan={10} className={styles.empty}>No submissions found</td></tr>
            )}
            {!loading && items.map(r => (
              <tr key={r.submission_id} className={styles.row}>
                <td className={styles.company}>{r.company_name}<div className={styles.companyId}>{r.company_id}</div></td>
                <td className={`mono ${styles.period}`}>{r.period || '—'}</td>
                <td><span className={styles.mat}>{r.material}</span></td>
                <td className="mono">{fmt(r.reported_co2_tonnes)}t</td>
                <td className="mono">{fmt(r.baseline_co2_tonnes)}t</td>
                <td className={`mono ${styles.credits}`}>{r.credits_earned > 0 ? `+${fmt(r.credits_earned)}` : '0'}</td>
                <td><span className={`${styles.badge} ${r.ai_verdict === 'SUSPICIOUS' ? styles.susp : styles.norm}`}>{r.ai_verdict}</span></td>
                <td><span className={`${styles.badge} ${r.final_status === 'APPROVED' ? styles.approved : styles.rejected}`}>{r.final_status}</span></td>
                <td className={styles.date}>{fmtDate(r.created_at)}</td>
                <td>
                  {r.final_status === 'REJECTED' && (
                    <button
                      className={`${styles.emailBtn} ${r.correction_email_sent ? styles.emailSent : ''}`}
                      onClick={() => { setEmailModal(r); setCustomMsg('') }}
                      title={r.correction_email_sent ? 'Email already sent' : 'Send correction email'}
                    >
                      {r.correction_email_sent ? '✓ Sent' : '✉ Email'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>← Prev</button>
        <span className={styles.pageInfo}>Page {page} of {totalPages} · {total} records</span>
        <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>Next →</button>
      </div>

      {/* Correction email modal */}
      {emailModal && (
        <div className={styles.modalBack} onClick={() => setEmailModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>✉ Send Correction Email</div>
            <div className={styles.modalMeta}>
              <span className={styles.metaLabel}>Company:</span> {emailModal.company_name}<br />
              <span className={styles.metaLabel}>Submission:</span> <span className="mono">{emailModal.submission_id?.slice(0,16)}...</span><br />
              <span className={styles.metaLabel}>AI Score:</span> <span className="mono">{emailModal.anomaly_score}</span>
            </div>
            <label className={styles.modalLabel}>Custom message (optional)</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={customMsg}
              onChange={e => setCustomMsg(e.target.value)}
              placeholder="Leave blank to use our default AI-generated suggestion..."
            />
            <p className={styles.modalHint}>
              If blank, a default message with the anomaly score and correction suggestions will be sent.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setEmailModal(null)}>Cancel</button>
              <button className={styles.sendBtn} onClick={handleSendEmail} disabled={sending}>
                {sending ? 'Sending...' : '✉ Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
