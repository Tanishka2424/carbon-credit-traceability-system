import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isLoggedIn, isAdmin } from './utils/auth'

import Layout       from './components/Layout'
import AdminLayout  from './components/AdminLayout'
import { ProtectedRoute, AdminRoute, PublicRoute } from './components/ProtectedRoute'

import LandingPage            from './pages/LandingPage'
import LoginPage              from './pages/LoginPage'
import RegisterPage           from './pages/RegisterPage'
import DashboardPage          from './pages/DashboardPage'
import SubmitPage             from './pages/SubmitPage'
import SubmissionsPage        from './pages/SubmissionsPage'
import SubmissionDetailPage   from './pages/SubmissionDetailPage'
import MarketplacePage        from './pages/MarketplacePage'
import AdminDashboardPage     from './pages/admin/AdminDashboardPage'
import AdminCompaniesPage     from './pages/admin/AdminCompaniesPage'
import AdminSubmissionsPage   from './pages/admin/AdminSubmissionsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Company portal */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="dashboard"           element={<DashboardPage />} />
          <Route path="submit"              element={<SubmitPage />} />
          <Route path="submissions"         element={<SubmissionsPage />} />
          <Route path="submissions/:id"     element={<SubmissionDetailPage />} />
          <Route path="marketplace"         element={<MarketplacePage />} />
        </Route>

        {/* Admin portal */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index                      element={<AdminDashboardPage />} />
          <Route path="companies"           element={<AdminCompaniesPage />} />
          <Route path="submissions"         element={<AdminSubmissionsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
