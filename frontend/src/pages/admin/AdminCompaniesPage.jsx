import React, { useEffect, useState, useCallback } from 'react'
import { getAdminCompanies, deactivateCompany } from '../../utils/api'
import styles from './AdminCompaniesPage.module.css'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const [confirm, setConfirm]     = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    getAdminCompanies({ search: search || undefined })
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const handleDeactivate = async (companyId) => {
    try {
      await deactivateCompany(companyId)
      setConfirm(null)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Registered Companies</h1>
          <p className={styles.sub}>{companies.length} companies found</p>
        </div>
        <input
          className={styles.search}
          placeholder="Search by name, ID or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Company</th><th>ID</th><th>Email</th><th>Industry</th>
              <th>Verified</th><th>Submissions</th><th>Credits</th>
              <th>Joined</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className={styles.loading}>Loading...</td></tr>}
            {!loading && companies.length === 0 && (
              <tr><td colSpan={9} className={styles.empty}>No companies found</td></tr>
            )}
            {!loading && companies.map(c => (
              <tr
                key={c.user_id}
                className={`${styles.row} ${selected?.user_id === c.user_id ? styles.selectedRow : ''}`}
                onClick={() => setSelected(s => s?.user_id === c.user_id ? null : c)}
              >
                <td className={styles.companyName}>{c.company_name}</td>
                <td className={`mono ${styles.companyId}`}>{c.company_id}</td>
                <td className={styles.email}>{c.email}</td>
                <td className={styles.industry}>{c.industry || '—'}</td>
                <td>
                  <span className={c.is_verified ? styles.verifiedBadge : styles.pendingBadge}>
                    {c.is_verified ? '✓ Verified' : '⏳ Pending'}
                  </span>
                </td>
                <td className="mono">{c.total_submissions ?? 0}</td>
                <td className={`mono ${styles.credits}`}>{c.total_credits_earned ?? 0}</td>
                <td className={styles.date}>{fmtDate(c.created_at)}</td>
                <td onClick={e => e.stopPropagation()}>
                  <button
                    className={styles.deactivateBtn}
                    onClick={() => setConfirm(c)}
                    title="Deactivate company"
                  >✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded company detail */}
      {selected && (
        <div className={styles.detailCard}>
          <div className={styles.detailHeader}>
            <div>
              <div className={styles.detailName}>{selected.company_name}</div>
              <div className={styles.detailMeta}>{selected.email} · {selected.company_id}</div>
            </div>
            <button className={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
          </div>
          <div className={styles.detailGrid}>
            <div className={styles.dItem}><span className={styles.dLabel}>Industry</span><span>{selected.industry || '—'}</span></div>
            <div className={styles.dItem}><span className={styles.dLabel}>Phone</span><span>{selected.contact_phone || '—'}</span></div>
            <div className={styles.dItem}><span className={styles.dLabel}>Role</span><span>{selected.role}</span></div>
            <div className={styles.dItem}><span className={styles.dLabel}>Submissions</span><span className="mono">{selected.total_submissions}</span></div>
            <div className={styles.dItem}><span className={styles.dLabel}>Approved</span><span className="mono">{selected.approved_submissions}</span></div>
            <div className={styles.dItem}><span className={styles.dLabel}>Total CCT</span><span className={`mono ${styles.credits}`}>{selected.total_credits_earned}</span></div>
          </div>
        </div>
      )}

      {/* Confirm deactivate modal */}
      {confirm && (
        <div className={styles.modalBack} onClick={() => setConfirm(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Deactivate Company?</div>
            <p className={styles.modalMsg}>
              This will deactivate <strong>{confirm.company_name}</strong> ({confirm.company_id}).
              They will not be able to login.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirm(null)}>Cancel</button>
              <button className={styles.confirmBtn} onClick={() => handleDeactivate(confirm.company_id)}>Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
