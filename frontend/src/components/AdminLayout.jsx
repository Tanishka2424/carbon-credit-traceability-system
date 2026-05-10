import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { logout, getUser } from '../utils/auth'
import styles from './AdminLayout.module.css'

const NAV = [
  { to: '/admin',              label: 'Overview',     icon: '▦', end: true },
  { to: '/admin/companies',    label: 'Companies',    icon: '🏢' },
  { to: '/admin/submissions',  label: 'All Reports',  icon: '≡' },
]

export default function AdminLayout() {
  const user = getUser()
  const navigate = useNavigate()

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>CCT</span>
          <div>
            <div className={styles.logoName}>Admin Portal</div>
            <div className={styles.logoBadge}>🔐 Admin Access</div>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminInfo}>
            <div className={styles.adminEmail}>{user?.email}</div>
            <div className={styles.adminRole}>Administrator</div>
          </div>
          <button className={styles.logoutBtn} onClick={() => logout()}>
            ⎋ Logout
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
